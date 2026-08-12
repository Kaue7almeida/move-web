import assert from "node:assert/strict";
import { test } from "node:test";

import { validateAndNormalizeAnalysis } from "@/bff/modules/foodDiary/analysisValidation";
import type { FoodDiaryAiAnalysis, FoodDiaryAiItem } from "@/bff/modules/foodDiary/types/ai";

function makeItem(overrides: Partial<FoodDiaryAiItem> = {}): FoodDiaryAiItem {
  return {
    name: "Arroz",
    preparation: null,
    category: "carboidrato",
    identification: "identified",
    alternatives: [],
    gramsEstimated: 150,
    householdMeasure: null,
    confidence: 0.9,
    isPartiallyHidden: false,
    kcalPer100g: 130,
    proteinPer100g: 2.5,
    carbPer100g: 28,
    fatPer100g: 0.2,
    fiberPer100g: null,
    uncertainty: null,
    ...overrides,
  };
}

function makeAnalysis(items: FoodDiaryAiItem[]): FoodDiaryAiAnalysis {
  return { qualityOverall: "boa", needsRetake: false, confidence: 0.8, items, observations: [] };
}

test("valid analysis: recomputes kcal from macros (Atwater) and totals", () => {
  const result = validateAndNormalizeAnalysis(makeAnalysis([makeItem()]));
  assert.equal(result.ok, true);

  if (!result.ok) {
    return;
  }

  assert.equal(result.items.length, 1);
  // kcal/100g = 4*2.5 + 4*28 + 9*0.2 = 123.8 (the model's loose 130 is ignored).
  assert.equal(result.items[0].kcalPer100g, 123.8);
  // total kcal = 123.8 * (150/100) = 185.7 → 186.
  assert.equal(result.estimatedTotals.kcal, 186);
});

test("rejects an empty item list", () => {
  const result = validateAndNormalizeAnalysis(makeAnalysis([]));
  assert.equal(result.ok, false);

  if (!result.ok) {
    assert.equal(result.code, "food_diary_analysis_empty");
  }
});

test("rejects non-positive or absurd grams", () => {
  assert.equal(validateAndNormalizeAnalysis(makeAnalysis([makeItem({ gramsEstimated: 0 })])).ok, false);
  assert.equal(validateAndNormalizeAnalysis(makeAnalysis([makeItem({ gramsEstimated: -10 })])).ok, false);
  assert.equal(
    validateAndNormalizeAnalysis(makeAnalysis([makeItem({ gramsEstimated: 999_999 })])).ok,
    false,
  );
});

test("rejects negative or non-finite nutrients", () => {
  assert.equal(validateAndNormalizeAnalysis(makeAnalysis([makeItem({ proteinPer100g: -1 })])).ok, false);
  assert.equal(
    validateAndNormalizeAnalysis(makeAnalysis([makeItem({ fatPer100g: Number.POSITIVE_INFINITY })])).ok,
    false,
  );
});

test("drops exact-duplicate items", () => {
  const result = validateAndNormalizeAnalysis(makeAnalysis([makeItem(), makeItem()]));
  assert.equal(result.ok, true);

  if (result.ok) {
    assert.equal(result.items.length, 1);
  }
});

test("carries per-item ambiguity through normalization (identity ≠ accuracy)", () => {
  const ambiguous = makeItem({
    name: "Carne grelhada",
    identification: "ambiguous",
    alternatives: [" Frango ", "Porco", "", "Carne bovina"],
  });
  const result = validateAndNormalizeAnalysis(makeAnalysis([ambiguous]));
  assert.equal(result.ok, true);

  if (result.ok) {
    assert.equal(result.items[0].identification, "ambiguous");
    // trimmed + empties dropped
    assert.deepEqual(result.items[0].alternatives, ["Frango", "Porco", "Carne bovina"]);
  }
});
