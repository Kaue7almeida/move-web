import { z } from "zod";

import { parseJsonBody } from "@/bff/core/validation/parseJsonBody";

const reviewItemEditSchema = z.object({
  id: z.string().uuid(),
  gramsConfirmed: z.number().min(0).max(20000).nullable().optional(),
  isRemoved: z.boolean().optional(),
  name: z.string().trim().min(1).max(120).optional(),
  preparation: z.string().trim().max(120).nullable().optional(),
  // Ambiguity resolution: you resolve an identity, you never re-ambiguate it —
  // so only "identified" is accepted. Sending macros requires this to be set
  // (the service recomputes kcal and clears the alternatives).
  identification: z.literal("identified").optional(),
  kcalPer100g: z.number().min(0).max(1000).optional(),
  proteinPer100g: z.number().min(0).max(100).optional(),
  carbPer100g: z.number().min(0).max(100).optional(),
  fatPer100g: z.number().min(0).max(100).optional(),
  fiberPer100g: z.number().min(0).max(100).nullable().optional(),
});

// Manual item (P1 has no TACO/USDA): the client supplies the per-100g values.
const reviewItemAddSchema = z.object({
  name: z.string().trim().min(1).max(120),
  preparation: z.string().trim().max(120).nullable().optional(),
  category: z.string().trim().max(60).nullable().optional(),
  grams: z.number().positive().max(20000),
  householdMeasure: z.string().trim().max(120).nullable().optional(),
  kcalPer100g: z.number().min(0).max(1000),
  proteinPer100g: z.number().min(0).max(100),
  carbPer100g: z.number().min(0).max(100),
  fatPer100g: z.number().min(0).max(100),
  fiberPer100g: z.number().min(0).max(100).nullable().optional(),
});

export const reviewBodySchema = z.object({
  items: z.array(reviewItemEditSchema).max(50).optional(),
  addedItems: z.array(reviewItemAddSchema).max(20).optional(),
});

export type ReviewBody = z.infer<typeof reviewBodySchema>;

export function parseReviewBody(request: Request): Promise<ReviewBody> {
  return parseJsonBody(request, reviewBodySchema);
}
