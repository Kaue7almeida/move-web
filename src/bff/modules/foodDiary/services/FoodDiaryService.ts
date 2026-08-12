import type { Json } from "@/bff/core/supabase/database.types";
import { ApiError } from "@/bff/core/errors/ApiError";
import { validateAndNormalizeAnalysis } from "@/bff/modules/foodDiary/analysisValidation";
import {
  buildLocalDayStrings,
  isValidDateString,
  localDayOf,
  localDayWindow,
  resolveTimeZone,
} from "@/bff/modules/foodDiary/diaryDay";
import {
  asGoal,
  asRoutineLevel,
  asTmbSource,
  classifyConsumption,
  computeEnergyPlan,
  estimateTmbFromLeanMass,
  GOAL_LABELS,
  kcalOverBandTop,
  kcalToBandTop,
  missionLabelFor,
  ROUTINE_LEVEL_LABELS,
  statusLabelFor,
} from "@/bff/modules/foodDiary/planEnergy";
import { resolvePlanInputs, selectPlanVersionForDay } from "@/bff/modules/foodDiary/planBuild";
import type {
  FoodDiaryHud,
  FoodDiaryPlanRecord,
  FoodDiaryPlanResponse,
  FoodDiaryPlanView,
  LatestScanTmb,
  PlanTmbSnapshot,
  TmbSuggestion,
  UpsertPlanInput,
} from "@/bff/modules/foodDiary/types/plan";
import type { OpenAiFoodDiaryClient } from "@/bff/modules/foodDiary/infra/OpenAiFoodDiaryClient";
import type { FoodDiaryAiResponse } from "@/bff/modules/foodDiary/types/ai";
import type { CurrentUserIdentity } from "@/bff/modules/profile/types";
import type {
  CreateItemDbInput,
  IFoodDiaryRepository,
} from "@/bff/modules/foodDiary/types/IFoodDiaryRepository";
import type {
  ActivityEnergyEntryRecord,
  ActivityEnergyResponse,
  ActivityEnergyView,
  AnalyzeEntryInput,
  CalorieTargetResponse,
  CalorieTargetView,
  CreateActivityInput,
  CreateEntryDraftInput,
  DailyCalorieTargetRecord,
  DayQueryOptions,
  FoodDiaryDeleteResponse,
  FoodDiaryEntryRecord,
  FoodDiaryEntryResponse,
  FoodDiaryEntryView,
  FoodDiaryHistoryDay,
  FoodDiaryHistoryResponse,
  FoodDiaryItemRecord,
  FoodDiaryItemView,
  FoodDiaryPhotoResponse,
  FoodDiaryStatus,
  FoodDiaryTodayResponse,
  ReviewEntryInput,
  UpsertCalorieTargetInput,
} from "@/bff/modules/foodDiary/types";

const HISTORY_DAYS = 7;
const DEFAULT_PROTEIN_PERCENT = 25;
const DEFAULT_CARB_PERCENT = 45;
const DEFAULT_FAT_PERCENT = 30;
const SIGNED_URL_TTL_SECONDS = 300;
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
const UPLOADABLE_STATUSES: readonly FoodDiaryStatus[] = ["draft", "rejected", "failed"];

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type FoodDiaryServiceDeps = {
  /** Lazy so non-AI endpoints don't require OPENAI_API_KEY at construction. */
  aiClientFactory: () => OpenAiFoodDiaryClient;
  /** Max concluded analyses per student per local day (P1: 6, env-configurable). */
  dailyAnalysisLimit: number;
};

export class FoodDiaryService {
  constructor(
    private readonly foodDiaryRepository: IFoodDiaryRepository,
    private readonly deps: FoodDiaryServiceDeps,
  ) {}

  /* ─── Today ─── */

  async getToday(
    identity: CurrentUserIdentity,
    options: DayQueryOptions,
  ): Promise<FoodDiaryTodayResponse> {
    const timeZone = resolveTimeZone(options.timeZone);
    const day = resolveLocalDay(options.date, timeZone);
    const { startIso, endIso } = localDayWindow(day, timeZone);

    const [targetRecord, planRecord, entries, activities] = await Promise.all([
      this.foodDiaryRepository.findCurrentTargetForDate(identity.userId, day),
      this.foodDiaryRepository.findActivePlan(identity.userId),
      this.foodDiaryRepository.listConfirmedEntriesInRange(identity.userId, startIso, endIso),
      this.foodDiaryRepository.listActivitiesInRange(identity.userId, startIso, endIso),
    ]);

    const items = await this.foodDiaryRepository.listItemsByEntryIds(entries.map((e) => e.id));
    const itemsByEntry = groupItemsByEntry(items);

    const meals = entries.map((entry) =>
      mapEntryToView(entry, itemsByEntry.get(entry.id) ?? []),
    );
    const activityViews = activities.map(mapActivityToView);

    const consumed = sumConfirmedTotals(entries);
    const burnedKcal = roundKcal(
      activityViews.reduce((sum, activity) => sum + activity.kcalBurned, 0),
    );
    const target = targetRecord ? mapTargetToView(targetRecord) : null;
    const remainingKcal = target
      ? roundKcal(target.targetKcal + burnedKcal - consumed.kcal)
      : null;

    const plan = planRecord ? mapPlanToView(planRecord) : null;
    const hud = planRecord ? buildHud(planRecord, consumed.kcal, burnedKcal) : null;

    return {
      date: day,
      target,
      plan,
      hud,
      meals,
      activities: activityViews,
      totals: {
        consumedKcal: consumed.kcal,
        consumedProteinG: consumed.proteinG,
        consumedCarbG: consumed.carbG,
        consumedFatG: consumed.fatG,
        consumedFiberG: consumed.fiberG,
        burnedKcal,
        remainingKcal,
      },
    };
  }

  /* ─── Energy plan (Diário 2.0) ─── */

  async getPlan(identity: CurrentUserIdentity): Promise<FoodDiaryPlanResponse> {
    const [planRecord, latestScan] = await Promise.all([
      this.foodDiaryRepository.findActivePlan(identity.userId),
      this.foodDiaryRepository.findLatestScanTmbForUser(identity.userId),
    ]);

    return {
      plan: planRecord ? mapPlanToView(planRecord) : null,
      tmbSuggestion: buildTmbSuggestion(latestScan, planRecord),
    };
  }

  async upsertPlan(
    identity: CurrentUserIdentity,
    input: UpsertPlanInput,
  ): Promise<FoodDiaryPlanResponse> {
    // Scan-sourced TMB is read server-side (client numbers are never trusted).
    const scan =
      input.tmbSource === "scan"
        ? await this.foodDiaryRepository.findLatestScanTmbForUser(identity.userId)
        : null;

    const resolved = resolvePlanInputs(input, scan);

    if (!resolved.ok) {
      throw new ApiError(422, resolved.code, resolved.message);
    }

    // Versioned upsert: the RPC archives the previous version (later-day change)
    // or updates in place (same-day edit) atomically. effective_from = local day.
    const today = resolveLocalDay(undefined, resolveTimeZone(input.timeZone));
    const saved = await this.foodDiaryRepository.upsertPlanVersioned({
      userId: identity.userId,
      today,
      goal: input.goal,
      ...resolved.value,
    });

    const latestScan =
      scan ?? (await this.foodDiaryRepository.findLatestScanTmbForUser(identity.userId));

    return {
      plan: mapPlanToView(saved),
      tmbSuggestion: buildTmbSuggestion(latestScan, saved),
    };
  }

  /* ─── History (last 7 days) ─── */

  async getHistory(
    identity: CurrentUserIdentity,
    options: DayQueryOptions,
  ): Promise<FoodDiaryHistoryResponse> {
    const timeZone = resolveTimeZone(options.timeZone);
    const endDay = resolveLocalDay(options.date, timeZone);
    const dayStrings = buildLocalDayStrings(endDay, HISTORY_DAYS);
    const rangeStartIso = localDayWindow(dayStrings[0], timeZone).startIso;
    const rangeEndIso = localDayWindow(dayStrings[dayStrings.length - 1], timeZone).endIso;

    const [entries, activities, plans] = await Promise.all([
      this.foodDiaryRepository.listConfirmedEntriesInRange(
        identity.userId,
        rangeStartIso,
        rangeEndIso,
      ),
      this.foodDiaryRepository.listActivitiesInRange(identity.userId, rangeStartIso, rangeEndIso),
      // All plan versions (active + archived) effective up to the window's end.
      this.foodDiaryRepository.listPlansEffectiveUpTo(identity.userId, endDay),
    ]);

    const days: FoodDiaryHistoryDay[] = dayStrings.map((dayString): FoodDiaryHistoryDay => {
      const dayEntries = entries.filter(
        (entry) => localDayOf(entry.logged_at, timeZone) === dayString,
      );
      const consumedKcal = dayEntries.reduce(
        (sum, entry) => sum + (toNumberOrNull(entry.confirmed_total_kcal) ?? 0),
        0,
      );
      const consumedProteinG = dayEntries.reduce(
        (sum, entry) => sum + (toNumberOrNull(entry.confirmed_total_protein_g) ?? 0),
        0,
      );
      const burnedKcal = activities
        .filter((activity) => localDayOf(activity.logged_at, timeZone) === dayString)
        .reduce((sum, activity) => sum + toNumber(activity.kcal_burned), 0);

      // The plan version valid on this day = the one with the greatest
      // effective_from ≤ day (plans are ordered effective_from desc).
      const planRecord = selectPlanVersionForDay(plans, dayString);

      if (!planRecord) {
        return {
          date: dayString,
          consumedKcal: roundKcal(consumedKcal),
          consumedProteinG: round1(consumedProteinG),
          burnedKcal: roundKcal(burnedKcal),
          status: "incomplete",
          goal: null,
          gastoDiaKcal: null,
          alvoCentralKcal: null,
          bandLowKcal: null,
          bandHighKcal: null,
          plannedBalanceKcal: null,
        };
      }

      // SAME engine as Today — driven by that day's plan version + that day's activity.
      const energy = computeEnergyPlan({
        tmbKcal: toNumber(planRecord.tmb_kcal),
        routineLevel: asRoutineLevel(planRecord.routine_level),
        activitiesKcal: burnedKcal,
        plannedBalanceKcal: toNumber(planRecord.planned_balance_kcal),
        toleranceKcal: toNumber(planRecord.tolerance_kcal),
      });

      return {
        date: dayString,
        consumedKcal: roundKcal(consumedKcal),
        consumedProteinG: round1(consumedProteinG),
        burnedKcal: roundKcal(burnedKcal),
        status: classifyConsumption(consumedKcal, energy),
        goal: asGoal(planRecord.goal),
        gastoDiaKcal: energy.gastoDiaKcal,
        alvoCentralKcal: energy.alvoCentralKcal,
        bandLowKcal: energy.bandLowKcal,
        bandHighKcal: energy.bandHighKcal,
        plannedBalanceKcal: toNumber(planRecord.planned_balance_kcal),
      };
    });

    return { days };
  }

  /* ─── Calorie target (create / update) ─── */

  async upsertTarget(
    identity: CurrentUserIdentity,
    input: UpsertCalorieTargetInput,
  ): Promise<CalorieTargetResponse> {
    const timeZone = resolveTimeZone(input.timeZone);
    const effectiveFrom = resolveLocalDay(input.effectiveFrom, timeZone);
    const proteinPercent = input.proteinPercent ?? DEFAULT_PROTEIN_PERCENT;
    const carbPercent = input.carbPercent ?? DEFAULT_CARB_PERCENT;
    const fatPercent = input.fatPercent ?? DEFAULT_FAT_PERCENT;

    assertPercentagesSumTo100(proteinPercent, carbPercent, fatPercent);

    const record = await this.foodDiaryRepository.upsertTarget({
      studentUserId: identity.userId,
      effectiveFrom,
      targetKcal: input.targetKcal,
      proteinPercent,
      carbPercent,
      fatPercent,
      source: input.source ?? "manual",
    });

    return { target: mapTargetToView(record) };
  }

  /* ─── Manual activity energy ─── */

  async addActivity(
    identity: CurrentUserIdentity,
    input: CreateActivityInput,
  ): Promise<ActivityEnergyResponse> {
    const label = input.label?.trim();

    const record = await this.foodDiaryRepository.createActivity({
      studentUserId: identity.userId,
      // P1 is manual only; the workout_session link is reserved for P2.
      source: "manual",
      workoutSessionId: null,
      label: label ? label : null,
      kcalBurned: input.kcalBurned,
      loggedAt: input.loggedAt ?? new Date().toISOString(),
    });

    return { activity: mapActivityToView(record) };
  }

  async removeActivity(
    identity: CurrentUserIdentity,
    activityId: string,
  ): Promise<FoodDiaryDeleteResponse> {
    const deleted = await this.foodDiaryRepository.deleteActivityForStudent(
      activityId,
      identity.userId,
    );

    if (!deleted) {
      throw new ApiError(404, "food_diary_activity_not_found", "Atividade não encontrada.");
    }

    return { success: true };
  }

  /* ─── Entry draft ─── */

  async createEntryDraft(
    identity: CurrentUserIdentity,
    input: CreateEntryDraftInput,
  ): Promise<FoodDiaryEntryResponse> {
    const idempotencyKey = input.idempotencyKey?.trim() ? input.idempotencyKey.trim() : null;

    if (idempotencyKey) {
      const existing = await this.foodDiaryRepository.findEntryByIdempotencyKey(
        identity.userId,
        idempotencyKey,
      );

      if (existing) {
        return this.composeEntryResponse(existing);
      }
    }

    const preparationHint = input.preparationHint?.trim();
    const userNotes = input.userNotes?.trim();
    const hiddenIngredients: Json = input.hiddenIngredients ?? [];

    try {
      const record = await this.foodDiaryRepository.createEntryDraft({
        studentUserId: identity.userId,
        mealType: input.mealType,
        loggedAt: input.loggedAt ?? new Date().toISOString(),
        containerSize: input.containerSize ?? null,
        mealOrigin: input.mealOrigin ?? null,
        preparationHint: preparationHint ? preparationHint : null,
        hiddenIngredients,
        isSharedPortion: input.isSharedPortion ?? false,
        userNotes: userNotes ? userNotes : null,
        idempotencyKey,
      });

      return { entry: mapEntryToView(record, []) };
    } catch (error: unknown) {
      // Idempotency race: another request inserted the same key first — return it.
      if (
        idempotencyKey
        && error instanceof ApiError
        && error.code === "food_diary_entry_duplicate"
      ) {
        const existing = await this.foodDiaryRepository.findEntryByIdempotencyKey(
          identity.userId,
          idempotencyKey,
        );

        if (existing) {
          return this.composeEntryResponse(existing);
        }
      }

      throw error;
    }
  }

  async getEntry(
    identity: CurrentUserIdentity,
    entryId: string,
  ): Promise<FoodDiaryEntryResponse> {
    const record = await this.requireEntryOwnedByStudent(entryId, identity.userId);

    return this.composeEntryResponse(record);
  }

  async deleteEntry(
    identity: CurrentUserIdentity,
    entryId: string,
  ): Promise<FoodDiaryDeleteResponse> {
    const record = await this.requireEntryOwnedByStudent(entryId, identity.userId);

    if (record.status === "processing") {
      throw new ApiError(
        409,
        "food_diary_entry_processing",
        "Não é possível excluir um registro enquanto ele está em análise.",
      );
    }

    const deleted = await this.foodDiaryRepository.deleteEntryForStudent(entryId, identity.userId);

    if (!deleted) {
      throw new ApiError(404, "food_diary_entry_not_found", "Registro não encontrado.");
    }

    // Remove the photo object (best-effort) now that the row and its items are gone.
    if (record.photo_storage_path) {
      await this.foodDiaryRepository.removePhotoObject(record.photo_storage_path);
    }

    return { success: true };
  }

  /* ─── Photo upload (private bucket) ─── */

  async uploadEntryPhoto(
    identity: CurrentUserIdentity,
    entryId: string,
    input: { file: File },
  ): Promise<FoodDiaryPhotoResponse> {
    const record = await this.requireEntryOwnedByStudent(entryId, identity.userId);

    if (!UPLOADABLE_STATUSES.includes(record.status as FoodDiaryStatus)) {
      throw new ApiError(
        409,
        "food_diary_entry_invalid_status",
        "Este registro não aceita mais o envio de foto.",
      );
    }

    const file = input.file;

    if (!file || file.size <= 0) {
      throw new ApiError(400, "food_diary_photo_required", "Envie a foto para continuar.");
    }

    if (file.size > MAX_PHOTO_BYTES) {
      throw new ApiError(400, "food_diary_photo_too_large", "A imagem ultrapassa o limite de 15 MB.");
    }

    const ext = ALLOWED_MIME_TO_EXT[file.type];

    if (!ext) {
      throw new ApiError(
        400,
        "food_diary_photo_invalid_type",
        "Formato de imagem não suportado. Use JPEG, PNG ou WEBP.",
      );
    }

    // Unpredictable path, organized per user/entry. The client never supplies it.
    const storagePath = `${identity.userId}/${entryId}/${crypto.randomUUID()}.${ext}`;
    const previousPath = record.photo_storage_path;

    const buffer = await file.arrayBuffer();
    await this.foodDiaryRepository.uploadPhotoObject(storagePath, buffer, file.type);

    let updated: FoodDiaryEntryRecord | null;

    try {
      updated = await this.foodDiaryRepository.setEntryPhoto({
        entryId,
        studentUserId: identity.userId,
        storagePath,
        contentType: file.type,
      });
    } catch (error: unknown) {
      // Persistence failed after upload — remove the orphan object, then re-throw.
      await this.foodDiaryRepository.removePhotoObject(storagePath);
      throw error;
    }

    if (!updated) {
      await this.foodDiaryRepository.removePhotoObject(storagePath);
      throw new ApiError(404, "food_diary_entry_not_found", "Registro não encontrado.");
    }

    // Drop the previous photo (best-effort) now that the new one is persisted.
    if (previousPath && previousPath !== storagePath) {
      await this.foodDiaryRepository.removePhotoObject(previousPath);
    }

    const photoUrl = await this.foodDiaryRepository.createSignedReadUrl(
      storagePath,
      SIGNED_URL_TTL_SECONDS,
    );
    const items = await this.foodDiaryRepository.listItemsByEntryId(entryId);

    return { entry: mapEntryToView(updated, items), photoUrl };
  }

  /* ─── AI analysis (draft → processing → completed | rejected | failed) ─── */

  async analyzeEntry(
    identity: CurrentUserIdentity,
    entryId: string,
    options: AnalyzeEntryInput,
  ): Promise<FoodDiaryEntryResponse> {
    const record = await this.requireEntryOwnedByStudent(entryId, identity.userId);
    const status = record.status as FoodDiaryStatus;

    if (status === "processing") {
      throw new ApiError(409, "food_diary_entry_processing", "Esta análise já está em processamento.");
    }
    if (status === "completed") {
      throw new ApiError(409, "food_diary_entry_already_analyzed", "Esta refeição já foi analisada.");
    }
    if (status === "confirmed") {
      throw new ApiError(409, "food_diary_entry_already_confirmed", "Esta refeição já foi confirmada.");
    }
    if (!record.photo_storage_path) {
      throw new ApiError(400, "food_diary_photo_required", "Envie a foto antes de analisar.");
    }

    // Daily quota (entry's local day). completed/confirmed count; a failed/rejected
    // attempt does not — so it is checked before we spend the AI call.
    await this.assertDailyQuota(identity.userId, record.logged_at, options.timeZone);

    // Atomic transition guards double processing.
    const transitioned = await this.foodDiaryRepository.transitionToProcessing(
      entryId,
      identity.userId,
    );

    if (!transitioned) {
      throw new ApiError(409, "food_diary_entry_processing", "Esta análise já está em processamento.");
    }

    const signedUrl = await this.foodDiaryRepository.createSignedReadUrl(
      record.photo_storage_path,
      SIGNED_URL_TTL_SECONDS,
    );
    const aiClient = this.deps.aiClientFactory();
    const analyzedAt = new Date().toISOString();

    let aiResponse: FoodDiaryAiResponse;

    try {
      aiResponse = await aiClient.analyze({
        imageUrl: signedUrl,
        mealType: record.meal_type,
        containerSize: record.container_size,
        mealOrigin: record.meal_origin,
        preparationHint: record.preparation_hint,
        hiddenIngredients: toStringArray(record.hidden_ingredients),
        isSharedPortion: record.is_shared_portion,
        userNotes: record.user_notes,
      });
    } catch (error: unknown) {
      // Photo unusable → rejected; any other AI failure → failed. Neither consumes quota.
      const isRejection = error instanceof ApiError && error.code === "food_diary_image_rejected";
      const failureReason = error instanceof ApiError ? error.code : "food_diary_ai_failed";

      await this.foodDiaryRepository.replaceEntryItems(entryId, []);
      await this.foodDiaryRepository.finalizeEntryAnalysis(entryId, {
        status: isRejection ? "rejected" : "failed",
        aiResult: {},
        aiModel: aiClient.modelName,
        confidence: null,
        qualityOverall: null,
        needsRetake: isRejection,
        failureReason,
        estimatedTotalKcal: null,
        estimatedTotalProteinG: null,
        estimatedTotalCarbG: null,
        estimatedTotalFatG: null,
        estimatedTotalFiberG: null,
        analyzedAt,
      });

      throw error;
    }

    const analysis = aiResponse.analysis;
    const aiResultJson = aiResponse as unknown as Json;

    // Photo technically inadequate → rejected (needs_retake), no items.
    if (analysis.needsRetake) {
      await this.foodDiaryRepository.replaceEntryItems(entryId, []);
      const rejected = await this.foodDiaryRepository.finalizeEntryAnalysis(entryId, {
        status: "rejected",
        aiResult: aiResultJson,
        aiModel: aiClient.modelName,
        confidence: null,
        qualityOverall: analysis.qualityOverall,
        needsRetake: true,
        failureReason: "needs_retake",
        estimatedTotalKcal: null,
        estimatedTotalProteinG: null,
        estimatedTotalCarbG: null,
        estimatedTotalFatG: null,
        estimatedTotalFiberG: null,
        analyzedAt,
      });

      return this.composeEntryResponse(rejected);
    }

    // Deterministic validation of the (already schema-valid) payload.
    const validation = validateAndNormalizeAnalysis(analysis);

    if (!validation.ok) {
      await this.foodDiaryRepository.replaceEntryItems(entryId, []);
      await this.foodDiaryRepository.finalizeEntryAnalysis(entryId, {
        status: "failed",
        aiResult: aiResultJson,
        aiModel: aiClient.modelName,
        confidence: null,
        qualityOverall: analysis.qualityOverall,
        needsRetake: false,
        failureReason: validation.code,
        estimatedTotalKcal: null,
        estimatedTotalProteinG: null,
        estimatedTotalCarbG: null,
        estimatedTotalFatG: null,
        estimatedTotalFiberG: null,
        analyzedAt,
      });

      throw new ApiError(422, validation.code, validation.message);
    }

    // Persist items FIRST, then mark completed — never a completed entry without items.
    const items: CreateItemDbInput[] = validation.items.map((item, index) => ({
      entryId,
      position: index,
      name: item.name,
      preparation: item.preparation,
      category: item.category,
      identification: item.identification,
      alternatives: item.alternatives as unknown as Json,
      gramsEstimated: item.gramsEstimated,
      gramsConfirmed: null,
      householdMeasure: item.householdMeasure,
      confidence: item.confidence,
      isPartiallyHidden: item.isPartiallyHidden,
      isUserAdded: false,
      nutritionSource: "ai_estimated",
      kcalPer100g: item.kcalPer100g,
      proteinPer100g: item.proteinPer100g,
      carbPer100g: item.carbPer100g,
      fatPer100g: item.fatPer100g,
      fiberPer100g: item.fiberPer100g,
      aiItemPayload: item.aiItemPayload as unknown as Json,
    }));

    await this.foodDiaryRepository.replaceEntryItems(entryId, items);

    const completed = await this.foodDiaryRepository.finalizeEntryAnalysis(entryId, {
      status: "completed",
      aiResult: aiResultJson,
      aiModel: aiClient.modelName,
      confidence: validation.overallConfidence,
      qualityOverall: analysis.qualityOverall,
      needsRetake: false,
      failureReason: null,
      estimatedTotalKcal: validation.estimatedTotals.kcal,
      estimatedTotalProteinG: validation.estimatedTotals.proteinG,
      estimatedTotalCarbG: validation.estimatedTotals.carbG,
      estimatedTotalFatG: validation.estimatedTotals.fatG,
      estimatedTotalFiberG: validation.estimatedTotals.fiberG,
      analyzedAt,
    });

    return this.composeEntryResponse(completed);
  }

  /* ─── Human review + confirmation ─── */

  async reviewEntry(
    identity: CurrentUserIdentity,
    entryId: string,
    input: ReviewEntryInput,
  ): Promise<FoodDiaryEntryResponse> {
    const record = await this.requireEntryOwnedByStudent(entryId, identity.userId);

    if (record.status !== "completed") {
      throw new ApiError(
        409,
        "food_diary_entry_not_reviewable",
        "Só é possível revisar uma análise concluída.",
      );
    }

    for (const edit of input.items ?? []) {
      const updated = await this.foodDiaryRepository.updateItemForEntry({
        itemId: edit.id,
        entryId,
        gramsConfirmed: edit.gramsConfirmed,
        isRemoved: edit.isRemoved,
        name: edit.name?.trim() ? edit.name.trim() : undefined,
        preparation: edit.preparation,
      });

      if (!updated) {
        throw new ApiError(404, "food_diary_item_not_found", "Item não encontrado nesta refeição.");
      }
    }

    const addedItems = input.addedItems ?? [];

    if (addedItems.length > 0) {
      const existing = await this.foodDiaryRepository.listItemsByEntryId(entryId);
      let nextPosition = existing.reduce((max, item) => Math.max(max, item.position), -1) + 1;

      for (const added of addedItems) {
        await this.foodDiaryRepository.insertManualItem({
          entryId,
          position: nextPosition,
          name: added.name.trim(),
          preparation: added.preparation ?? null,
          category: added.category ?? null,
          // Manual item: the user chose it, so the identity is not ambiguous.
          identification: "identified",
          alternatives: [] as unknown as Json,
          // Manual item: the informed grams are both the estimate and the confirmed value.
          gramsEstimated: added.grams,
          gramsConfirmed: added.grams,
          householdMeasure: added.householdMeasure ?? null,
          confidence: null,
          isPartiallyHidden: false,
          isUserAdded: true,
          nutritionSource: "manual",
          kcalPer100g: added.kcalPer100g,
          proteinPer100g: added.proteinPer100g,
          carbPer100g: added.carbPer100g,
          fatPer100g: added.fatPer100g,
          fiberPer100g: added.fiberPer100g ?? null,
          aiItemPayload: {},
        });

        nextPosition += 1;
      }
    }

    return this.composeEntryResponse(record);
  }

  async confirmEntry(
    identity: CurrentUserIdentity,
    entryId: string,
  ): Promise<FoodDiaryEntryResponse> {
    const record = await this.requireEntryOwnedByStudent(entryId, identity.userId);

    if (record.status === "confirmed") {
      throw new ApiError(
        409,
        "food_diary_entry_already_confirmed",
        "Esta refeição já foi confirmada.",
      );
    }

    if (record.status !== "completed") {
      throw new ApiError(
        409,
        "food_diary_entry_not_confirmable",
        "Só é possível confirmar uma análise concluída.",
      );
    }

    const items = await this.foodDiaryRepository.listItemsByEntryId(entryId);
    const activeItems = items.filter((item) => !item.is_removed);
    const totals = computeConfirmedTotals(activeItems);

    const confirmed = await this.foodDiaryRepository.finalizeEntryConfirmation(entryId, {
      confirmedTotalKcal: totals.kcal,
      confirmedTotalProteinG: totals.proteinG,
      confirmedTotalCarbG: totals.carbG,
      confirmedTotalFatG: totals.fatG,
      confirmedTotalFiberG: totals.fiberG,
      confirmedAt: new Date().toISOString(),
    });

    return this.composeEntryResponse(confirmed);
  }

  /* ─── Internal ─── */

  private async assertDailyQuota(
    studentUserId: string,
    loggedAt: string,
    timeZone: string | undefined,
  ): Promise<void> {
    const resolvedTimeZone = resolveTimeZone(timeZone);
    const day = localDayOf(loggedAt, resolvedTimeZone);
    const { startIso, endIso } = localDayWindow(day, resolvedTimeZone);

    const concluded = await this.foodDiaryRepository.countConcludedEntriesInRange(
      studentUserId,
      startIso,
      endIso,
    );

    if (concluded >= this.deps.dailyAnalysisLimit) {
      throw new ApiError(
        429,
        "food_diary_daily_limit_reached",
        `Você atingiu o limite de ${this.deps.dailyAnalysisLimit} análises concluídas neste dia.`,
        { limit: this.deps.dailyAnalysisLimit },
      );
    }
  }

  private async composeEntryResponse(
    record: FoodDiaryEntryRecord,
  ): Promise<FoodDiaryEntryResponse> {
    const items = await this.foodDiaryRepository.listItemsByEntryId(record.id);

    return { entry: mapEntryToView(record, items) };
  }

  private async requireEntryOwnedByStudent(
    entryId: string,
    studentUserId: string,
  ): Promise<FoodDiaryEntryRecord> {
    const record = await this.foodDiaryRepository.findEntryByIdForStudent(entryId, studentUserId);

    if (!record) {
      throw new ApiError(404, "food_diary_entry_not_found", "Registro não encontrado.");
    }

    return record;
  }
}

/* ─── Date helpers (local calendar day resolution — see diaryDay.ts) ─── */

function resolveLocalDay(date: string | undefined, timeZone: string): string {
  if (date === undefined) {
    return localDayOf(new Date(), timeZone);
  }

  if (!isValidDateString(date)) {
    throw new ApiError(400, "invalid_request", "Data inválida. Use o formato YYYY-MM-DD.");
  }

  return date;
}

/* ─── Numeric helpers ─── */

function toNumber(value: number | string): number {
  const numeric = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numeric)) {
    throw new ApiError(500, "food_diary_invalid_value", "Valor numérico inválido no diário.");
  }

  return numeric;
}

function toNumberOrNull(value: number | string | null): number | null {
  if (value === null) {
    return null;
  }

  const numeric = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numeric) ? numeric : null;
}

function roundKcal(value: number): number {
  return Math.round(value);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/* ─── Domain helpers ─── */

function assertPercentagesSumTo100(protein: number, carb: number, fat: number): void {
  if (Math.abs(protein + carb + fat - 100) > 0.01) {
    throw new ApiError(
      400,
      "food_diary_invalid_macros",
      "Os percentuais de macros (proteína, carboidrato, gordura) devem somar 100%.",
    );
  }
}

function sumConfirmedTotals(entries: FoodDiaryEntryRecord[]): {
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  fiberG: number;
} {
  const totals = { kcal: 0, proteinG: 0, carbG: 0, fatG: 0, fiberG: 0 };

  for (const entry of entries) {
    totals.kcal += toNumberOrNull(entry.confirmed_total_kcal) ?? 0;
    totals.proteinG += toNumberOrNull(entry.confirmed_total_protein_g) ?? 0;
    totals.carbG += toNumberOrNull(entry.confirmed_total_carb_g) ?? 0;
    totals.fatG += toNumberOrNull(entry.confirmed_total_fat_g) ?? 0;
    totals.fiberG += toNumberOrNull(entry.confirmed_total_fiber_g) ?? 0;
  }

  return {
    kcal: roundKcal(totals.kcal),
    proteinG: round1(totals.proteinG),
    carbG: round1(totals.carbG),
    fatG: round1(totals.fatG),
    fiberG: round1(totals.fiberG),
  };
}

/** Confirmed totals from persisted per-100g values × effective grams (confirmed ?? estimated). */
function computeConfirmedTotals(items: FoodDiaryItemRecord[]): {
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  fiberG: number;
} {
  const totals = { kcal: 0, proteinG: 0, carbG: 0, fatG: 0, fiberG: 0 };

  for (const item of items) {
    const grams = toNumberOrNull(item.grams_confirmed) ?? toNumber(item.grams_estimated);
    const factor = grams / 100;
    totals.kcal += toNumber(item.kcal_per_100g) * factor;
    totals.proteinG += toNumber(item.protein_per_100g) * factor;
    totals.carbG += toNumber(item.carb_per_100g) * factor;
    totals.fatG += toNumber(item.fat_per_100g) * factor;
    totals.fiberG += (toNumberOrNull(item.fiber_per_100g) ?? 0) * factor;
  }

  return {
    kcal: roundKcal(totals.kcal),
    proteinG: round1(totals.proteinG),
    carbG: round1(totals.carbG),
    fatG: round1(totals.fatG),
    fiberG: round1(totals.fiberG),
  };
}

function toStringArray(value: Json): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function groupItemsByEntry(items: FoodDiaryItemRecord[]): Map<string, FoodDiaryItemRecord[]> {
  const grouped = new Map<string, FoodDiaryItemRecord[]>();

  for (const item of items) {
    const list = grouped.get(item.entry_id);

    if (list) {
      list.push(item);
    } else {
      grouped.set(item.entry_id, [item]);
    }
  }

  return grouped;
}

/* ─── Mappers (snake_case record → camelCase view) ─── */

function mapTargetToView(record: DailyCalorieTargetRecord): CalorieTargetView {
  return {
    id: record.id,
    effectiveFrom: record.effective_from,
    targetKcal: toNumber(record.target_kcal),
    proteinPercent: toNumber(record.protein_percent),
    carbPercent: toNumber(record.carb_percent),
    fatPercent: toNumber(record.fat_percent),
    source: record.source,
  };
}

function mapItemToView(record: FoodDiaryItemRecord): FoodDiaryItemView {
  return {
    id: record.id,
    entryId: record.entry_id,
    position: record.position,
    name: record.name,
    preparation: record.preparation,
    category: record.category,
    identification: record.identification,
    alternatives: toStringArray(record.alternatives),
    gramsEstimated: toNumber(record.grams_estimated),
    gramsConfirmed: toNumberOrNull(record.grams_confirmed),
    householdMeasure: record.household_measure,
    confidence: toNumberOrNull(record.confidence),
    isPartiallyHidden: record.is_partially_hidden,
    isUserAdded: record.is_user_added,
    isRemoved: record.is_removed,
    nutritionSource: record.nutrition_source,
    nutritionReferenceId: record.nutrition_reference_id,
    kcalPer100g: toNumber(record.kcal_per_100g),
    proteinPer100g: toNumber(record.protein_per_100g),
    carbPer100g: toNumber(record.carb_per_100g),
    fatPer100g: toNumber(record.fat_per_100g),
    fiberPer100g: toNumberOrNull(record.fiber_per_100g),
  };
}

function mapEntryToView(
  record: FoodDiaryEntryRecord,
  items: FoodDiaryItemRecord[],
): FoodDiaryEntryView {
  return {
    id: record.id,
    studentUserId: record.student_user_id,
    status: record.status as FoodDiaryStatus,
    mealType: record.meal_type,
    loggedAt: record.logged_at,
    containerSize: record.container_size,
    mealOrigin: record.meal_origin,
    preparationHint: record.preparation_hint,
    hiddenIngredients: record.hidden_ingredients,
    isSharedPortion: record.is_shared_portion,
    userNotes: record.user_notes,
    confidence: toNumberOrNull(record.confidence),
    qualityOverall: record.quality_overall,
    needsRetake: record.needs_retake,
    failureReason: record.failure_reason,
    estimatedTotals: {
      kcal: toNumberOrNull(record.estimated_total_kcal),
      proteinG: toNumberOrNull(record.estimated_total_protein_g),
      carbG: toNumberOrNull(record.estimated_total_carb_g),
      fatG: toNumberOrNull(record.estimated_total_fat_g),
      fiberG: toNumberOrNull(record.estimated_total_fiber_g),
    },
    confirmedTotals: {
      kcal: toNumberOrNull(record.confirmed_total_kcal),
      proteinG: toNumberOrNull(record.confirmed_total_protein_g),
      carbG: toNumberOrNull(record.confirmed_total_carb_g),
      fatG: toNumberOrNull(record.confirmed_total_fat_g),
      fiberG: toNumberOrNull(record.confirmed_total_fiber_g),
    },
    processingStartedAt: record.processing_started_at,
    analyzedAt: record.analyzed_at,
    confirmedAt: record.confirmed_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    items: items.map(mapItemToView),
  };
}

function mapActivityToView(record: ActivityEnergyEntryRecord): ActivityEnergyView {
  return {
    id: record.id,
    source: record.source,
    label: record.label,
    kcalBurned: toNumber(record.kcal_burned),
    loggedAt: record.logged_at,
    workoutSessionId: record.workout_session_id,
  };
}

/* ─── Energy plan (Diário 2.0) mappers ─── */

function mapPlanToView(record: FoodDiaryPlanRecord): FoodDiaryPlanView {
  const goal = asGoal(record.goal);
  const routineLevel = asRoutineLevel(record.routine_level);

  return {
    id: record.id,
    status: record.status,
    effectiveFrom: record.effective_from,
    goal,
    goalLabel: GOAL_LABELS[goal],
    tmbKcal: toNumber(record.tmb_kcal),
    tmbSource: asTmbSource(record.tmb_source),
    tmbSnapshot: parseSnapshot(record.tmb_input),
    scanId: record.scan_id,
    routineLevel,
    routineLabel: ROUTINE_LEVEL_LABELS[routineLevel],
    routineFactor: toNumber(record.routine_factor),
    plannedBalanceKcal: toNumber(record.planned_balance_kcal),
    toleranceKcal: toNumber(record.tolerance_kcal),
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function buildHud(record: FoodDiaryPlanRecord, consumedKcal: number, burnedKcal: number): FoodDiaryHud {
  const goal = asGoal(record.goal);
  const energy = computeEnergyPlan({
    tmbKcal: toNumber(record.tmb_kcal),
    routineLevel: asRoutineLevel(record.routine_level),
    activitiesKcal: burnedKcal,
    plannedBalanceKcal: toNumber(record.planned_balance_kcal),
    toleranceKcal: toNumber(record.tolerance_kcal),
  });
  const status = classifyConsumption(consumedKcal, energy);

  return {
    goal,
    goalLabel: GOAL_LABELS[goal],
    missionLabel: missionLabelFor(goal),
    status,
    statusLabel: statusLabelFor(status),
    tmbKcal: energy.tmbKcal,
    routineFactor: energy.routineFactor,
    gastoBaseKcal: energy.gastoBaseKcal,
    gastoDiaKcal: energy.gastoDiaKcal,
    alvoCentralKcal: energy.alvoCentralKcal,
    plannedBalanceKcal: toNumber(record.planned_balance_kcal),
    bandLowKcal: energy.bandLowKcal,
    bandHighKcal: energy.bandHighKcal,
    consumedKcal: roundKcal(consumedKcal),
    burnedKcal: roundKcal(burnedKcal),
    kcalToBandTop: kcalToBandTop(consumedKcal, energy),
    kcalOverBandTop: kcalOverBandTop(consumedKcal, energy),
  };
}

function buildTmbSuggestion(
  scan: LatestScanTmb | null,
  plan: FoodDiaryPlanRecord | null,
): TmbSuggestion {
  if (!scan) {
    return {
      hasScan: false,
      scanId: null,
      scanCreatedAt: null,
      tmbKcal: null,
      leanMassKg: null,
      bodyFatPercent: null,
      weightKg: null,
      hasNewerScanThanPlan: false,
    };
  }

  const tmbKcal =
    scan.leanMassKg && scan.leanMassKg > 0 ? estimateTmbFromLeanMass(scan.leanMassKg) : scan.bmr;
  const hasNewerScanThanPlan =
    plan !== null && plan.scan_id !== scan.id && scan.createdAt > plan.created_at;

  return {
    hasScan: true,
    scanId: scan.id,
    scanCreatedAt: scan.createdAt,
    tmbKcal,
    leanMassKg: scan.leanMassKg,
    bodyFatPercent: scan.bodyFatPercent,
    weightKg: scan.weightKg,
    hasNewerScanThanPlan,
  };
}

function parseSnapshot(value: Json): PlanTmbSnapshot {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, Json>;
    return {
      leanMassKg: numberOrNull(record.leanMassKg),
      bodyFatPercent: numberOrNull(record.bodyFatPercent),
      weightKg: numberOrNull(record.weightKg),
    };
  }

  return { leanMassKg: null, bodyFatPercent: null, weightKg: null };
}

function numberOrNull(value: Json | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
