import { z } from "zod";

import { NextResponse } from "next/server";

import { ensureAuthenticated } from "@/bff/core/auth/ensureAuthenticated";
import { ApiError } from "@/bff/core/errors/ApiError";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeWorkoutService } from "@/bff/modules/workouts/factories/makeWorkoutService";

const paramsSchema = z.object({
  studentUserId: z.string().uuid(),
  sessionId: z.string().uuid(),
});

async function readParams(paramsPromise: Promise<{ studentUserId: string; sessionId: string }>) {
  const params = await paramsPromise;
  const parsed = paramsSchema.safeParse(params);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Identificadores inválidos.");
  }

  return parsed.data;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ studentUserId: string; sessionId: string }> },
) {
  try {
    const authContext = await ensureAuthenticated(request);
    const { studentUserId, sessionId } = await readParams(context.params);
    const workoutService = makeWorkoutService();
    const result = await workoutService.getTrainerStudentWorkoutSession(
      {
        userId: authContext.userId,
        email: authContext.email,
      },
      studentUserId,
      sessionId,
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
