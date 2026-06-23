import { z } from "zod";

import { NextResponse } from "next/server";

import { ensureAuthenticated } from "@/bff/core/auth/ensureAuthenticated";
import { ApiError } from "@/bff/core/errors/ApiError";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeWorkoutService } from "@/bff/modules/workouts/factories/makeWorkoutService";

const studentUserIdSchema = z.string().uuid();

async function readStudentUserId(paramsPromise: Promise<{ studentUserId: string }>) {
  const params = await paramsPromise;
  const parsed = studentUserIdSchema.safeParse(params.studentUserId);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Identificador de aluno inválido.");
  }

  return parsed.data;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ studentUserId: string }> },
) {
  try {
    const authContext = await ensureAuthenticated(request);
    const studentUserId = await readStudentUserId(context.params);
    const workoutService = makeWorkoutService();
    const result = await workoutService.getTrainerStudentWorkouts(
      {
        userId: authContext.userId,
        email: authContext.email,
      },
      studentUserId,
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
