import { z } from "zod";

import { ApiError } from "@/bff/core/errors/ApiError";
import type { TrainerStudentLinkInput } from "@/bff/modules/profile/types";

const postTrainerStudentSchema = z
  .object({
    studentName: z.string().trim().min(1),
    studentEmail: z.string().trim().email(),
  })
  .strict();

export function parsePostTrainerStudentBody(input: unknown): TrainerStudentLinkInput {
  const parsed = postTrainerStudentSchema.safeParse(input);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Payload inválido.");
  }

  return {
    studentName: parsed.data.studentName,
    studentEmail: parsed.data.studentEmail.toLowerCase(),
  };
}