import assert from "node:assert/strict";
import { test } from "node:test";

import {
  coerceBalanceToGoal,
  resolvePlanInputs,
  selectPlanVersionForDay,
} from "@/bff/modules/foodDiary/planBuild";
import { estimateTmbFromBodyFat, estimateTmbFromLeanMass } from "@/bff/modules/foodDiary/planEnergy";
import type { LatestScanTmb, UpsertPlanInput } from "@/bff/modules/foodDiary/types/plan";

function base(overrides: Partial<UpsertPlanInput> = {}): UpsertPlanInput {
  return { goal: "maintain", tmbSource: "manual", tmbKcal: 1700, routineLevel: "light", ...overrides };
}

test("manual + lose → typed TMB, deficit suggestion", () => {
  const r = resolvePlanInputs(base({ goal: "lose", tmbSource: "manual", tmbKcal: 1700 }), null);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.tmbKcal, 1700);
    assert.ok(r.value.plannedBalanceKcal < 0);
    assert.ok(r.value.toleranceKcal > 0);
  }
});

test("maintain → planned balance 0; gain → surplus", () => {
  const m = resolvePlanInputs(base({ goal: "maintain" }), null);
  const g = resolvePlanInputs(base({ goal: "gain" }), null);
  assert.ok(m.ok && m.value.plannedBalanceKcal === 0);
  assert.ok(g.ok && g.value.plannedBalanceKcal > 0);
});

test("body_fat → TMB derived from weight + body-fat via the single formula", () => {
  const r = resolvePlanInputs(
    base({ tmbSource: "body_fat", weightKg: 80, bodyFatPercent: 20, tmbKcal: undefined }),
    null,
  );
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.value.tmbKcal, estimateTmbFromBodyFat(80, 20));
    assert.equal(r.value.tmbInput.weightKg, 80);
    assert.equal(r.value.tmbInput.bodyFatPercent, 20);
    assert.equal(r.value.scanId, null);
  }
});

test("scan → uses the scan's lean mass; client tmbKcal is ignored", () => {
  const scan: LatestScanTmb = {
    id: "scan-9",
    leanMassKg: 62,
    bmr: 9999, // wrong on purpose — lean-mass formula must win
    bodyFatPercent: 18,
    weightKg: 78,
    createdAt: "2026-08-10T00:00:00.000Z",
  };
  const r = resolvePlanInputs(base({ tmbSource: "scan", tmbKcal: 1 }), scan);
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.value.tmbKcal, estimateTmbFromLeanMass(62));
    assert.equal(r.value.scanId, "scan-9");
  }
});

test("scan → falls back to the scan bmr when lean mass is absent", () => {
  const scan: LatestScanTmb = {
    id: "s",
    leanMassKg: null,
    bmr: 1580,
    bodyFatPercent: null,
    weightKg: 70,
    createdAt: "2026-08-10T00:00:00.000Z",
  };
  const r = resolvePlanInputs(base({ tmbSource: "scan" }), scan);
  assert.ok(r.ok && r.value.tmbKcal === 1580);
});

test("scan source with no completed scan is rejected", () => {
  const r = resolvePlanInputs(base({ tmbSource: "scan" }), null);
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.code, "food_diary_plan_no_scan");
  }
});

test("invalid TMB (0 / absurd) is rejected", () => {
  assert.equal(resolvePlanInputs(base({ tmbSource: "manual", tmbKcal: 0 }), null).ok, false);
  assert.equal(resolvePlanInputs(base({ tmbSource: "manual", tmbKcal: 50000 }), null).ok, false);
});

test("explicit planned balance and tolerance are honored (goal-compatible)", () => {
  const r = resolvePlanInputs(base({ goal: "lose", plannedBalanceKcal: -250, toleranceKcal: 200 }), null);
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.value.plannedBalanceKcal, -250);
    assert.equal(r.value.toleranceKcal, 200);
  }
});

test("goal invariant: contradictory balance is coerced, never persisted as-is", () => {
  assert.equal(coerceBalanceToGoal("lose", 200), 0); // lose can't be a surplus
  assert.equal(coerceBalanceToGoal("lose", -300), -300);
  assert.equal(coerceBalanceToGoal("maintain", 150), 0); // maintain must be exactly 0
  assert.equal(coerceBalanceToGoal("maintain", -150), 0);
  assert.equal(coerceBalanceToGoal("gain", -200), 0); // gain can't be a deficit
  assert.equal(coerceBalanceToGoal("gain", 300), 300);
});

test("resolvePlanInputs applies the goal invariant end-to-end", () => {
  // lose with an explicit surplus → coerced to a deficit-or-zero.
  const r = resolvePlanInputs(base({ goal: "lose", plannedBalanceKcal: 500 }), null);
  assert.ok(r.ok);
  if (r.ok) {
    assert.ok(r.value.plannedBalanceKcal <= 0);
  }

  const m = resolvePlanInputs(base({ goal: "maintain", plannedBalanceKcal: -400 }), null);
  assert.ok(m.ok && m.value.plannedBalanceKcal === 0);
});

test("plan versioning: the version effective on each day is selected (old plan preserved)", () => {
  // Two versions, ordered effective_from desc (as the repo returns them).
  const plans = [
    { effective_from: "2026-08-10", goal: "lose" },
    { effective_from: "2026-08-05", goal: "gain" },
  ];

  // A day under the OLD version still uses the old plan (history preserved).
  assert.equal(selectPlanVersionForDay(plans, "2026-08-07")?.goal, "gain");
  // A day under the NEW version uses the new plan.
  assert.equal(selectPlanVersionForDay(plans, "2026-08-11")?.goal, "lose");
  assert.equal(selectPlanVersionForDay(plans, "2026-08-10")?.goal, "lose");
  // Before any plan existed → null (history marks the day "incomplete").
  assert.equal(selectPlanVersionForDay(plans, "2026-08-01"), null);
});
