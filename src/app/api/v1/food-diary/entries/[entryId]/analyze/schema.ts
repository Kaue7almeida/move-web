import { z } from "zod";

import { ApiError } from "@/bff/core/errors/ApiError";

export const analyzeBodySchema = z.object({
  // IANA time zone, used to resolve the entry's local day for the daily quota.
  timeZone: z.string().min(1).max(64).optional(),
  // Text/snack only: set true on the re-analysis AFTER the user answered the ONE
  // clarification question, so a still-vague description is accepted as a best
  // estimate instead of asking again (prevents a clarify loop).
  skipClarification: z.boolean().optional(),
});

export type AnalyzeBody = z.infer<typeof analyzeBodySchema>;

/** Tolerates an empty/absent body (analyze may be called without one). */
export async function parseAnalyzeBody(request: Request): Promise<AnalyzeBody> {
  const raw = await request.json().catch(() => ({}));
  const result = analyzeBodySchema.safeParse(raw ?? {});

  if (!result.success) {
    throw new ApiError(400, "invalid_request", "Dados inválidos no payload.");
  }

  return result.data;
}
