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
  /** Plausible identities when ambiguous (e.g. ["Frango","Porco","Bovino"]). */
  alternatives: z.array(z.string()),
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
    confidence: z.number(),
    items: z.array(aiItemSchema),
    observations: z.array(z.string()),
  }),
});

export type FoodDiaryAiResponse = z.infer<typeof foodDiaryAiResponseSchema>;
export type FoodDiaryAiAnalysis = FoodDiaryAiResponse["analysis"];
export type FoodDiaryAiItem = FoodDiaryAiAnalysis["items"][number];
