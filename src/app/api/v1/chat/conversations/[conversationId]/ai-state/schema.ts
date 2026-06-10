import { z } from "zod";

import { ApiError } from "@/bff/core/errors/ApiError";
import type { UpdateConversationAiStateAction } from "@/bff/modules/chat/services/ChatService";

const conversationIdSchema = z.string().uuid();
const patchConversationAiStateSchema = z
  .object({
    action: z.enum([
      "disable_ai",
      "enable_ai",
      "mark_waiting_for_trainer",
      "clear_waiting_for_trainer",
    ]),
  })
  .strict();

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

export function parsePatchConversationAiStateBody(
  input: unknown,
): UpdateConversationAiStateAction {
  const parsed = patchConversationAiStateSchema.safeParse(input);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Payload invalido.");
  }

  return parsed.data.action;
}
