import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "@/bff/core/errors/ApiError";
import type { Database } from "@/bff/core/supabase/database.types";
import type {
  CreateActivityDbInput,
  CreateEntryDraftDbInput,
  IFoodDiaryRepository,
  UpsertCalorieTargetDbInput,
} from "@/bff/modules/foodDiary/types/IFoodDiaryRepository";
import type {
  ActivityEnergyEntryRecord,
  DailyCalorieTargetRecord,
  FoodDiaryEntryRecord,
  FoodDiaryItemRecord,
} from "@/bff/modules/foodDiary/types";

const DB_QUERY_FAILED = new ApiError(
  500,
  "food_diary_query_failed",
  "Falha ao consultar os dados do diário alimentar.",
);

export class FoodDiaryRepository implements IFoodDiaryRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /* ─── food_diary_entries ─── */

  async createEntryDraft(input: CreateEntryDraftDbInput): Promise<FoodDiaryEntryRecord> {
    const payload: Database["public"]["Tables"]["food_diary_entries"]["Insert"] = {
      student_user_id: input.studentUserId,
      status: "draft",
      meal_type: input.mealType,
      logged_at: input.loggedAt,
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
}
