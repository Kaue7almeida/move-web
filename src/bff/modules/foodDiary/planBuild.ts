import {
  estimateTmbFromBodyFat,
  estimateTmbFromLeanMass,
  leanMassFromBodyFat,
  routineFactorFor,
  suggestedPlannedBalance,
  suggestedToleranceKcal,
} from "@/bff/modules/foodDiary/planEnergy";
import type { LatestScanTmb, PlanTmbSnapshot, UpsertPlanInput } from "@/bff/modules/foodDiary/types/plan";

/**
 * PURE resolution of an energy plan's persisted inputs. Given the onboarding
 * input and (for scan-sourced TMB) the latest MoveScan read server-side, derives
 * the values to persist — reusing the single MoveScan TMB formula and the goal
 * suggestions. Never trusts client-provided TMB for scan-sourced plans.
 *
 * Kept out of the service so it stays deterministic and unit-testable.
 */
export type ResolvedPlanInputs = {
  tmbKcal: number;
  tmbSource: string;
  tmbInput: PlanTmbSnapshot;
  scanId: string | null;
  routineLevel: string;
  routineFactor: number;
  plannedBalanceKcal: number;
  toleranceKcal: number;
};

export type ResolvePlanResult =
  | { ok: true; value: ResolvedPlanInputs }
  | { ok: false; code: string; message: string };

export function resolvePlanInputs(
  input: UpsertPlanInput,
  scan: LatestScanTmb | null,
): ResolvePlanResult {
  const routineFactor = routineFactorFor(input.routineLevel);

  let tmbKcal = 0;
  let snapshot: PlanTmbSnapshot = { leanMassKg: null, bodyFatPercent: null, weightKg: null };
  let scanId: string | null = null;

  if (input.tmbSource === "manual") {
    tmbKcal = Math.round(input.tmbKcal ?? 0);
  } else if (input.tmbSource === "body_fat") {
    const weightKg = input.weightKg ?? 0;
    const bodyFatPercent = input.bodyFatPercent ?? 0;
    const leanMassKg = leanMassFromBodyFat(weightKg, bodyFatPercent);
    tmbKcal = estimateTmbFromBodyFat(weightKg, bodyFatPercent);
    snapshot = { leanMassKg: leanMassKg > 0 ? leanMassKg : null, bodyFatPercent, weightKg };
  } else {
    if (!scan) {
      return {
        ok: false,
        code: "food_diary_plan_no_scan",
        message: "Nenhum MoveScan concluído encontrado. Use % de gordura, valor manual ou faça um Scan.",
      };
    }

    const leanMassKg = scan.leanMassKg;
    tmbKcal = leanMassKg && leanMassKg > 0 ? estimateTmbFromLeanMass(leanMassKg) : Math.round(scan.bmr ?? 0);
    snapshot = {
      leanMassKg: leanMassKg ?? null,
      bodyFatPercent: scan.bodyFatPercent ?? null,
      weightKg: scan.weightKg ?? null,
    };
    scanId = scan.id;
  }

  if (tmbKcal <= 0 || tmbKcal > 10000) {
    return {
      ok: false,
      code: "food_diary_plan_invalid_tmb",
      message: "Não foi possível determinar uma TMB válida. Refaça com um Scan, % de gordura ou valor manual.",
    };
  }

  const plannedBalanceKcal = clampBalance(input.plannedBalanceKcal ?? suggestedPlannedBalance(input.goal));
  const baseAlvo = Math.round(tmbKcal * routineFactor) + plannedBalanceKcal;
  const toleranceKcal = clampTolerance(input.toleranceKcal ?? suggestedToleranceKcal(baseAlvo));

  return {
    ok: true,
    value: {
      tmbKcal,
      tmbSource: input.tmbSource,
      tmbInput: snapshot,
      scanId,
      routineLevel: input.routineLevel,
      routineFactor,
      plannedBalanceKcal,
      toleranceKcal,
    },
  };
}

export function clampBalance(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(Math.max(Math.round(value), -3000), 3000);
}

export function clampTolerance(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 150;
  }
  return Math.min(Math.max(Math.round(value), 50), 2000);
}
