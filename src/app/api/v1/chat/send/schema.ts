import { z } from "zod";

import { ApiError } from "@/bff/core/errors/ApiError";
import type { SendMoveAiMessageInput } from "@/bff/modules/chat/services/ChatService";

const pageContextSchema = z
  .object({
    currentRoute: z.string().trim().min(1).max(300),
    module: z.string().trim().min(1).max(80),
    pageTitle: z.string().trim().min(1).max(160).optional(),
    entityId: z.string().trim().min(1).max(160).optional(),
  })
  .strict();

const contextTriggerSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    entityId: z.string().trim().min(1).max(160),
  })
  .strict();

const sendMoveAiMessageSchema = z
  .object({
    conversationId: z.string().uuid(),
    content: z.string().trim().min(1).max(2000).optional(),
    starterId: z.string().trim().min(1).max(80).optional(),
    contextTrigger: contextTriggerSchema.optional(),
    pageContext: pageContextSchema.optional(),
  })
  .strict()
  .refine((value) => Boolean(value.content || value.starterId || value.contextTrigger), {
    message: "content, starterId ou contextTrigger precisa ser informado.",
    path: ["content"],
  })
  .refine((value) => !value.contextTrigger || Boolean(value.content), {
    message: "content é obrigatório quando contextTrigger é informado.",
    path: ["content"],
  });

export function parseSendMoveAiMessageBody(input: unknown): SendMoveAiMessageInput {
  const parsed = sendMoveAiMessageSchema.safeParse(input);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Payload inválido.");
  }

  return parsed.data;
}
