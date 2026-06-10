import { z } from "zod";

import { NextResponse } from "next/server";

import { ensureAuthenticated } from "@/bff/core/auth/ensureAuthenticated";
import { ApiError } from "@/bff/core/errors/ApiError";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeWorkoutService } from "@/bff/modules/workouts/factories/makeWorkoutService";

const sessionIdSchema = z.string().uuid();

async function readSessionId(paramsPromise: Promise<{ sessionId: string }>) {
  const params = await paramsPromise;
  const parsed = sessionIdSchema.safeParse(params.sessionId);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Identificador de sessão inválido.");
  }

  return parsed.data;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const authContext = await ensureAuthenticated(request);
    const sessionId = await readSessionId(context.params);
    const workoutService = makeWorkoutService();
    const result = await workoutService.getStudentWorkoutSession(
      {
        userId: authContext.userId,
        email: authContext.email,
      },
      sessionId,
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
