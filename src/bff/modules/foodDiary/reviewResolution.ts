import type { Json } from "@/bff/core/supabase/database.types";
import { ApiError } from "@/bff/core/errors/ApiError";
import type { ReviewItemEdit } from "@/bff/modules/foodDiary/types";

/**
 * PURE decision logic for resolving an item's identity during review, plus the
 * predicate the confirm guard uses. Kept out of the (non-strippable) service so it
 * is directly unit-testable, and so the "last barrier" rules live in one place.
 */

export type ItemIdentityResolution = {
  identification?: string;
  alternatives?: Json;
  kcalPer100g?: number;
  proteinPer100g?: number;
  carbPer100g?: number;
  fatPer100g?: number;
  fiberPer100g?: number | null;
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function invalid(message: string): ApiError {
  return new ApiError(422, "food_diary_item_resolution_invalid", message);
}

/**
 * Resolve an ambiguous/unknown item during review into a coherent identity change.
 *
 * The backend is the last barrier: a nutrient change is only accepted together with
 * identification="identified", and it swaps the WHOLE profile — macros, recomputed
 * kcal (Atwater), and it clears the alternatives (name is applied by the caller).
 * Picking "Outro" resolves the identity while KEEPING the AI's best-guess macros (no
 * macro fields). An edit that touches neither identity nor macros returns {} (unchanged).
 */
export function resolveItemIdentity(edit: ReviewItemEdit): ItemIdentityResolution {
  const touchesMacros =
    edit.kcalPer100g !== undefined
    || edit.proteinPer100g !== undefined
    || edit.carbPer100g !== undefined
    || edit.fatPer100g !== undefined
    || edit.fiberPer100g !== undefined;

  if (edit.identification === undefined && !touchesMacros) {
    return {};
  }

  // Any nutrient/identity change must land the item on a resolved identity.
  if (edit.identification !== "identified") {
    throw invalid("Para alterar os nutrientes de um item, resolva a identidade dele.");
  }

  // Resolving clears the candidate list — the identity is no longer in doubt.
  const resolution: ItemIdentityResolution = {
    identification: "identified",
    alternatives: [] as unknown as Json,
  };

  if (!touchesMacros) {
    // "Outro": keep the AI's best-guess nutrients, just mark the identity resolved.
    return resolution;
  }

  const protein = edit.proteinPer100g;
  const carb = edit.carbPer100g;
  const fat = edit.fatPer100g;

  if (protein === undefined || carb === undefined || fat === undefined) {
    throw invalid("Escolha um candidato completo: proteína, carboidrato e gordura são obrigatórios.");
  }

  if (![protein, carb, fat].every((value) => Number.isFinite(value) && value >= 0)) {
    throw invalid("Nutrientes inválidos para o item escolhido.");
  }

  const fiber = edit.fiberPer100g ?? null;

  if (fiber !== null && (!Number.isFinite(fiber) || fiber < 0)) {
    throw invalid("Fibra inválida para o item escolhido.");
  }

  // kcal is ALWAYS recomputed from macros — the client-sent kcal is preview-only.
  resolution.kcalPer100g = round1(4 * protein + 4 * carb + 9 * fat);
  resolution.proteinPer100g = protein;
  resolution.carbPer100g = carb;
  resolution.fatPer100g = fat;
  resolution.fiberPer100g = fiber;

  return resolution;
}

/** Identities that block confirmation until the user resolves them (last barrier). */
export function isUnresolvedIdentity(identification: string): boolean {
  return identification === "ambiguous" || identification === "unknown";
}
