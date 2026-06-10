import { z } from "zod";

import { ApiError } from "@/bff/core/errors/ApiError";

export const createScanBodySchema = z.object({
  consent: z.boolean(),
  source: z.enum(["web", "webview"]),
  weightKg: z.number().min(5).max(600),
  heightCm: z.number().min(50).max(300),
  ageYears: z.number().int().min(1).max(120),
  sex: z.enum(["masculino", "feminino", "desconhecido"]),
  useBonusAllowance: z.boolean().optional(),
});

export type CreateScanBody = z.infer<typeof createScanBodySchema>;

export async function parseCreateScanBody(request: Request): Promise<CreateScanBody> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "invalid_request", "Payload inválido ou ausente.");
  }

  const result = createScanBodySchema.safeParse(body);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const message = firstIssue
      ? `${firstIssue.path.join(".") || "campo"}: ${firstIssue.message}`
      : "Dados inválidos no payload.";

    throw new ApiError(400, "invalid_request", message);
  }

  return result.data;
}
