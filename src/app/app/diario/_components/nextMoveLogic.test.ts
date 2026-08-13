import assert from "node:assert/strict";
import { test } from "node:test";

import { computeNextMove } from "@/app/app/diario/_components/nextMoveLogic";
import type { FoodDiaryTodayResponse } from "@/bff/modules/foodDiary/types";
import type { FoodDiaryHud } from "@/bff/modules/foodDiary/types/plan";

function mkToday(mealsCount: number, consumedProteinG = 999): FoodDiaryTodayResponse {
  return {
    meals: Array.from({ length: mealsCount }, () => ({})),
    totals: { consumedProteinG },
  } as unknown as FoodDiaryTodayResponse;
}

function mkHud(overrides: Partial<FoodDiaryHud>): FoodDiaryHud {
  return {
    goal: "maintain",
    status: "within",
    bandLowKcal: 1600,
    bandHighKcal: 2000,
    consumedKcal: 1800,
    alvoCentralKcal: 1800,
    kcalToBandTop: 200,
    kcalOverBandTop: 0,
    ...overrides,
  } as FoodDiaryHud;
}

test("zero meals → the only move is to start; no secondary", () => {
  const result = computeNextMove(mkToday(0), mkHud({ status: "below", consumedKcal: 0 }));
  assert.equal(result.primary.iconKey, "utensils");
  assert.match(result.primary.title, /primeira refeição/i);
  assert.equal(result.secondary, undefined);
});

test("lose/below → how many kcal to ENTER the band (bandLow − consumed)", () => {
  const result = computeNextMove(mkToday(2), mkHud({ goal: "lose", status: "below", bandLowKcal: 1600, consumedKcal: 1000 }));
  assert.equal(result.primary.iconKey, "utensils");
  assert.equal(result.primary.title, "Faltam 600 kcal para entrar na sua faixa");
});

test("maintain/below → same 'entrar na faixa' framing", () => {
  const result = computeNextMove(mkToday(1), mkHud({ goal: "maintain", status: "below", bandLowKcal: 1600, consumedKcal: 1200 }));
  assert.equal(result.primary.title, "Faltam 400 kcal para entrar na sua faixa");
});

test("gain/below → energy is welcome: how much still FITS (kcalToBandTop)", () => {
  const result = computeNextMove(mkToday(2), mkHud({ goal: "gain", status: "below", kcalToBandTop: 500, consumedKcal: 1200 }));
  assert.match(result.primary.title, /Ainda cabem 500 kcal/);
});

test("within → reassuring 'dentro da faixa' with room-until-top detail", () => {
  const result = computeNextMove(mkToday(3), mkHud({ status: "within", kcalToBandTop: 150 }));
  assert.equal(result.primary.iconKey, "check");
  assert.match(result.primary.title, /dentro da sua faixa/i);
  assert.match(result.primary.detail ?? "", /150 kcal até o topo/);
});

test("above → over-the-top amount + a non-punitive next-day nudge, no secondary", () => {
  const result = computeNextMove(
    mkToday(3, 0), // low protein on purpose — must still NOT add a secondary when above
    mkHud({ status: "above", kcalOverBandTop: 320 }),
  );
  assert.equal(result.primary.iconKey, "moon");
  assert.match(result.primary.title, /320 kcal acima da faixa/);
  assert.equal(result.secondary, undefined);
});

test("protein secondary appears only with a real gap (>20g) and meals logged", () => {
  const bigGap = computeNextMove(
    mkToday(2, 20), // target ~112g for 1800 kcal → gap ~92g
    mkHud({ status: "within" }),
  );
  assert.equal(bigGap.secondary?.iconKey, "egg");
  assert.match(bigGap.secondary?.title ?? "", /proteína/);

  const noGap = computeNextMove(mkToday(2, 999), mkHud({ status: "within" }));
  assert.equal(noGap.secondary, undefined);
});

test("all nine goal×status combinations return a primary move", () => {
  for (const goal of ["lose", "maintain", "gain"] as const) {
    for (const status of ["below", "within", "above"] as const) {
      const result = computeNextMove(mkToday(2), mkHud({ goal, status }));
      assert.ok(result.primary.title.length > 0, `${goal}/${status} must yield a primary`);
      assert.ok(["utensils", "check", "moon", "egg"].includes(result.primary.iconKey));
    }
  }
});
