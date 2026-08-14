import { z } from "zod";

import { parseJsonBody } from "@/bff/core/validation/parseJsonBody";

export const estimateActivityBodySchema = z.object({
  description: z.string().trim().min(1).max(500),
  /** Peso informado no fluxo (kg) — usado só para a estimativa; não persiste. */
  weightKg: z.number().positive().max(400).optional(),
  /** true quando o usuário confirmou que é atividade EXTRA (não rotina). */
  forceExtra: z.boolean().optional(),
});

export type EstimateActivityBody = z.infer<typeof estimateActivityBodySchema>;

export function parseEstimateActivityBody(request: Request): Promise<EstimateActivityBody> {
  return parseJsonBody(request, estimateActivityBodySchema);
}
