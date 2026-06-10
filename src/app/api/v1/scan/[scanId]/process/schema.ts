import { z } from "zod";

import { ApiError } from "@/bff/core/errors/ApiError";

const scanIdSchema = z.string().uuid();

export async function readScanIdParam(
  paramsPromise: Promise<{ scanId: string }>,
): Promise<string> {
  const params = await paramsPromise;
  const parsed = scanIdSchema.safeParse(params.scanId);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Identificador de análise inválido.");
  }

  return parsed.data;
}
