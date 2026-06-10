import { z } from "zod";

import { ApiError } from "@/bff/core/errors/ApiError";
import type { TrainerOnboardingInput } from "@/bff/modules/profile/types";

const optionalTextField = z.string().trim().min(1).optional();

const postTrainerOnboardingSchema = z
  .object({
    professionalName: z.string().trim().min(1),
    specialties: z.array(z.string().trim().min(1)).min(1).max(6)
      .transform((items) => Array.from(new Set(items))),
    studentCountRange: z.string().trim().min(1),
    workModel: z.string().trim().min(1),
    bio: optionalTextField,
  })
  .strict();

export function parsePostTrainerOnboardingBody(input: unknown): TrainerOnboardingInput {
  const parsed = postTrainerOnboardingSchema.safeParse(input);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Payload inválido.");
  }

  return parsed.data;
}