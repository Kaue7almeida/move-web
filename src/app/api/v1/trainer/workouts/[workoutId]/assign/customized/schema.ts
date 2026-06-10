import { z } from "zod";

import { ApiError } from "@/bff/core/errors/ApiError";
import type { AssignCustomizedWorkoutToStudentInput } from "@/bff/modules/workouts/types";

const optionalTextField = z.string().trim().min(1).optional();

const customizedWorkoutExerciseSchema = z
  .object({
    exerciseId: z.string().uuid(),
    sortOrder: z.number().int().positive(),
    setsCount: z.number().int().positive(),
    repsText: z.string().trim().min(1),
    restSeconds: z.number().int().nonnegative().optional(),
    notes: optionalTextField,
  })
  .strict();

const postCustomizedAssignWorkoutSchema = z
  .object({
    studentUserId: z.string().uuid(),
    title: z.string().trim().min(1),
    description: optionalTextField,
    exercises: z.array(customizedWorkoutExerciseSchema).min(1).max(20),
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

export function parsePostCustomizedAssignWorkoutBody(
  input: unknown,
): AssignCustomizedWorkoutToStudentInput {
  const parsed = postCustomizedAssignWorkoutSchema.safeParse(input);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Payload inválido.");
  }

  return parsed.data;
}