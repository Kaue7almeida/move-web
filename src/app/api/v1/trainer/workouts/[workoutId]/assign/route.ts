import { z } from "zod";

import { NextResponse } from "next/server";

import { ensureAuthenticated } from "@/bff/core/auth/ensureAuthenticated";
import { ApiError } from "@/bff/core/errors/ApiError";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeWorkoutService } from "@/bff/modules/workouts/factories/makeWorkoutService";

import { parsePostAssignWorkoutBody } from "./schema";

const workoutIdSchema = z.string().uuid();

async function readWorkoutId(paramsPromise: Promise<{ workoutId: string }>) {
  const params = await paramsPromise;
  const parsed = workoutIdSchema.safeParse(params.workoutId);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Identificador de treino inválido.");
  }

  return parsed.data;
}

async function readPostAssignWorkoutBody(request: Request) {
  try {
    const body: unknown = await request.json();

    return parsePostAssignWorkoutBody(body);
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(400, "invalid_request", "Payload inválido.");
  }
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/v1/trainer/workouts/[workoutId]/assign">,
) {
  try {
    const authContext = await ensureAuthenticated(request);
    const workoutId = await readWorkoutId(context.params);
    const body = await readPostAssignWorkoutBody(request);
    const workoutService = makeWorkoutService();
    const result = await workoutService.assignWorkoutToStudent(
      {
        userId: authContext.userId,
        email: authContext.email,
      },
      workoutId,
      body,
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}