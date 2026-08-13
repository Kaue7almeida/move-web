import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiError } from "@/bff/core/errors/ApiError";
import {
  isUnresolvedIdentity,
  resolveItemIdentity,
} from "@/bff/modules/foodDiary/reviewResolution";
import type { ReviewItemEdit } from "@/bff/modules/foodDiary/types";

function edit(overrides: Partial<ReviewItemEdit>): ReviewItemEdit {
  return { id: "00000000-0000-0000-0000-000000000000", ...overrides };
}

test("frango → porco: picking a candidate swaps macros AND recomputes kcal (Atwater)", () => {
  // The user resolved "carne grelhada" as pork: full macro profile sent.
  const resolution = resolveItemIdentity(
    edit({
      identification: "identified",
      name: "Porco grelhado",
      // Client kcal is preview-only and deliberately wrong (999) — must be ignored.
      kcalPer100g: 999,
      proteinPer100g: 27,
      carbPer100g: 0,
      fatPer100g: 14,
      fiberPer100g: null,
    }),
  );

  assert.equal(resolution.identification, "identified");
  assert.deepEqual(resolution.alternatives, []); // candidates cleared
  // 4*27 + 4*0 + 9*14 = 234 (NOT the loose 999) — nutrients really changed.
  assert.equal(resolution.kcalPer100g, 234);
  assert.equal(resolution.proteinPer100g, 27);
  assert.equal(resolution.fatPer100g, 14);
});

test('"Outro" resolves identity but keeps the AI estimate (no macro override)', () => {
  const resolution = resolveItemIdentity(edit({ identification: "identified" }));

  assert.equal(resolution.identification, "identified");
  assert.deepEqual(resolution.alternatives, []);
  assert.equal(resolution.kcalPer100g, undefined);
  assert.equal(resolution.proteinPer100g, undefined);
});

test("a nutrient change without resolving identity is rejected (last barrier)", () => {
  assert.throws(
    () => resolveItemIdentity(edit({ proteinPer100g: 20, carbPer100g: 0, fatPer100g: 5 })),
    (error: unknown) =>
      error instanceof ApiError
      && error.status === 422
      && error.code === "food_diary_item_resolution_invalid",
  );
});

test("a partial macro set is rejected (must be a complete candidate)", () => {
  assert.throws(
    () => resolveItemIdentity(edit({ identification: "identified", proteinPer100g: 20 })),
    (error: unknown) => error instanceof ApiError && error.code === "food_diary_item_resolution_invalid",
  );
});

test("negative macros are rejected", () => {
  assert.throws(
    () =>
      resolveItemIdentity(
        edit({ identification: "identified", proteinPer100g: -1, carbPer100g: 0, fatPer100g: 5 }),
      ),
    (error: unknown) => error instanceof ApiError && error.code === "food_diary_item_resolution_invalid",
  );
});

test("an edit that touches neither identity nor macros is a no-op", () => {
  assert.deepEqual(resolveItemIdentity(edit({ gramsConfirmed: 120 })), {});
});

test("confirm guard: ambiguous/unknown block confirmation; identified does not", () => {
  assert.equal(isUnresolvedIdentity("ambiguous"), true);
  assert.equal(isUnresolvedIdentity("unknown"), true);
  assert.equal(isUnresolvedIdentity("identified"), false);
});
