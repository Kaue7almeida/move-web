import type { Database } from "@/bff/core/supabase/database.types";
import type {
  ConsumptionStatus,
  GoalKind,
  RoutineLevel,
  TmbSource,
} from "@/bff/modules/foodDiary/planEnergy";

/* ─── Persistence ───────────────────────────────────────────────────────────── */

export type FoodDiaryPlanRecord = Database["public"]["Tables"]["food_diary_plans"]["Row"];

/** Snapshot of the inputs used to derive the TMB — stored for audit / no silent recompute. */
export type PlanTmbSnapshot = {
  leanMassKg: number | null;
  bodyFatPercent: number | null;
  weightKg: number | null;
};

/* ─── Service input (camelCase) ─────────────────────────────────────────────── */

export type UpsertPlanInput = {
  goal: GoalKind;
  tmbSource: TmbSource;
  /** Required when tmbSource = "manual". */
  tmbKcal?: number;
  /** Used when tmbSource = "scan" (from the scan) or provided directly. */
  leanMassKg?: number;
  /** Used when tmbSource = "body_fat". */
  bodyFatPercent?: number;
  weightKg?: number;
  /** Optional link to the MoveScan the TMB came from. */
  scanId?: string | null;
  routineLevel: RoutineLevel;
  /** déficit < 0 · manutenção = 0 · superávit > 0. Defaults to the goal suggestion. */
  plannedBalanceKcal?: number;
  /** Band half-width. Defaults to a suggestion derived from the target. */
  toleranceKcal?: number;
  /** IANA time zone used to resolve the version's effective_from (local day). */
  timeZone?: string;
};

/* ─── API views (camelCase) ─────────────────────────────────────────────────── */

export type FoodDiaryPlanView = {
  id: string;
  status: string;
  /** Local calendar day (YYYY-MM-DD) this plan version started applying. */
  effectiveFrom: string;
  goal: GoalKind;
  goalLabel: string;
  tmbKcal: number;
  tmbSource: TmbSource;
  tmbSnapshot: PlanTmbSnapshot;
  scanId: string | null;
  routineLevel: RoutineLevel;
  routineLabel: string;
  routineFactor: number;
  plannedBalanceKcal: number;
  toleranceKcal: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * The daily HUD — the "estou seguindo meu objetivo hoje?" answer. Computed from
 * the active plan + the day's activities/consumption via the pure energy engine.
 */
export type FoodDiaryHud = {
  goal: GoalKind;
  goalLabel: string;
  missionLabel: string;
  status: ConsumptionStatus;
  statusLabel: string;
  tmbKcal: number;
  routineFactor: number;
  gastoBaseKcal: number;
  gastoDiaKcal: number;
  alvoCentralKcal: number;
  plannedBalanceKcal: number;
  bandLowKcal: number;
  bandHighKcal: number;
  consumedKcal: number;
  burnedKcal: number;
  /** kcal até o topo da faixa (0 se já passou). */
  kcalToBandTop: number;
  /** kcal acima do topo da faixa (0 se dentro/abaixo). */
  kcalOverBandTop: number;
};

/**
 * Best TMB starting point for onboarding: prefers the latest completed MoveScan.
 * A trainer-only account (no scans) gets a null suggestion and uses body-fat/manual.
 */
export type TmbSuggestion = {
  hasScan: boolean;
  scanId: string | null;
  scanCreatedAt: string | null;
  tmbKcal: number | null;
  leanMassKg: number | null;
  bodyFatPercent: number | null;
  weightKg: number | null;
  /** True when a completed scan exists that is newer than the active plan's scan. */
  hasNewerScanThanPlan: boolean;
};

export type FoodDiaryPlanResponse = {
  plan: FoodDiaryPlanView | null;
  tmbSuggestion: TmbSuggestion;
};

/* ─── Repository DB inputs ──────────────────────────────────────────────────── */

/** Input for the atomic versioned upsert RPC (food_diary_upsert_plan). */
export type UpsertPlanDbInput = {
  userId: string;
  /** Local calendar day (YYYY-MM-DD) the new/updated version takes effect. */
  today: string;
  goal: string;
  tmbKcal: number;
  tmbSource: string;
  tmbInput: PlanTmbSnapshot;
  scanId: string | null;
  routineLevel: string;
  routineFactor: number;
  plannedBalanceKcal: number;
  toleranceKcal: number;
};

/** Minimal projection of the latest completed scan, for the TMB suggestion. */
export type LatestScanTmb = {
  id: string;
  leanMassKg: number | null;
  bmr: number | null;
  bodyFatPercent: number | null;
  weightKg: number | null;
  createdAt: string;
};
