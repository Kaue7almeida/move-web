import assert from "node:assert/strict";
import { test } from "node:test";

import { homeHeadline } from "@/app/app/diario/_components/diaryHomeHeadline";
import type { FoodDiaryHud } from "@/bff/modules/foodDiary/types/plan";

function mkHud(overrides: Partial<FoodDiaryHud>): FoodDiaryHud {
  return {
    status: "within",
    bandLowKcal: 1600,
    bandHighKcal: 2000,
    consumedKcal: 1800,
    kcalToBandTop: 200,
    kcalOverBandTop: 0,
    ...overrides,
  } as FoodDiaryHud;
}

test("below → bandLow − consumido (nunca kcalToBandTop)", () => {
  const h = homeHeadline(mkHud({ status: "below", bandLowKcal: 3000, consumedKcal: 764, kcalToBandTop: 2436 }));
  assert.equal(h.kind, "below");
  assert.equal(h.value, 2236); // 3000 − 764, e NÃO 2436 (kcalToBandTop)
  assert.match(h.label, /para entrar na sua faixa/);
});

test("within → frase, sem número", () => {
  const h = homeHeadline(mkHud({ status: "within" }));
  assert.equal(h.kind, "within");
  assert.equal(h.value, null);
  assert.match(h.label, /dentro da sua faixa/);
});

test("above → consumido − bandHigh", () => {
  const h = homeHeadline(mkHud({ status: "above", kcalOverBandTop: 320 }));
  assert.equal(h.kind, "above");
  assert.equal(h.value, 320);
  assert.match(h.label, /acima da sua faixa/);
});

test("below nunca fica negativo (consumido acima de bandLow mas ainda 'below' por arredondamento)", () => {
  const h = homeHeadline(mkHud({ status: "below", bandLowKcal: 1600, consumedKcal: 1700 }));
  assert.equal(h.value, 0);
});
