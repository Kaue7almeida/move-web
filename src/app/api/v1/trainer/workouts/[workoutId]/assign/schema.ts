import { z } from "zod";

import { ApiError } from "@/bff/core/errors/ApiError";
import type { AssignWorkoutToStudentInput } from "@/bff/modules/workouts/types";

const postAssignWorkoutSchema = z
  .object({
    studentUserId: z.string().uuid(),
    status: z.enum(["pending", "active"]).optional(),
  })
  .strict();

export function parsePostAssignWorkoutBody(input: unknown): AssignWorkoutToStudentInput {
  const parsed = postAssignWorkoutSchema.safeParse(input);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Payload inválido.");
  }

  return parsed.data;
}