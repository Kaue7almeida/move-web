import { z } from "zod";

import { NextResponse } from "next/server";

import { ensureAuthenticated } from "@/bff/core/auth/ensureAuthenticated";
import { ApiError } from "@/bff/core/errors/ApiError";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeWorkoutService } from "@/bff/modules/workouts/factories/makeWorkoutService";

import { parseCreateWorkoutSessionBody } from "./schema";

const studentWorkoutIdSchema = z.string().uuid();

async function readStudentWorkoutId(paramsPromise: Promise<{ studentWorkoutId: string }>) {
  const params = await paramsPromise;
  const parsed = studentWorkoutIdSchema.safeParse(params.studentWorkoutId);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Identificador de treino inválido.");
  }

  return parsed.data;
}

async function readBody(request: Request) {
  try {
    const body: unknown = await request.json();

    return parseCreateWorkoutSessionBody(body);
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(400, "invalid_request", "Payload inválido.");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ studentWorkoutId: string }> },
) {
  try {
    const authContext = await ensureAuthenticated(request);
    const studentWorkoutId = await readStudentWorkoutId(context.params);
    const body = await readBody(request);
    const workoutService = makeWorkoutService();
    const result = await workoutService.createWorkoutSession(
      {
        userId: authContext.userId,
        email: authContext.email,
      },
      studentWorkoutId,
      body,
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
