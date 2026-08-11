import type { FoodDiaryAiAnalysis } from "@/bff/modules/foodDiary/types/ai";

/**
 * Deterministic, server-side validation of an AI meal analysis, applied AFTER
 * Structured Outputs + Zod. Its job is to reject broken/absurd payloads and to
 * normalize the items into what we persist — NOT to invent nutrition science.
 *
 * Pure and dependency-free at runtime (type-only import) so it can be unit-tested
 * directly. The service turns an `ok: false` result into an ApiError + failed entry.
 */

const MAX_ITEMS = 40;
const MAX_ITEM_GRAMS = 5000;
const MAX_TOTAL_KCAL = 12_000;

export type NormalizedAiItem = {
  name: string;
  preparation: string | null;
  category: string | null;
  gramsEstimated: number;
  householdMeasure: string | null;
  confidence: number | null;
  isPartiallyHidden: boolean;
  kcalPer100g: number;
  proteinPer100g: number;
  carbPer100g: number;
  fatPer100g: number;
  fiberPer100g: number | null;
  /** The original AI item, preserved verbatim for audit (persisted in ai_item_payload). */
  aiItemPayload: FoodDiaryAiAnalysis["items"][number];
};

export type EstimatedTotals = {
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  fiberG: number;
};

export type AnalysisValidationResult =
  | {
      ok: true;
      items: NormalizedAiItem[];
      estimatedTotals: EstimatedTotals;
      overallConfidence: number | null;
    }
  | { ok: false; code: string; message: string };

function fail(code: string, message: string): AnalysisValidationResult {
  return { ok: false, code, message };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function nullableTrimmed(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function computeTotals(items: NormalizedAiItem[]): EstimatedTotals {
  const totals = { kcal: 0, proteinG: 0, carbG: 0, fatG: 0, fiberG: 0 };

  for (const item of items) {
    const factor = item.gramsEstimated / 100;
    totals.kcal += item.kcalPer100g * factor;
    totals.proteinG += item.proteinPer100g * factor;
    totals.carbG += item.carbPer100g * factor;
    totals.fatG += item.fatPer100g * factor;
    totals.fiberG += (item.fiberPer100g ?? 0) * factor;
  }

  return {
    kcal: Math.round(totals.kcal),
    proteinG: round1(totals.proteinG),
    carbG: round1(totals.carbG),
    fatG: round1(totals.fatG),
    fiberG: round1(totals.fiberG),
  };
}

export function validateAndNormalizeAnalysis(
  analysis: FoodDiaryAiAnalysis,
): AnalysisValidationResult {
  if (!Array.isArray(analysis.items) || analysis.items.length === 0) {
    return fail("food_diary_analysis_empty", "A análise não identificou nenhum alimento na foto.");
  }

  if (analysis.items.length > MAX_ITEMS) {
    return fail("food_diary_analysis_invalid", "A análise retornou itens em excesso.");
  }

  const normalized: NormalizedAiItem[] = [];
  const seen = new Set<string>();

  for (const item of analysis.items) {
    const name = typeof item.name === "string" ? item.name.trim() : "";

    if (!name) {
      return fail("food_diary_analysis_invalid", "Um item da análise veio sem nome.");
    }

    const grams = item.gramsEstimated;

    if (!isFiniteNumber(grams) || grams <= 0 || grams > MAX_ITEM_GRAMS) {
      return fail("food_diary_analysis_invalid", "Um item da análise veio com gramas inválidas.");
    }

    const protein = item.proteinPer100g;
    const carb = item.carbPer100g;
    const fat = item.fatPer100g;
    const fiber = item.fiberPer100g;

    if (![protein, carb, fat].every((value) => isFiniteNumber(value) && value >= 0)) {
      return fail("food_diary_analysis_invalid", "Um item da análise veio com nutrientes inválidos.");
    }

    if (fiber !== null && (!isFiniteNumber(fiber) || fiber < 0)) {
      return fail("food_diary_analysis_invalid", "Um item da análise veio com fibra inválida.");
    }

    // Deterministic kcal from macros (Atwater) — never trust a loose kcal from the model.
    const kcalPer100g = round1(4 * protein + 4 * carb + 9 * fat);

    // Drop exact duplicates (same name + grams + macros) — an obvious model hiccup.
    const signature = `${name.toLowerCase()}|${grams}|${protein}|${carb}|${fat}`;

    if (seen.has(signature)) {
      continue;
    }

    seen.add(signature);

    normalized.push({
      name,
      preparation: nullableTrimmed(item.preparation),
      category: nullableTrimmed(item.category),
      gramsEstimated: grams,
      householdMeasure: nullableTrimmed(item.householdMeasure),
      confidence: isFiniteNumber(item.confidence) ? clamp01(item.confidence) : null,
      isPartiallyHidden: Boolean(item.isPartiallyHidden),
      kcalPer100g,
      proteinPer100g: protein,
      carbPer100g: carb,
      fatPer100g: fat,
      fiberPer100g: fiber,
      aiItemPayload: item,
    });
  }

  if (normalized.length === 0) {
    return fail("food_diary_analysis_empty", "A análise não identificou nenhum alimento utilizável.");
  }

  const estimatedTotals = computeTotals(normalized);

  if (estimatedTotals.kcal > MAX_TOTAL_KCAL) {
    return fail("food_diary_analysis_invalid", "A análise retornou um total calórico implausível.");
  }

  return {
    ok: true,
    items: normalized,
    estimatedTotals,
    overallConfidence: isFiniteNumber(analysis.confidence) ? clamp01(analysis.confidence) : null,
  };
}
