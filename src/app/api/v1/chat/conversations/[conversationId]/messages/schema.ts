import { z } from "zod";

import { ApiError } from "@/bff/core/errors/ApiError";
import type { SendHumanMessageInput } from "@/bff/modules/chat/services/ChatService";

const conversationIdSchema = z.string().uuid();
const postHumanMessageSchema = z
  .object({
    content: z.string().trim().min(1).max(2000),
  })
  .strict();

export async function readConversationIdParam(
  paramsPromise: Promise<{ conversationId: string }>,
): Promise<string> {
  const params = await paramsPromise;
  const parsed = conversationIdSchema.safeParse(params.conversationId);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Identificador de conversa inválido.");
  }

  return parsed.data;
}

export function parsePostHumanMessageBody(
  conversationId: string,
  input: unknown,
): SendHumanMessageInput {
  const parsed = postHumanMessageSchema.safeParse(input);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Payload inválido.");
  }

  return {
    conversationId,
    content: parsed.data.content,
  };
}
