import { z } from "zod";

import { ApiError } from "@/bff/core/errors/ApiError";
import type { UpdateTrainerAiSettingsInput } from "@/bff/modules/chat/services/ChatService";

const trainerAiModeSchema = z.enum(["off", "suggest", "auto_reply"]);

function nullableTrimmedString(maxLength: number) {
  return z.union([z.string().trim().max(maxLength), z.null()]).optional();
}

const patchTrainerAiSettingsSchema = z
  .object({
    enabled: z.boolean().optional(),
    mode: trainerAiModeSchema.optional(),
    tone: nullableTrimmedString(300),
    instructions: nullableTrimmedString(2000),
    preferredExercises: z
      .array(z.string().trim().min(1).max(80))
      .max(50)
      .optional(),
    restrictions: nullableTrimmedString(1000),
  })
  .strict()
  .refine(
    (value) =>
      value.enabled !== undefined ||
      value.mode !== undefined ||
      value.tone !== undefined ||
      value.instructions !== undefined ||
      value.preferredExercises !== undefined ||
      value.restrictions !== undefined,
    {
      message: "Ao menos um campo precisa ser informado.",
      path: ["enabled"],
    },
  );

export function parsePatchTrainerAiSettingsBody(
  input: unknown,
): UpdateTrainerAiSettingsInput {
  const parsed = patchTrainerAiSettingsSchema.safeParse(input);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Payload invalido.");
  }

  return parsed.data;
}
