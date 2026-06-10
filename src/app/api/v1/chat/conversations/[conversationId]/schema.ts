import { z } from "zod";

import { ApiError } from "@/bff/core/errors/ApiError";

const conversationIdSchema = z.string().uuid();

export async function readConversationIdParam(
  paramsPromise: Promise<{ conversationId: string }>,
): Promise<string> {
  const params = await paramsPromise;
  const parsed = conversationIdSchema.safeParse(params.conversationId);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Identificador de conversa invalido.");
  }

  return parsed.data;
}
