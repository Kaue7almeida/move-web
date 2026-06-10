import { z } from "zod";

import { ApiError } from "@/bff/core/errors/ApiError";
import type { Json } from "@/bff/core/supabase/database.types";
import type { CreateChatConversationInput } from "@/bff/modules/chat/services/ChatService";

const jsonValueSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

const optionalTextField = z.string().trim().min(1).optional();

const postChatConversationSchema = z
  .object({
    conversationType: z.enum(["move_ai_private", "trainer_chat"]),
    title: optionalTextField,
    contextModule: optionalTextField,
    contextLabel: optionalTextField,
    trainerUserId: z.string().uuid().optional(),
    studentUserId: z.string().uuid().optional(),
    metadata: z.record(z.string(), jsonValueSchema).optional(),
  })
  .strict();

export function parsePostChatConversationBody(
  input: unknown,
): CreateChatConversationInput {
  const parsed = postChatConversationSchema.safeParse(input);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Payload inválido.");
  }

  return parsed.data;
}
