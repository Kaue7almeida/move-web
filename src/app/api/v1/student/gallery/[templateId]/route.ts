import { z } from "zod";

import { NextResponse } from "next/server";

import { ensureAuthenticated } from "@/bff/core/auth/ensureAuthenticated";
import { ApiError } from "@/bff/core/errors/ApiError";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeWorkoutService } from "@/bff/modules/workouts/factories/makeWorkoutService";

const templateIdSchema = z.string().uuid();

async function readTemplateId(paramsPromise: Promise<{ templateId: string }>) {
  const params = await paramsPromise;
  const parsed = templateIdSchema.safeParse(params.templateId);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Identificador de treino inválido.");
  }

  return parsed.data;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ templateId: string }> },
) {
  try {
    const authContext = await ensureAuthenticated(request);
    const templateId = await readTemplateId(context.params);
    const workoutService = makeWorkoutService();
    const result = await workoutService.getStudentGalleryTemplate(
      {
        userId: authContext.userId,
        email: authContext.email,
      },
      templateId,
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
