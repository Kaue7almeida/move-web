import { z } from "zod";

import { parseJsonBody } from "@/bff/core/validation/parseJsonBody";

export const upsertTargetBodySchema = z.object({
  targetKcal: z.number().positive().max(20000),
  proteinPercent: z.number().min(0).max(100).optional(),
  carbPercent: z.number().min(0).max(100).optional(),
  fatPercent: z.number().min(0).max(100).optional(),
  source: z.enum(["manual", "suggested", "estimated_from_scan", "trainer"]).optional(),
  effectiveFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato YYYY-MM-DD.")
    .optional(),
});

export type UpsertTargetBody = z.infer<typeof upsertTargetBodySchema>;

export function parseUpsertTargetBody(request: Request): Promise<UpsertTargetBody> {
  return parseJsonBody(request, upsertTargetBodySchema);
}
