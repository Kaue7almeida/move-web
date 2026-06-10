import { z } from "zod";

import { NextResponse } from "next/server";

import { ensureAuthenticated } from "@/bff/core/auth/ensureAuthenticated";
import { ApiError } from "@/bff/core/errors/ApiError";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeWorkoutService } from "@/bff/modules/workouts/factories/makeWorkoutService";

const studentWorkoutIdSchema = z.string().uuid();

async function readStudentWorkoutId(paramsPromise: Promise<{ studentWorkoutId: string }>) {
  const params = await paramsPromise;
  const parsed = studentWorkoutIdSchema.safeParse(params.studentWorkoutId);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Identificador de treino inválido.");
  }

  return parsed.data;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ studentWorkoutId: string }> },
) {
  try {
    const authContext = await ensureAuthenticated(request);
    const studentWorkoutId = await readStudentWorkoutId(context.params);
    const workoutService = makeWorkoutService();
    const result = await workoutService.getStudentWorkout(
      {
        userId: authContext.userId,
        email: authContext.email,
      },
      studentWorkoutId,
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
