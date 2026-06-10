import { z } from "zod";

import { ApiError } from "@/bff/core/errors/ApiError";
import type { StudentOnboardingInput } from "@/bff/modules/profile/types";

const optionalTextField = z.string().trim().min(1).optional();

const putStudentOnboardingSchema = z
  .object({
    fullName: z.string().trim().min(1),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    sex: optionalTextField,
    weightKg: z.number().finite().positive().optional(),
    heightCm: z.number().finite().positive().optional(),
    trainingGoal: optionalTextField,
    trainingLevel: optionalTextField,
    trainingProfile: optionalTextField,
  })
  .strict();

export function parsePutStudentOnboardingBody(input: unknown): StudentOnboardingInput {
  const parsed = putStudentOnboardingSchema.safeParse(input);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Payload inválido.");
  }

  return parsed.data;
}