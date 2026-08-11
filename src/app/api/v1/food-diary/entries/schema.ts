import { z } from "zod";

import { parseJsonBody } from "@/bff/core/validation/parseJsonBody";

const isoDateTime = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Data/hora inválida.");

export const createEntryBodySchema = z.object({
  mealType: z.enum(["cafe_da_manha", "almoco", "lanche", "jantar", "extra"]),
  loggedAt: isoDateTime.optional(),
  containerSize: z.enum(["pequeno", "medio", "grande"]).optional(),
  mealOrigin: z.enum(["caseiro", "restaurante", "embalado"]).optional(),
  preparationHint: z.string().trim().max(200).optional(),
  hiddenIngredients: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
  isSharedPortion: z.boolean().optional(),
  userNotes: z.string().trim().max(1000).optional(),
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
});

export type CreateEntryBody = z.infer<typeof createEntryBodySchema>;

export function parseCreateEntryBody(request: Request): Promise<CreateEntryBody> {
  return parseJsonBody(request, createEntryBodySchema);
}
