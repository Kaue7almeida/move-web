import type { Json } from "@/bff/core/supabase/database.types";
import { ApiError } from "@/bff/core/errors/ApiError";
import type { CurrentUserIdentity } from "@/bff/modules/profile/types";
import type { IFoodDiaryRepository } from "@/bff/modules/foodDiary/types/IFoodDiaryRepository";
import type {
  ActivityEnergyEntryRecord,
  ActivityEnergyResponse,
  ActivityEnergyView,
  CalorieTargetResponse,
  CalorieTargetView,
  CreateActivityInput,
  CreateEntryDraftInput,
  DailyCalorieTargetRecord,
  FoodDiaryDeleteResponse,
  FoodDiaryEntryRecord,
  FoodDiaryEntryResponse,
  FoodDiaryEntryView,
  FoodDiaryHistoryResponse,
  FoodDiaryItemRecord,
  FoodDiaryItemView,
  FoodDiaryStatus,
  FoodDiaryTodayResponse,
  UpsertCalorieTargetInput,
} from "@/bff/modules/foodDiary/types";

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_DAYS = 7;
const DEFAULT_PROTEIN_PERCENT = 25;
const DEFAULT_CARB_PERCENT = 45;
const DEFAULT_FAT_PERCENT = 30;

export class FoodDiaryService {
  constructor(private readonly foodDiaryRepository: IFoodDiaryRepository) {}

  /* ─── Today ─── */

  async getToday(
    identity: CurrentUserIdentity,
    options: { date?: string },
  ): Promise<FoodDiaryTodayResponse> {
    const day = resolveDayString(options.date);
    const { startIso, endIso } = dayWindowIso(day);

    const [targetRecord, entries, activities] = await Promise.all([
      this.foodDiaryRepository.findCurrentTargetForDate(identity.userId, day),
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

    return {
      date: day,
      target,
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

  /* ─── History (last 7 days) ─── */

  async getHistory(
    identity: CurrentUserIdentity,
    options: { date?: string },
  ): Promise<FoodDiaryHistoryResponse> {
    const endDay = resolveDayString(options.date);
    const dayStrings = buildDayStrings(endDay, HISTORY_DAYS);
    const rangeStartIso = dayWindowIso(dayStrings[0]).startIso;
    const rangeEndIso = dayWindowIso(dayStrings[dayStrings.length - 1]).endIso;

    const [entries, activities, targets] = await Promise.all([
      this.foodDiaryRepository.listConfirmedEntriesInRange(
        identity.userId,
        rangeStartIso,
        rangeEndIso,
      ),
      this.foodDiaryRepository.listActivitiesInRange(identity.userId, rangeStartIso, rangeEndIso),
      this.foodDiaryRepository.listTargetsEffectiveUpTo(identity.userId, endDay),
    ]);

    const days = dayStrings.map((dayString) => {
      const consumedKcal = entries
        .filter((entry) => utcDateOf(entry.logged_at) === dayString)
        .reduce((sum, entry) => sum + (toNumberOrNull(entry.confirmed_total_kcal) ?? 0), 0);

      const burnedKcal = activities
        .filter((activity) => utcDateOf(activity.logged_at) === dayString)
        .reduce((sum, activity) => sum + toNumber(activity.kcal_burned), 0);

      // targets are ordered effective_from desc: the first one on/before the day applies.
      const targetRecord = targets.find((target) => target.effective_from <= dayString) ?? null;
      const targetKcal = targetRecord ? toNumber(targetRecord.target_kcal) : null;
      const balanceKcal =
        targetKcal !== null ? roundKcal(consumedKcal - (targetKcal + burnedKcal)) : null;

      return {
        date: dayString,
        consumedKcal: roundKcal(consumedKcal),
        burnedKcal: roundKcal(burnedKcal),
        targetKcal: targetKcal !== null ? roundKcal(targetKcal) : null,
        balanceKcal,
      };
    });

    return { days };
  }

  /* ─── Calorie target (create / update) ─── */

  async upsertTarget(
    identity: CurrentUserIdentity,
    input: UpsertCalorieTargetInput,
  ): Promise<CalorieTargetResponse> {
    const effectiveFrom = resolveDayString(input.effectiveFrom);
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

    return { success: true };
  }

  /* ─── Internal ─── */

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

/* ─── Date helpers (UTC calendar days — consistent with the repo's ISO/UTC dates) ─── */

function resolveDayString(date?: string): string {
  if (date === undefined) {
    return new Date().toISOString().slice(0, 10);
  }

  if (!DATE_ONLY_REGEX.test(date)) {
    throw new ApiError(400, "invalid_request", "Data inválida. Use o formato YYYY-MM-DD.");
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new ApiError(400, "invalid_request", "Data inválida. Use o formato YYYY-MM-DD.");
  }

  return date;
}

function dayWindowIso(dayString: string): { startIso: string; endIso: string } {
  const start = new Date(`${dayString}T00:00:00.000Z`);

  return {
    startIso: start.toISOString(),
    endIso: new Date(start.getTime() + DAY_MS).toISOString(),
  };
}

function buildDayStrings(endDay: string, count: number): string[] {
  const end = new Date(`${endDay}T00:00:00.000Z`);
  const days: string[] = [];

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    days.push(new Date(end.getTime() - offset * DAY_MS).toISOString().slice(0, 10));
  }

  return days;
}

function utcDateOf(iso: string): string {
  return iso.slice(0, 10);
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
