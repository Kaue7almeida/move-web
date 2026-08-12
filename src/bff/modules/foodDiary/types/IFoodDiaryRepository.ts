import type { Json } from "@/bff/core/supabase/database.types";
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

export type SetEntryPhotoDbInput = {
  entryId: string;
  studentUserId: string;
  storagePath: string;
  contentType: string;
};

export type FinalizeEntryAnalysisDbInput = {
  status: "completed" | "rejected" | "failed";
  aiResult: Json;
  aiModel: string | null;
  confidence: number | null;
  qualityOverall: string | null;
  needsRetake: boolean;
  failureReason: string | null;
  estimatedTotalKcal: number | null;
  estimatedTotalProteinG: number | null;
  estimatedTotalCarbG: number | null;
  estimatedTotalFatG: number | null;
  estimatedTotalFiberG: number | null;
  analyzedAt: string;
};

export type CreateItemDbInput = {
  entryId: string;
  position: number;
  name: string;
  preparation: string | null;
  category: string | null;
  identification: string;
  alternatives: Json;
  gramsEstimated: number;
  gramsConfirmed: number | null;
  householdMeasure: string | null;
  confidence: number | null;
  isPartiallyHidden: boolean;
  isUserAdded: boolean;
  nutritionSource: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbPer100g: number;
  fatPer100g: number;
  fiberPer100g: number | null;
  aiItemPayload: Json;
};

export type UpdateItemDbInput = {
  itemId: string;
  entryId: string;
  gramsConfirmed?: number | null;
  isRemoved?: boolean;
  name?: string;
  preparation?: string | null;
};

export type ConfirmEntryDbInput = {
  confirmedTotalKcal: number;
  confirmedTotalProteinG: number;
  confirmedTotalCarbG: number;
  confirmedTotalFatG: number;
  confirmedTotalFiberG: number;
  confirmedAt: string;
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
  /** Count of completed+confirmed entries with logged_at in [startIso, endIso). */
  countConcludedEntriesInRange(
    studentUserId: string,
    startIso: string,
    endIso: string,
  ): Promise<number>;
  /** Persists the photo path/content-type on an entry owned by the student. */
  setEntryPhoto(input: SetEntryPhotoDbInput): Promise<FoodDiaryEntryRecord | null>;
  /**
   * Atomically flips a draft/rejected/failed entry (owned by the student) to
   * processing and stamps processing_started_at. Returns the row, or null when no
   * row matched (already processing/completed/confirmed, or not owned).
   */
  transitionToProcessing(
    entryId: string,
    studentUserId: string,
  ): Promise<FoodDiaryEntryRecord | null>;
  finalizeEntryAnalysis(
    entryId: string,
    input: FinalizeEntryAnalysisDbInput,
  ): Promise<FoodDiaryEntryRecord>;
  finalizeEntryConfirmation(
    entryId: string,
    input: ConfirmEntryDbInput,
  ): Promise<FoodDiaryEntryRecord>;

  // ── food_diary_items ──
  listItemsByEntryId(entryId: string): Promise<FoodDiaryItemRecord[]>;
  listItemsByEntryIds(entryIds: string[]): Promise<FoodDiaryItemRecord[]>;
  /** Replaces all items of an entry (delete existing, insert the new batch). */
  replaceEntryItems(entryId: string, items: CreateItemDbInput[]): Promise<void>;
  insertManualItem(input: CreateItemDbInput): Promise<FoodDiaryItemRecord>;
  updateItemForEntry(input: UpdateItemDbInput): Promise<FoodDiaryItemRecord | null>;

  // ── daily_calorie_targets ──
  upsertTarget(input: UpsertCalorieTargetDbInput): Promise<DailyCalorieTargetRecord>;
  findCurrentTargetForDate(
    studentUserId: string,
    dateString: string,
  ): Promise<DailyCalorieTargetRecord | null>;
  listTargetsEffectiveUpTo(
    studentUserId: string,
    dateString: string,
  ): Promise<DailyCalorieTargetRecord[]>;

  // ── activity_energy_entries ──
  createActivity(input: CreateActivityDbInput): Promise<ActivityEnergyEntryRecord>;
  deleteActivityForStudent(activityId: string, studentUserId: string): Promise<boolean>;
  listActivitiesInRange(
    studentUserId: string,
    startIso: string,
    endIso: string,
  ): Promise<ActivityEnergyEntryRecord[]>;

  // ── food_diary_plans (versioned) ──
  /** The user's single ACTIVE plan version, or null (ownership by profiles.id). */
  findActivePlan(userId: string): Promise<FoodDiaryPlanRecord | null>;
  /**
   * Atomic versioned upsert (RPC): first plan → insert; same-day edit → update
   * in place; later-day edit → archive current + insert new active version.
   */
  upsertPlanVersioned(input: UpsertPlanDbInput): Promise<FoodDiaryPlanRecord>;
  /**
   * All plan versions (active + archived) with effective_from <= dateString,
   * ordered effective_from desc — so History can pick the version valid per day.
   */
  listPlansEffectiveUpTo(userId: string, dateString: string): Promise<FoodDiaryPlanRecord[]>;
  /** Latest completed MoveScan for the user (for the TMB suggestion), or null. */
  findLatestScanTmbForUser(userId: string): Promise<LatestScanTmb | null>;

  // ── storage: food-diary-photos (private bucket) ──
  uploadPhotoObject(path: string, body: ArrayBuffer, contentType: string): Promise<void>;
  removePhotoObject(path: string): Promise<void>;
  createSignedReadUrl(path: string, ttlSeconds: number): Promise<string>;
}
