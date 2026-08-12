import assert from "node:assert/strict";
import { test } from "node:test";

import type { FoodDiaryEntryView, FoodDiaryItemView } from "@/bff/modules/foodDiary/types";

import {
  itemGrams,
  itemMacros,
  macroContributions,
  macroTargetsForKcal,
  mealKcal,
  sumMacros,
} from "@/app/app/diario/_nutrition";

function makeItem(overrides: Partial<FoodDiaryItemView> = {}): FoodDiaryItemView {
  return {
    id: "item-1",
    entryId: "entry-1",
    position: 0,
    name: "Arroz",
    preparation: null,
    category: "carboidrato",
    gramsEstimated: 100,
    gramsConfirmed: null,
    householdMeasure: null,
    confidence: 0.9,
    isPartiallyHidden: false,
    isUserAdded: false,
    isRemoved: false,
    nutritionSource: "ai_estimated",
    nutritionReferenceId: null,
    kcalPer100g: 130,
    proteinPer100g: 2.5,
    carbPer100g: 28,
    fatPer100g: 0.2,
    fiberPer100g: null,
    ...overrides,
  };
}

function makeMeal(items: FoodDiaryItemView[], totals?: Partial<FoodDiaryEntryView>): FoodDiaryEntryView {
  return {
    items,
    confirmedTotals: { kcal: null, proteinG: null, carbG: null, fatG: null, fiberG: null },
    estimatedTotals: { kcal: null, proteinG: null, carbG: null, fatG: null, fiberG: null },
    ...totals,
  } as unknown as FoodDiaryEntryView;
}

test("itemGrams prefers gramsConfirmed, falling back to gramsEstimated", () => {
  assert.equal(itemGrams(makeItem({ gramsEstimated: 100, gramsConfirmed: null })), 100);
  assert.equal(itemGrams(makeItem({ gramsEstimated: 100, gramsConfirmed: 180 })), 180);
});

test("itemMacros scales per-100g values linearly with grams", () => {
  const macros = itemMacros(makeItem(), 150);
  // kcal = round(130 * 1.5) = 195; protein = round1(2.5 * 1.5) = 3.8
  assert.equal(macros.kcal, 195);
  assert.equal(macros.proteinG, 3.8);
  assert.equal(macros.carbG, 42);
  assert.equal(macros.fatG, 0.3);
});

test("itemMacros defaults grams to the item's in-force grams", () => {
  const macros = itemMacros(makeItem({ gramsConfirmed: 200 }));
  assert.equal(macros.kcal, 260); // 130 * 2
});

test("sumMacros adds and rounds component macros", () => {
  const total = sumMacros([
    itemMacros(makeItem(), 100),
    itemMacros(makeItem({ kcalPer100g: 200, proteinPer100g: 10, carbPer100g: 0, fatPer100g: 5 }), 100),
  ]);
  assert.equal(total.kcal, 330);
  assert.equal(total.proteinG, 12.5);
});

test("macroTargetsForKcal splits 25/45/30 with 4-4-9 kcal/g", () => {
  const targets = macroTargetsForKcal(2000);
  assert.equal(targets.proteinG, 125); // 2000*0.25/4
  assert.equal(targets.carbG, 225); // 2000*0.45/4
  assert.equal(targets.fatG, 67); // round(2000*0.30/9)
});

test("macroContributions aggregates by name, skips removed/zero, sorts desc", () => {
  const meal = makeMeal([
    makeItem({ id: "a", name: "Frango", proteinPer100g: 30, gramsEstimated: 100 }), // 30g protein
    makeItem({ id: "b", name: "Arroz", proteinPer100g: 2.5, gramsEstimated: 100 }), // 2.5g protein
    makeItem({ id: "c", name: "Frango", proteinPer100g: 30, gramsEstimated: 50 }), // +15g protein
    makeItem({ id: "d", name: "Óleo", proteinPer100g: 0, gramsEstimated: 100 }), // 0 → skipped
    makeItem({ id: "e", name: "Removido", proteinPer100g: 99, isRemoved: true }), // removed → skipped
  ]);

  const contributions = macroContributions([meal], "proteinG");

  assert.deepEqual(
    contributions.map((entry) => entry.name),
    ["Frango", "Arroz"],
  );
  assert.equal(contributions[0].grams, 45); // 30 + 15 aggregated by name
});

test("mealKcal uses confirmed total, falling back to estimated", () => {
  assert.equal(
    mealKcal(makeMeal([], { confirmedTotals: { kcal: 500, proteinG: null, carbG: null, fatG: null, fiberG: null } })),
    500,
  );
  assert.equal(
    mealKcal(
      makeMeal([], {
        confirmedTotals: { kcal: null, proteinG: null, carbG: null, fatG: null, fiberG: null },
        estimatedTotals: { kcal: 420, proteinG: null, carbG: null, fatG: null, fiberG: null },
      }),
    ),
    420,
  );
});
