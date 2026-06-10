import { z } from "zod";

import { ApiError } from "@/bff/core/errors/ApiError";
import type { CreateWorkoutSessionInput } from "@/bff/modules/workouts/types";

const createWorkoutSessionSchema = z
  .object({
    sets: z.array(
      z.object({
        studentWorkoutExerciseId: z.string().uuid(),
        exerciseName: z.string().min(1),
        setNumber: z.number().int().min(1),
        targetRepsText: z.string().optional(),
        performedReps: z.number().int().min(0),
        loadKg: z.number().min(0),
        notes: z.string().optional(),
        completed: z.boolean(),
      }).strict(),
    ).min(1),
    notes: z.string().optional(),
  })
  .strict();

export function parseCreateWorkoutSessionBody(input: unknown): CreateWorkoutSessionInput {
  const parsed = createWorkoutSessionSchema.safeParse(input);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Dados da sessão inválidos.");
  }

  return parsed.data;
}
