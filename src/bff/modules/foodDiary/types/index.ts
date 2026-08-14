import type { Database, Json } from "@/bff/core/supabase/database.types";
import type { FoodDiaryHud, FoodDiaryPlanView } from "@/bff/modules/foodDiary/types/plan";

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

/** Query options for day-scoped reads. timeZone is an IANA zone (e.g. America/Sao_Paulo). */
export type DayQueryOptions = {
  /** Local calendar day the client is viewing (YYYY-MM-DD). Defaults to "today" in timeZone. */
  date?: string;
  /** IANA time zone. Invalid/absent falls back to UTC (safe default). */
  timeZone?: string;
};

export type UpsertCalorieTargetInput = {
  targetKcal: number;
  proteinPercent?: number;
  carbPercent?: number;
  fatPercent?: number;
  source?: CalorieTargetSource;
  /** YYYY-MM-DD. Defaults to the current diary day in timeZone. */
  effectiveFrom?: string;
  /** IANA time zone used to resolve the default effectiveFrom. */
  timeZone?: string;
};

export type CreateActivityInput = {
  label?: string;
  kcalBurned: number;
  /** ISO timestamp. Defaults to now. */
  loggedAt?: string;
};

/** Input do fluxo de estimativa de atividade por descrição (IA + regra determinística). */
export type EstimateActivityRequest = {
  description: string;
  /** Peso informado no fluxo (kg) — usado SÓ para a estimativa; não altera perfil/plano. */
  weightKg?: number;
  /** true quando o usuário confirmou que é atividade EXTRA (não faz parte da rotina). */
  forceExtra?: boolean;
};

export type EntryInputKind = "photo" | "text" | "snack";

export type CreateEntryDraftInput = {
  mealType: MealType;
  /** ISO timestamp the meal counts under. Defaults to now. */
  loggedAt?: string;
  /** How the meal is described: photo (default), free text, or snack. */
  inputKind?: EntryInputKind;
  /** Free-text description for text/snack entries. */
  textDescription?: string;
  containerSize?: ContainerSize;
  mealOrigin?: MealOrigin;
  preparationHint?: string;
  hiddenIngredients?: string[];
  isSharedPortion?: boolean;
  userNotes?: string;
  idempotencyKey?: string;
};

export type AnalyzeEntryInput = {
  /** IANA time zone used to resolve the entry's local day for the daily quota. */
  timeZone?: string;
  /**
   * Text/snack only: when true, a vague description is accepted as a best estimate
   * instead of raising food_diary_needs_clarification again. The UI sets this on the
   * re-analysis after the user answered the single clarification question.
   */
  skipClarification?: boolean;
};

/**
 * A human edit to a detected item during review. Absent fields are left unchanged.
 *
 * Resolving an AMBIGUOUS identity (picking one of the alternatives, or "Outro")
 * is a coherent swap: the client sends the chosen name AND its full per-100g
 * nutrients, plus identification="identified". Sending a nutrient field requires
 * identification="identified" — the backend rejects a nutrient change that leaves
 * the item ambiguous (an inconsistent state).
 */
export type ReviewItemEdit = {
  id: string;
  gramsConfirmed?: number | null;
  isRemoved?: boolean;
  name?: string;
  preparation?: string | null;
  /** Resolution of an ambiguous/unknown identity. Only "identified" is accepted. */
  identification?: "identified";
  kcalPer100g?: number;
  proteinPer100g?: number;
  carbPer100g?: number;
  fatPer100g?: number;
  fiberPer100g?: number | null;
};

/** A manual item added during review (P1 has no TACO/USDA — values come from the payload). */
export type ReviewItemAdd = {
  name: string;
  preparation?: string | null;
  category?: string | null;
  grams: number;
  householdMeasure?: string | null;
  kcalPer100g: number;
  proteinPer100g: number;
  carbPer100g: number;
  fatPer100g: number;
  fiberPer100g?: number | null;
};

export type ReviewEntryInput = {
  items?: ReviewItemEdit[];
  addedItems?: ReviewItemAdd[];
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

/**
 * A plausible identity for an ambiguous item, carrying its OWN complete nutrient
 * profile. Picking it in review swaps the item's whole profile (name + macros) with
 * no second AI call. kcal is derived from macros, same as the item.
 */
export type FoodDiaryItemAlternative = {
  name: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbPer100g: number;
  fatPer100g: number;
  fiberPer100g: number | null;
};

export type FoodDiaryItemView = {
  id: string;
  entryId: string;
  position: number;
  name: string;
  preparation: string | null;
  category: string | null;
  /** Identity certainty: identified | ambiguous | unknown. */
  identification: string;
  /** Complete candidate identities when ambiguous (name + macros); [] otherwise. */
  alternatives: FoodDiaryItemAlternative[];
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
  /** The user's active energy plan (Diário 2.0), or null when not configured yet. */
  plan: FoodDiaryPlanView | null;
  /** The daily HUD ("estou seguindo meu objetivo hoje?"), null without a plan. */
  hud: FoodDiaryHud | null;
  /** Confirmed meals of the day (only confirmed entries feed the diary). */
  meals: FoodDiaryEntryView[];
  activities: ActivityEnergyView[];
  totals: DayTotals;
};

/** below/within/above the band; "incomplete" when no plan version covered the day. */
export type FoodDiaryHistoryStatus = "below" | "within" | "above" | "incomplete";

/**
 * History 2.0 — same energy engine as Today, driven by the plan version that was
 * effective on each day (not the legacy daily_calorie_targets). No "déficit"
 * framing: a day is classified vs. its own target band.
 */
export type FoodDiaryHistoryDay = {
  date: string;
  consumedKcal: number;
  consumedProteinG: number;
  burnedKcal: number;
  status: FoodDiaryHistoryStatus;
  /** The plan goal in force that day, or null when there was no plan. */
  goal: string | null;
  gastoDiaKcal: number | null;
  alvoCentralKcal: number | null;
  bandLowKcal: number | null;
  bandHighKcal: number | null;
  plannedBalanceKcal: number | null;
};

export type FoodDiaryHistoryResponse = {
  /** Chronological (oldest → newest), 7 days ending at the requested day. */
  days: FoodDiaryHistoryDay[];
};

export type FoodDiaryEntryResponse = { entry: FoodDiaryEntryView };
export type FoodDiaryPhotoResponse = {
  entry: FoodDiaryEntryView;
  /** Short-lived signed URL for immediate preview. Never persisted. */
  photoUrl: string;
};
export type CalorieTargetResponse = { target: CalorieTargetView };
export type ActivityEnergyResponse = { activity: ActivityEnergyView };
export type FoodDiaryDeleteResponse = { success: true };
