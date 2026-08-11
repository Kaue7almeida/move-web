import { z } from "zod";

import { parseJsonBody } from "@/bff/core/validation/parseJsonBody";

const isoDateTime = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Data/hora inválida.");

export const createActivityBodySchema = z.object({
  label: z.string().trim().max(120).optional(),
  kcalBurned: z.number().positive().max(100000),
  loggedAt: isoDateTime.optional(),
});

export type CreateActivityBody = z.infer<typeof createActivityBodySchema>;

export function parseCreateActivityBody(request: Request): Promise<CreateActivityBody> {
  return parseJsonBody(request, createActivityBodySchema);
}
