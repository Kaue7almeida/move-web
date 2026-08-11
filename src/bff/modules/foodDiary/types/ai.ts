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

/* ─── AI response contract (Structured Outputs → validated again with Zod) ───── */

const aiItemSchema = z.object({
  name: z.string(),
  preparation: z.string().nullable(),
  category: z.string(),
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
