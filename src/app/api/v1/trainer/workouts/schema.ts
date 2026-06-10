import { z } from "zod";

import { ApiError } from "@/bff/core/errors/ApiError";
import type { CreateWorkoutTemplateInput } from "@/bff/modules/workouts/types";

const optionalTextField = z.string().trim().min(1).optional();

const workoutExerciseSchema = z
  .object({
    exerciseId: z.string().uuid(),
    sortOrder: z.number().int().positive(),
    setsCount: z.number().int().positive(),
    repsText: z.string().trim().min(1),
    restSeconds: z.number().int().nonnegative().optional(),
    notes: optionalTextField,
  })
  .strict();

const postTrainerWorkoutSchema = z
  .object({
    title: z.string().trim().min(1),
    description: optionalTextField,
    status: z.enum(["draft", "active", "archived"]).optional(),
    exercises: z.array(workoutExerciseSchema).min(1).max(20),
  })
  .strict()
  .superRefine((value, context) => {
    const sortOrders = new Set<number>();

    value.exercises.forEach((exercise, index) => {
      if (sortOrders.has(exercise.sortOrder)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cada exercício precisa ter uma posição única.",
          path: ["exercises", index, "sortOrder"],
        });
      }

      sortOrders.add(exercise.sortOrder);
    });
  });

export function parsePostTrainerWorkoutBody(input: unknown): CreateWorkoutTemplateInput {
  const parsed = postTrainerWorkoutSchema.safeParse(input);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Payload inválido.");
  }

  return parsed.data;
}