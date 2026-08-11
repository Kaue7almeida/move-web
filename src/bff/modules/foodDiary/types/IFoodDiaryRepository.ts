import type { Json } from "@/bff/core/supabase/database.types";
import type {
  ActivityEnergyEntryRecord,
  DailyCalorieTargetRecord,
  FoodDiaryEntryRecord,
  FoodDiaryItemRecord,
} from "@/bff/modules/foodDiary/types";

export type CreateEntryDraftDbInput = {
  studentUserId: string;
  mealType: string;
  loggedAt: string;
  containerSize: string | null;
  mealOrigin: string | null;
  preparationHint: string | null;
  hiddenIngredients: Json;
  isSharedPortion: boolean;
  userNotes: string | null;
  idempotencyKey: string | null;
};

export type UpsertCalorieTargetDbInput = {
  studentUserId: string;
  effectiveFrom: string;
  targetKcal: number;
  proteinPercent: number;
  carbPercent: number;
  fatPercent: number;
  source: string;
};

export type CreateActivityDbInput = {
  studentUserId: string;
  source: string;
  workoutSessionId: string | null;
  label: string | null;
  kcalBurned: number;
  loggedAt: string;
};

export interface IFoodDiaryRepository {
  // ── food_diary_entries ──
  createEntryDraft(input: CreateEntryDraftDbInput): Promise<FoodDiaryEntryRecord>;
  findEntryByIdForStudent(
    entryId: string,
    studentUserId: string,
  ): Promise<FoodDiaryEntryRecord | null>;
  findEntryByIdempotencyKey(
    studentUserId: string,
    idempotencyKey: string,
  ): Promise<FoodDiaryEntryRecord | null>;
  /** Deletes an entry owned by the student. Returns true when a row was removed. */
  deleteEntryForStudent(entryId: string, studentUserId: string): Promise<boolean>;
  /** Confirmed entries with logged_at in [startIso, endIso), owned by the student. */
  listConfirmedEntriesInRange(
    studentUserId: string,
    startIso: string,
    endIso: string,
  ): Promise<FoodDiaryEntryRecord[]>;

  // ── food_diary_items ──
  listItemsByEntryId(entryId: string): Promise<FoodDiaryItemRecord[]>;
  listItemsByEntryIds(entryIds: string[]): Promise<FoodDiaryItemRecord[]>;

  // ── daily_calorie_targets ──
  upsertTarget(input: UpsertCalorieTargetDbInput): Promise<DailyCalorieTargetRecord>;
  /** Latest target with effective_from <= dateString for the student, or null. */
  findCurrentTargetForDate(
    studentUserId: string,
    dateString: string,
  ): Promise<DailyCalorieTargetRecord | null>;
  /** All targets with effective_from <= dateString, ordered effective_from desc. */
  listTargetsEffectiveUpTo(
    studentUserId: string,
    dateString: string,
  ): Promise<DailyCalorieTargetRecord[]>;

  // ── activity_energy_entries ──
  createActivity(input: CreateActivityDbInput): Promise<ActivityEnergyEntryRecord>;
  /** Deletes an activity owned by the student. Returns true when a row was removed. */
  deleteActivityForStudent(activityId: string, studentUserId: string): Promise<boolean>;
  listActivitiesInRange(
    studentUserId: string,
    startIso: string,
    endIso: string,
  ): Promise<ActivityEnergyEntryRecord[]>;
}
