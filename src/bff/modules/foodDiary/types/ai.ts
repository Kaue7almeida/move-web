import { z } from "zod";

/* ─── AI input (built by the service, consumed by the OpenAI client) ─────────── */

export type FoodDiaryAiInput = {
  /** Short-lived signed URL of the meal photo (never logged, never persisted). */
  imageUrl: string;
  mealType: string;
  containerSize: string | null;
  mealOrigin: string | null;
  preparationHint: string | null;
  hiddenIngredients: string[];
  isSharedPortion: boolean;
  userNotes: string | null;
};

/** Input for a TEXT-described meal (or snack) — no photo. Same output contract. */
export type FoodDiaryTextInput = {
  mealType: string;
  /** Free-text description, e.g. "2 pães de queijo e café com leite". */
  description: string;
  containerSize: string | null;
  /** Optional hint (may carry the user's own kcal estimate). */
  userNotes: string | null;
  /** True for the "docinho ou petisco" flow (small intake). */
  isSnack: boolean;
};

/* ─── AI response contract (Structured Outputs → validated again with Zod) ───── */

/**
 * A plausible alternative identity for an ambiguous item, WITH its own nutrient
 * profile — so the human can pick a complete candidate (name + macros) without a
 * second AI call. e.g. for "carne grelhada": Frango / Porco / Bovino, each with
 * its per-100g values.
 */
const aiAlternativeSchema = z.object({
  name: z.string(),
  kcalPer100g: z.number(),
  proteinPer100g: z.number(),
  carbPer100g: z.number(),
  fatPer100g: z.number(),
  fiberPer100g: z.number().nullable(),
});

const aiItemSchema = z.object({
  name: z.string(),
  /** Per-item preparation (NOT a whole-plate choice): "grelhado","frito",... or null. */
  preparation: z.string().nullable(),
  category: z.string(),
  /**
   * How sure the model is about the food's IDENTITY (not the portion):
   *  • identified → confident which food it is;
   *  • ambiguous → cannot distinguish between plausible foods (see alternatives);
   *  • unknown → cannot tell at all.
   * confidence is NOT accuracy — it is the model's self-reported certainty.
   */
  identification: z.enum(["identified", "ambiguous", "unknown"]),
  /** Plausible identities (each with its OWN nutrients) when ambiguous; else []. */
  alternatives: z.array(aiAlternativeSchema),
  gramsEstimated: z.number(),
  householdMeasure: z.string().nullable(),
  confidence: z.number(),
  isPartiallyHidden: z.boolean(),
  kcalPer100g: z.number(),
  proteinPer100g: z.number(),
  carbPer100g: z.number(),
  fatPer100g: z.number(),
  fiberPer100g: z.number().nullable(),
  uncertainty: z.string().nullable(),
});

export const foodDiaryAiResponseSchema = z.object({
  analysis: z.object({
    qualityOverall: z.enum(["boa", "media", "ruim"]),
    needsRetake: z.boolean(),
    /**
     * True when the DESCRIPTION (text/snack) is too vague to estimate honestly
     * (e.g. "bolo", "carne", "salgado"). The UI asks ONE short question instead of
     * silently guessing. clarificationQuestion holds that single question.
     */
    needsClarification: z.boolean(),
    clarificationQuestion: z.string().nullable(),
    confidence: z.number(),
    items: z.array(aiItemSchema),
    observations: z.array(z.string()),
  }),
});

export type FoodDiaryAiResponse = z.infer<typeof foodDiaryAiResponseSchema>;
export type FoodDiaryAiAnalysis = FoodDiaryAiResponse["analysis"];
export type FoodDiaryAiItem = FoodDiaryAiAnalysis["items"][number];
export type FoodDiaryAiAlternative = z.infer<typeof aiAlternativeSchema>;
