import { z } from "zod";

import { ApiError } from "@/bff/core/errors/ApiError";

export const analyzeScanPreviewBodySchema = z.object({
  frontImageUrl: z.string().url("frontImageUrl deve ser uma URL válida."),
  sideImageUrl: z.string().url("sideImageUrl deve ser uma URL válida."),
  sexo: z.enum(["masculino", "feminino", "desconhecido"]),
  idadeAnos: z.number().int().min(1).max(120),
  alturaCm: z.number().min(50).max(300),
  pesoKg: z.number().min(5).max(600),
  observacoes: z.string().max(500).nullable().optional(),
});

export type AnalyzeScanPreviewBody = z.infer<typeof analyzeScanPreviewBodySchema>;

export async function parseAnalyzeScanPreviewBody(
  request: Request,
): Promise<AnalyzeScanPreviewBody> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "invalid_request", "Payload inválido ou ausente.");
  }

  const result = analyzeScanPreviewBodySchema.safeParse(body);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const message = firstIssue
      ? `${firstIssue.path.join(".") || "campo"}: ${firstIssue.message}`
      : "Dados inválidos no payload.";

    throw new ApiError(400, "invalid_request", message);
  }

  return result.data;
}
