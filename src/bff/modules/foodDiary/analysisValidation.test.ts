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

function makeAnalysis(
  items: FoodDiaryAiItem[],
  overrides: Partial<FoodDiaryAiAnalysis> = {},
): FoodDiaryAiAnalysis {
  return {
    qualityOverall: "boa",
    needsRetake: false,
    needsClarification: false,
    clarificationQuestion: null,
    confidence: 0.8,
    items,
    observations: [],
    ...overrides,
  };
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
    alternatives: [
      { name: " Frango grelhado ", kcalPer100g: 165, proteinPer100g: 31, carbPer100g: 0, fatPer100g: 3.6, fiberPer100g: null },
      { name: "Porco grelhado", kcalPer100g: 242, proteinPer100g: 27, carbPer100g: 0, fatPer100g: 14, fiberPer100g: null },
      { name: "", kcalPer100g: 1, proteinPer100g: 1, carbPer100g: 1, fatPer100g: 1, fiberPer100g: null },
      { name: "Bovino grelhado", kcalPer100g: 250, proteinPer100g: 26, carbPer100g: 0, fatPer100g: 15, fiberPer100g: 0 },
    ],
  });
  const result = validateAndNormalizeAnalysis(makeAnalysis([ambiguous]));
  assert.equal(result.ok, true);

  if (result.ok) {
    assert.equal(result.items[0].identification, "ambiguous");
    // names trimmed, the empty-name candidate dropped, and each keeps its OWN macros.
    assert.deepEqual(
      result.items[0].alternatives.map((alt) => alt.name),
      ["Frango grelhado", "Porco grelhado", "Bovino grelhado"],
    );
  }
});

test("ambiguity alternatives carry full profiles; kcal recomputed from macros (Atwater)", () => {
  const ambiguous = makeItem({
    name: "Carne grelhada",
    identification: "ambiguous",
    alternatives: [
      // The model's loose kcal (999) must be ignored — kcal comes from macros.
      { name: "Frango", kcalPer100g: 999, proteinPer100g: 31, carbPer100g: 0, fatPer100g: 3.6, fiberPer100g: null },
    ],
  });
  const result = validateAndNormalizeAnalysis(makeAnalysis([ambiguous]));
  assert.ok(result.ok);

  if (result.ok) {
    const [alt] = result.items[0].alternatives;
    // 4*31 + 4*0 + 9*3.6 = 156.4 (NOT the loose 999).
    assert.equal(alt.kcalPer100g, 156.4);
    assert.equal(alt.proteinPer100g, 31);
    assert.equal(alt.fatPer100g, 3.6);
  }
});

test("drops alternatives without usable macros (never invents nutrients)", () => {
  const ambiguous = makeItem({
    name: "Carne",
    identification: "ambiguous",
    alternatives: [
      { name: "Frango", kcalPer100g: 165, proteinPer100g: 31, carbPer100g: 0, fatPer100g: 3.6, fiberPer100g: null },
      { name: "Ruim", kcalPer100g: 200, proteinPer100g: -5, carbPer100g: 0, fatPer100g: 10, fiberPer100g: null },
    ],
  });
  const result = validateAndNormalizeAnalysis(makeAnalysis([ambiguous]));
  assert.ok(result.ok);

  if (result.ok) {
    assert.equal(result.items[0].alternatives.length, 1);
    assert.equal(result.items[0].alternatives[0].name, "Frango");
  }
});

test("passes needsClarification + question through when the description is vague", () => {
  const result = validateAndNormalizeAnalysis(
    makeAnalysis([makeItem({ name: "Bolo" })], {
      needsClarification: true,
      clarificationQuestion: "  Qual era o tamanho da fatia?  ",
    }),
  );
  assert.ok(result.ok);

  if (result.ok) {
    assert.equal(result.needsClarification, true);
    assert.equal(result.clarificationQuestion, "Qual era o tamanho da fatia?");
  }
});
