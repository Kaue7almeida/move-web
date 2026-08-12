import type { z } from "zod";

import { ApiError } from "@/bff/core/errors/ApiError";

/**
 * Parses and validates a JSON request body against a Zod schema. Throws a 400
 * ApiError (code "invalid_request") with the first issue's path/message on
 * malformed or invalid input. Keeps route/schema files free of repeated boilerplate.
 */
export async function parseJsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "invalid_request", "Payload inválido ou ausente.");
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const message = firstIssue
      ? `${firstIssue.path.join(".") || "campo"}: ${firstIssue.message}`
      : "Dados inválidos no payload.";

    throw new ApiError(400, "invalid_request", message);
  }

  return result.data;
}
