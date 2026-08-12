import assert from "node:assert/strict";
import { test } from "node:test";

import {
  classifyConsumption,
  computeEnergyPlan,
  estimateTmbFromBodyFat,
  estimateTmbFromLeanMass,
  kcalOverBandTop,
  kcalToBandTop,
  leanMassFromBodyFat,
  ROUTINE_FACTORS,
  safeRoutineFactor,
  suggestedPlannedBalance,
} from "@/bff/modules/foodDiary/planEnergy";

test("TMB uses the single MoveScan formula: 370 + 21.6 × lean mass", () => {
  assert.equal(estimateTmbFromLeanMass(60), Math.round(370 + 21.6 * 60)); // 1666
  assert.equal(estimateTmbFromLeanMass(0), 0);
  assert.equal(estimateTmbFromLeanMass(-5), 0);
});

test("lean mass from body fat, then TMB reuses the same formula", () => {
  assert.equal(leanMassFromBodyFat(80, 20), 64); // 80 * 0.8
  assert.equal(estimateTmbFromBodyFat(80, 20), estimateTmbFromLeanMass(64));
  // guard rails
  assert.equal(leanMassFromBodyFat(80, 100), 0);
  assert.equal(leanMassFromBodyFat(0, 20), 0);
});

test("routine factors exclude structured training (avoid double count) and are ordered", () => {
  assert.ok(ROUTINE_FACTORS.sedentary < ROUTINE_FACTORS.light);
  assert.ok(ROUTINE_FACTORS.light < ROUTINE_FACTORS.moderate);
  assert.ok(ROUTINE_FACTORS.moderate < ROUTINE_FACTORS.high);
  // deliberately below the classic 1.55/1.725/1.9 multipliers, since logged
  // workouts are added on TOP rather than baked into the factor.
  assert.ok(ROUTINE_FACTORS.high <= 1.5);
  assert.equal(safeRoutineFactor("garbage"), ROUTINE_FACTORS.sedentary);
});

test("energy chain: gastoBase → gastoDia → alvoCentral → band", () => {
  const plan = computeEnergyPlan({
    tmbKcal: 1700,
    routineLevel: "light", // factor 1.3
    activitiesKcal: 300,
    plannedBalanceKcal: -400, // deficit
    toleranceKcal: 150,
  });

  assert.equal(plan.gastoBaseKcal, Math.round(1700 * 1.3)); // 2210
  assert.equal(plan.gastoDiaKcal, 2210 + 300); // 2510
  assert.equal(plan.alvoCentralKcal, 2510 - 400); // 2110
  assert.equal(plan.bandLowKcal, 2110 - 150); // 1960
  assert.equal(plan.bandHighKcal, 2110 + 150); // 2260
});

test("logged activity raises gastoDia and shifts the band up, keeping the same planned balance", () => {
  const base = computeEnergyPlan({ tmbKcal: 1700, routineLevel: "light", activitiesKcal: 0, plannedBalanceKcal: -400, toleranceKcal: 150 });
  const withRun = computeEnergyPlan({ tmbKcal: 1700, routineLevel: "light", activitiesKcal: 500, plannedBalanceKcal: -400, toleranceKcal: 150 });

  assert.equal(withRun.gastoDiaKcal - base.gastoDiaKcal, 500);
  assert.equal(withRun.alvoCentralKcal - base.alvoCentralKcal, 500); // band moves, deficit unchanged
  assert.equal(withRun.alvoCentralKcal - withRun.gastoDiaKcal, -400);
});

test("goal conventions: lose < 0, maintain = 0, gain > 0", () => {
  assert.ok(suggestedPlannedBalance("lose") < 0);
  assert.equal(suggestedPlannedBalance("maintain"), 0);
  assert.ok(suggestedPlannedBalance("gain") > 0);
});

test("classifyConsumption: below / within / above the band", () => {
  const plan = computeEnergyPlan({ tmbKcal: 1700, routineLevel: "light", activitiesKcal: 0, plannedBalanceKcal: 0, toleranceKcal: 150 });
  // band = [2210-150, 2210+150] = [2060, 2360]
  assert.equal(classifyConsumption(1500, plan), "below");
  assert.equal(classifyConsumption(2200, plan), "within");
  assert.equal(classifyConsumption(2500, plan), "above");
  assert.equal(kcalToBandTop(2000, plan), 360); // 2360 - 2000
  assert.equal(kcalToBandTop(2400, plan), 0);
  assert.equal(kcalOverBandTop(2500, plan), 140); // 2500 - 2360
});

test("tolerance is derived from the target when not provided", () => {
  const plan = computeEnergyPlan({ tmbKcal: 2000, routineLevel: "moderate", activitiesKcal: 0, plannedBalanceKcal: 0 });
  assert.ok(plan.toleranceKcal >= 120 && plan.toleranceKcal <= 300);
  assert.equal(plan.bandHighKcal - plan.alvoCentralKcal, plan.toleranceKcal);
});
