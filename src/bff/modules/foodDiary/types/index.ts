import type { Database, Json } from "@/bff/core/supabase/database.types";

/* ─── Persistence records (snake_case, from DB) ─────────────────────────────── */

export type FoodDiaryEntryRecord = Database["public"]["Tables"]["food_diary_entries"]["Row"];
export type FoodDiaryItemRecord = Database["public"]["Tables"]["food_diary_items"]["Row"];
export type DailyCalorieTargetRecord =
  Database["public"]["Tables"]["daily_calorie_targets"]["Row"];
export type ActivityEnergyEntryRecord =
  Database["public"]["Tables"]["activity_energy_entries"]["Row"];

/* ─── Domain enums ──────────────────────────────────────────────────────────── */

export type FoodDiaryStatus =
  | "draft"
  | "processing"
  | "completed"
  | "confirmed"
  | "rejected"
  | "failed"
  | "abandoned";

export type MealType = "cafe_da_manha" | "almoco" | "lanche" | "jantar" | "extra";
export type ContainerSize = "pequeno" | "medio" | "grande";
export type MealOrigin = "caseiro" | "restaurante" | "embalado";
export type NutritionSource = "ai_estimated" | "manual" | "taco" | "usda";
export type CalorieTargetSource = "manual" | "suggested" | "estimated_from_scan" | "trainer";
export type ActivityEnergySource = "manual" | "workout_session";

/* ─── Service inputs (camelCase) ────────────────────────────────────────────── */

export type UpsertCalorieTargetInput = {
  targetKcal: number;
  proteinPercent?: number;
  carbPercent?: number;
  fatPercent?: number;
  source?: CalorieTargetSource;
  /** YYYY-MM-DD. Defaults to the current diary day (server UTC). */
  effectiveFrom?: string;
};

export type CreateActivityInput = {
  label?: string;
  kcalBurned: number;
  /** ISO timestamp. Defaults to now. */
  loggedAt?: string;
};

export type CreateEntryDraftInput = {
  mealType: MealType;
  /** ISO timestamp the meal counts under. Defaults to now. */
  loggedAt?: string;
  containerSize?: ContainerSize;
  mealOrigin?: MealOrigin;
  preparationHint?: string;
  hiddenIngredients?: string[];
  isSharedPortion?: boolean;
  userNotes?: string;
  idempotencyKey?: string;
};

/* ─── API response shapes (camelCase) ───────────────────────────────────────── */

export type CalorieTargetView = {
  id: string;
  effectiveFrom: string;
  targetKcal: number;
  proteinPercent: number;
  carbPercent: number;
  fatPercent: number;
  source: string;
};

export type FoodDiaryItemView = {
  id: string;
  entryId: string;
  position: number;
  name: string;
  preparation: string | null;
  category: string | null;
  gramsEstimated: number;
  gramsConfirmed: number | null;
  householdMeasure: string | null;
  confidence: number | null;
  isPartiallyHidden: boolean;
  isUserAdded: boolean;
  isRemoved: boolean;
  nutritionSource: string;
  nutritionReferenceId: string | null;
  kcalPer100g: number;
  proteinPer100g: number;
  carbPer100g: number;
  fatPer100g: number;
  fiberPer100g: number | null;
};

export type EntryTotals = {
  kcal: number | null;
  proteinG: number | null;
  carbG: number | null;
  fatG: number | null;
  fiberG: number | null;
};

/**
 * Entry view intentionally omits the private photo storage path: the storage
 * layer (upload + signed URLs) is out of scope for this foundation task, and the
 * path must never be exposed raw to the client.
 */
export type FoodDiaryEntryView = {
  id: string;
  studentUserId: string;
  status: FoodDiaryStatus;
  mealType: string;
  loggedAt: string;
  containerSize: string | null;
  mealOrigin: string | null;
  preparationHint: string | null;
  hiddenIngredients: Json;
  isSharedPortion: boolean;
  userNotes: string | null;
  confidence: number | null;
  qualityOverall: string | null;
  needsRetake: boolean;
  failureReason: string | null;
  estimatedTotals: EntryTotals;
  confirmedTotals: EntryTotals;
  processingStartedAt: string | null;
  analyzedAt: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: FoodDiaryItemView[];
};

export type ActivityEnergyView = {
  id: string;
  source: string;
  label: string | null;
  kcalBurned: number;
  loggedAt: string;
  workoutSessionId: string | null;
};

export type DayTotals = {
  consumedKcal: number;
  consumedProteinG: number;
  consumedCarbG: number;
  consumedFatG: number;
  consumedFiberG: number;
  burnedKcal: number;
  /** target + burned − consumed, or null when no target is in force for the day. */
  remainingKcal: number | null;
};

export type FoodDiaryTodayResponse = {
  /** The diary day these data belong to (YYYY-MM-DD, server UTC unless overridden). */
  date: string;
  target: CalorieTargetView | null;
  /** Confirmed meals of the day (only confirmed entries feed the diary). */
  meals: FoodDiaryEntryView[];
  activities: ActivityEnergyView[];
  totals: DayTotals;
};

export type FoodDiaryHistoryDay = {
  date: string;
  consumedKcal: number;
  burnedKcal: number;
  targetKcal: number | null;
  /** consumed − (target + burned), or null when no target is in force. */
  balanceKcal: number | null;
};

export type FoodDiaryHistoryResponse = {
  /** Chronological (oldest → newest), 7 days ending at the requested day. */
  days: FoodDiaryHistoryDay[];
};

export type FoodDiaryEntryResponse = { entry: FoodDiaryEntryView };
export type CalorieTargetResponse = { target: CalorieTargetView };
export type ActivityEnergyResponse = { activity: ActivityEnergyView };
export type FoodDiaryDeleteResponse = { success: true };
