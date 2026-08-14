import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "@/bff/core/errors/ApiError";
import type { Database } from "@/bff/core/supabase/database.types";
import type {
  ConfirmEntryDbInput,
  CreateActivityDbInput,
  CreateEntryDraftDbInput,
  CreateItemDbInput,
  FinalizeEntryAnalysisDbInput,
  IFoodDiaryRepository,
  SetEntryPhotoDbInput,
  UpdateItemDbInput,
  UpsertCalorieTargetDbInput,
} from "@/bff/modules/foodDiary/types/IFoodDiaryRepository";
import type {
  ActivityEnergyEntryRecord,
  DailyCalorieTargetRecord,
  FoodDiaryEntryRecord,
  FoodDiaryItemRecord,
} from "@/bff/modules/foodDiary/types";
import type {
  FoodDiaryPlanRecord,
  LatestScanTmb,
  UpsertPlanDbInput,
} from "@/bff/modules/foodDiary/types/plan";

const FOOD_DIARY_PHOTOS_BUCKET = "food-diary-photos";

const DB_QUERY_FAILED = new ApiError(
  500,
  "food_diary_query_failed",
  "Falha ao consultar os dados do diário alimentar.",
);

const STORAGE_FAILED = new ApiError(
  502,
  "food_diary_storage_failed",
  "Falha ao acessar o armazenamento de imagens.",
);

function toItemInsert(
  input: CreateItemDbInput,
): Database["public"]["Tables"]["food_diary_items"]["Insert"] {
  return {
    entry_id: input.entryId,
    position: input.position,
    name: input.name,
    preparation: input.preparation,
    category: input.category,
    identification: input.identification,
    alternatives: input.alternatives,
    grams_estimated: input.gramsEstimated,
    grams_confirmed: input.gramsConfirmed,
    household_measure: input.householdMeasure,
    confidence: input.confidence,
    is_partially_hidden: input.isPartiallyHidden,
    is_user_added: input.isUserAdded,
    nutrition_source: input.nutritionSource,
    kcal_per_100g: input.kcalPer100g,
    protein_per_100g: input.proteinPer100g,
    carb_per_100g: input.carbPer100g,
    fat_per_100g: input.fatPer100g,
    fiber_per_100g: input.fiberPer100g,
    ai_item_payload: input.aiItemPayload,
  };
}

export class FoodDiaryRepository implements IFoodDiaryRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /* ─── food_diary_entries ─── */

  async createEntryDraft(input: CreateEntryDraftDbInput): Promise<FoodDiaryEntryRecord> {
    const payload: Database["public"]["Tables"]["food_diary_entries"]["Insert"] = {
      student_user_id: input.studentUserId,
      status: "draft",
      meal_type: input.mealType,
      logged_at: input.loggedAt,
      input_kind: input.inputKind,
      text_description: input.textDescription,
      container_size: input.containerSize,
      meal_origin: input.mealOrigin,
      preparation_hint: input.preparationHint,
      hidden_ingredients: input.hiddenIngredients,
      is_shared_portion: input.isSharedPortion,
      user_notes: input.userNotes,
      idempotency_key: input.idempotencyKey,
    };

    const { data, error } = await this.supabase
      .from("food_diary_entries")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new ApiError(
          409,
          "food_diary_entry_duplicate",
          "Já existe um registro com essa chave de idempotência.",
        );
      }

      throw new ApiError(500, "food_diary_entry_create_failed", "Não foi possível criar o registro.");
    }

    return data;
  }

  async findEntryByIdForStudent(
    entryId: string,
    studentUserId: string,
  ): Promise<FoodDiaryEntryRecord | null> {
    const { data, error } = await this.supabase
      .from("food_diary_entries")
      .select("*")
      .eq("id", entryId)
      .eq("student_user_id", studentUserId)
      .maybeSingle();

    if (error) {
      throw DB_QUERY_FAILED;
    }

    return data;
  }

  async findEntryByIdempotencyKey(
    studentUserId: string,
    idempotencyKey: string,
  ): Promise<FoodDiaryEntryRecord | null> {
    const { data, error } = await this.supabase
      .from("food_diary_entries")
      .select("*")
      .eq("student_user_id", studentUserId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (error) {
      throw DB_QUERY_FAILED;
    }

    return data;
  }

  async deleteEntryForStudent(entryId: string, studentUserId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("food_diary_entries")
      .delete()
      .eq("id", entryId)
      .eq("student_user_id", studentUserId)
      .select("id");

    if (error) {
      throw new ApiError(500, "food_diary_entry_delete_failed", "Não foi possível excluir o registro.");
    }

    return (data ?? []).length > 0;
  }

  async listConfirmedEntriesInRange(
    studentUserId: string,
    startIso: string,
    endIso: string,
  ): Promise<FoodDiaryEntryRecord[]> {
    const { data, error } = await this.supabase
      .from("food_diary_entries")
      .select("*")
      .eq("student_user_id", studentUserId)
      .eq("status", "confirmed")
      .gte("logged_at", startIso)
      .lt("logged_at", endIso)
      .order("logged_at", { ascending: true });

    if (error) {
      throw DB_QUERY_FAILED;
    }

    return data ?? [];
  }

  async countConcludedEntriesInRange(
    studentUserId: string,
    startIso: string,
    endIso: string,
  ): Promise<number> {
    const { count, error } = await this.supabase
      .from("food_diary_entries")
      .select("id", { count: "exact", head: true })
      .eq("student_user_id", studentUserId)
      .in("status", ["completed", "confirmed"])
      .gte("logged_at", startIso)
      .lt("logged_at", endIso);

    if (error) {
      throw DB_QUERY_FAILED;
    }

    return count ?? 0;
  }

  async setEntryPhoto(input: SetEntryPhotoDbInput): Promise<FoodDiaryEntryRecord | null> {
    const { data, error } = await this.supabase
      .from("food_diary_entries")
      .update({
        photo_storage_path: input.storagePath,
        photo_content_type: input.contentType,
      })
      .eq("id", input.entryId)
      .eq("student_user_id", input.studentUserId)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new ApiError(
        500,
        "food_diary_entry_update_failed",
        "Não foi possível salvar a foto no registro.",
      );
    }

    return data;
  }

  async transitionToProcessing(
    entryId: string,
    studentUserId: string,
  ): Promise<FoodDiaryEntryRecord | null> {
    // Atomic: only flips when the row still has a processable status and belongs
    // to the student. Concurrent calls: only one wins; the others get null.
    const { data, error } = await this.supabase
      .from("food_diary_entries")
      .update({ status: "processing", processing_started_at: new Date().toISOString() })
      .eq("id", entryId)
      .eq("student_user_id", studentUserId)
      .in("status", ["draft", "rejected", "failed"])
      .select("*")
      .maybeSingle();

    if (error) {
      throw new ApiError(
        500,
        "food_diary_status_update_failed",
        "Não foi possível atualizar o status do registro.",
      );
    }

    return data;
  }

  async finalizeEntryAnalysis(
    entryId: string,
    input: FinalizeEntryAnalysisDbInput,
  ): Promise<FoodDiaryEntryRecord> {
    const payload: Database["public"]["Tables"]["food_diary_entries"]["Update"] = {
      status: input.status,
      ai_result: input.aiResult,
      ai_model: input.aiModel,
      confidence: input.confidence,
      quality_overall: input.qualityOverall,
      needs_retake: input.needsRetake,
      failure_reason: input.failureReason,
      estimated_total_kcal: input.estimatedTotalKcal,
      estimated_total_protein_g: input.estimatedTotalProteinG,
      estimated_total_carb_g: input.estimatedTotalCarbG,
      estimated_total_fat_g: input.estimatedTotalFatG,
      estimated_total_fiber_g: input.estimatedTotalFiberG,
      analyzed_at: input.analyzedAt,
    };

    const { data, error } = await this.supabase
      .from("food_diary_entries")
      .update(payload)
      .eq("id", entryId)
      .select("*")
      .single();

    if (error || !data) {
      throw new ApiError(500, "food_diary_finalize_failed", "Não foi possível finalizar a análise.");
    }

    return data;
  }

  async finalizeEntryConfirmation(
    entryId: string,
    input: ConfirmEntryDbInput,
  ): Promise<FoodDiaryEntryRecord> {
    const payload: Database["public"]["Tables"]["food_diary_entries"]["Update"] = {
      status: "confirmed",
      confirmed_total_kcal: input.confirmedTotalKcal,
      confirmed_total_protein_g: input.confirmedTotalProteinG,
      confirmed_total_carb_g: input.confirmedTotalCarbG,
      confirmed_total_fat_g: input.confirmedTotalFatG,
      confirmed_total_fiber_g: input.confirmedTotalFiberG,
      confirmed_at: input.confirmedAt,
    };

    const { data, error } = await this.supabase
      .from("food_diary_entries")
      .update(payload)
      .eq("id", entryId)
      .select("*")
      .single();

    if (error || !data) {
      throw new ApiError(500, "food_diary_confirm_failed", "Não foi possível confirmar a refeição.");
    }

    return data;
  }

  /* ─── food_diary_items ─── */

  async listItemsByEntryId(entryId: string): Promise<FoodDiaryItemRecord[]> {
    const { data, error } = await this.supabase
      .from("food_diary_items")
      .select("*")
      .eq("entry_id", entryId)
      .order("position", { ascending: true });

    if (error) {
      throw DB_QUERY_FAILED;
    }

    return data ?? [];
  }

  async listItemsByEntryIds(entryIds: string[]): Promise<FoodDiaryItemRecord[]> {
    if (entryIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from("food_diary_items")
      .select("*")
      .in("entry_id", entryIds)
      .order("position", { ascending: true });

    if (error) {
      throw DB_QUERY_FAILED;
    }

    return data ?? [];
  }

  async replaceEntryItems(entryId: string, items: CreateItemDbInput[]): Promise<void> {
    const { error: deleteError } = await this.supabase
      .from("food_diary_items")
      .delete()
      .eq("entry_id", entryId);

    if (deleteError) {
      throw new ApiError(
        500,
        "food_diary_items_replace_failed",
        "Não foi possível salvar os itens da análise.",
      );
    }

    if (items.length === 0) {
      return;
    }

    const { error: insertError } = await this.supabase
      .from("food_diary_items")
      .insert(items.map(toItemInsert));

    if (insertError) {
      throw new ApiError(
        500,
        "food_diary_items_replace_failed",
        "Não foi possível salvar os itens da análise.",
      );
    }
  }

  async insertManualItem(input: CreateItemDbInput): Promise<FoodDiaryItemRecord> {
    const { data, error } = await this.supabase
      .from("food_diary_items")
      .insert(toItemInsert(input))
      .select("*")
      .single();

    if (error || !data) {
      throw new ApiError(500, "food_diary_item_create_failed", "Não foi possível adicionar o item.");
    }

    return data;
  }

  async updateItemForEntry(input: UpdateItemDbInput): Promise<FoodDiaryItemRecord | null> {
    const payload: Database["public"]["Tables"]["food_diary_items"]["Update"] = {};

    if (input.gramsConfirmed !== undefined) {
      payload.grams_confirmed = input.gramsConfirmed;
    }
    if (input.isRemoved !== undefined) {
      payload.is_removed = input.isRemoved;
    }
    if (input.name !== undefined) {
      payload.name = input.name;
    }
    if (input.preparation !== undefined) {
      payload.preparation = input.preparation;
    }
    if (input.identification !== undefined) {
      payload.identification = input.identification;
    }
    if (input.alternatives !== undefined) {
      payload.alternatives = input.alternatives;
    }
    if (input.kcalPer100g !== undefined) {
      payload.kcal_per_100g = input.kcalPer100g;
    }
    if (input.proteinPer100g !== undefined) {
      payload.protein_per_100g = input.proteinPer100g;
    }
    if (input.carbPer100g !== undefined) {
      payload.carb_per_100g = input.carbPer100g;
    }
    if (input.fatPer100g !== undefined) {
      payload.fat_per_100g = input.fatPer100g;
    }
    if (input.fiberPer100g !== undefined) {
      payload.fiber_per_100g = input.fiberPer100g;
    }

    const { data, error } = await this.supabase
      .from("food_diary_items")
      .update(payload)
      .eq("id", input.itemId)
      .eq("entry_id", input.entryId)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new ApiError(500, "food_diary_item_update_failed", "Não foi possível atualizar o item.");
    }

    return data;
  }

  /* ─── daily_calorie_targets ─── */

  async upsertTarget(input: UpsertCalorieTargetDbInput): Promise<DailyCalorieTargetRecord> {
    const payload: Database["public"]["Tables"]["daily_calorie_targets"]["Insert"] = {
      student_user_id: input.studentUserId,
      effective_from: input.effectiveFrom,
      target_kcal: input.targetKcal,
      protein_percent: input.proteinPercent,
      carb_percent: input.carbPercent,
      fat_percent: input.fatPercent,
      source: input.source,
    };

    const { data, error } = await this.supabase
      .from("daily_calorie_targets")
      .upsert(payload, { onConflict: "student_user_id,effective_from" })
      .select("*")
      .single();

    if (error) {
      throw new ApiError(500, "food_diary_target_save_failed", "Não foi possível salvar a meta calórica.");
    }

    return data;
  }

  async findCurrentTargetForDate(
    studentUserId: string,
    dateString: string,
  ): Promise<DailyCalorieTargetRecord | null> {
    const { data, error } = await this.supabase
      .from("daily_calorie_targets")
      .select("*")
      .eq("student_user_id", studentUserId)
      .lte("effective_from", dateString)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw DB_QUERY_FAILED;
    }

    return data;
  }

  async listTargetsEffectiveUpTo(
    studentUserId: string,
    dateString: string,
  ): Promise<DailyCalorieTargetRecord[]> {
    const { data, error } = await this.supabase
      .from("daily_calorie_targets")
      .select("*")
      .eq("student_user_id", studentUserId)
      .lte("effective_from", dateString)
      .order("effective_from", { ascending: false });

    if (error) {
      throw DB_QUERY_FAILED;
    }

    return data ?? [];
  }

  /* ─── activity_energy_entries ─── */

  async createActivity(input: CreateActivityDbInput): Promise<ActivityEnergyEntryRecord> {
    const payload: Database["public"]["Tables"]["activity_energy_entries"]["Insert"] = {
      student_user_id: input.studentUserId,
      source: input.source,
      workout_session_id: input.workoutSessionId,
      label: input.label,
      kcal_burned: input.kcalBurned,
      logged_at: input.loggedAt,
    };

    const { data, error } = await this.supabase
      .from("activity_energy_entries")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw new ApiError(500, "food_diary_activity_create_failed", "Não foi possível salvar a atividade.");
    }

    return data;
  }

  async deleteActivityForStudent(activityId: string, studentUserId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("activity_energy_entries")
      .delete()
      .eq("id", activityId)
      .eq("student_user_id", studentUserId)
      .select("id");

    if (error) {
      throw new ApiError(500, "food_diary_activity_delete_failed", "Não foi possível excluir a atividade.");
    }

    return (data ?? []).length > 0;
  }

  async listActivitiesInRange(
    studentUserId: string,
    startIso: string,
    endIso: string,
  ): Promise<ActivityEnergyEntryRecord[]> {
    const { data, error } = await this.supabase
      .from("activity_energy_entries")
      .select("*")
      .eq("student_user_id", studentUserId)
      .gte("logged_at", startIso)
      .lt("logged_at", endIso)
      .order("logged_at", { ascending: true });

    if (error) {
      throw DB_QUERY_FAILED;
    }

    return data ?? [];
  }

  /* ─── food_diary_plans ─── */

  async findActivePlan(userId: string): Promise<FoodDiaryPlanRecord | null> {
    const { data, error } = await this.supabase
      .from("food_diary_plans")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (error) {
      throw DB_QUERY_FAILED;
    }

    return data;
  }

  async upsertPlanVersioned(input: UpsertPlanDbInput): Promise<FoodDiaryPlanRecord> {
    // Atomic (RPC): archive+insert on a later-day change, update-in-place same day.
    const { data, error } = await this.supabase.rpc("food_diary_upsert_plan", {
      p_user_id: input.userId,
      p_today: input.today,
      p_goal: input.goal,
      p_tmb_kcal: input.tmbKcal,
      p_tmb_source: input.tmbSource,
      p_tmb_input: input.tmbInput as unknown as Database["public"]["Functions"]["food_diary_upsert_plan"]["Args"]["p_tmb_input"],
      p_scan_id: input.scanId,
      p_routine_level: input.routineLevel,
      p_routine_factor: input.routineFactor,
      p_planned_balance_kcal: input.plannedBalanceKcal,
      p_tolerance_kcal: input.toleranceKcal,
    });

    if (error || !data) {
      throw DB_QUERY_FAILED;
    }

    return data;
  }

  async listPlansEffectiveUpTo(
    userId: string,
    dateString: string,
  ): Promise<FoodDiaryPlanRecord[]> {
    const { data, error } = await this.supabase
      .from("food_diary_plans")
      .select("*")
      .eq("user_id", userId)
      .lte("effective_from", dateString)
      .order("effective_from", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw DB_QUERY_FAILED;
    }

    return data ?? [];
  }

  async findLatestScanTmbForUser(userId: string): Promise<LatestScanTmb | null> {
    const { data, error } = await this.supabase
      .from("scan_analyses")
      .select("id, lean_mass_kg, bmr, body_fat_percent, weight_kg, created_at")
      .eq("student_user_id", userId)
      .eq("status", "completed")
      .order("processed_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw DB_QUERY_FAILED;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      leanMassKg: data.lean_mass_kg,
      bmr: data.bmr,
      bodyFatPercent: data.body_fat_percent,
      weightKg: data.weight_kg,
      createdAt: data.created_at,
    };
  }

  async findStudentProfileWeightKg(userId: string): Promise<number | null> {
    const { data, error } = await this.supabase
      .from("student_profiles")
      .select("weight_kg")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw DB_QUERY_FAILED;
    }

    const weight = data?.weight_kg;

    return typeof weight === "number" && Number.isFinite(weight) ? weight : null;
  }

  /* ─── storage: food-diary-photos (private bucket) ─── */

  async uploadPhotoObject(path: string, body: ArrayBuffer, contentType: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(FOOD_DIARY_PHOTOS_BUCKET)
      .upload(path, body, { contentType, upsert: false });

    if (error) {
      throw STORAGE_FAILED;
    }
  }

  async removePhotoObject(path: string): Promise<void> {
    // Best-effort: a missing object is not an error for our flow.
    await this.supabase.storage.from(FOOD_DIARY_PHOTOS_BUCKET).remove([path]);
  }

  async createSignedReadUrl(path: string, ttlSeconds: number): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(FOOD_DIARY_PHOTOS_BUCKET)
      .createSignedUrl(path, ttlSeconds);

    if (error || !data?.signedUrl) {
      throw STORAGE_FAILED;
    }

    return data.signedUrl;
  }
}
