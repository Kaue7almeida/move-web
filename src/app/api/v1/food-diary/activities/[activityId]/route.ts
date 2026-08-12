import { z } from "zod";

import { NextResponse } from "next/server";

import { ensureFoodDiaryAccess } from "@/bff/core/auth/ensureFoodDiaryAccess";
import { ApiError } from "@/bff/core/errors/ApiError";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeFoodDiaryService } from "@/bff/modules/foodDiary/factories/makeFoodDiaryService";

const activityIdSchema = z.string().uuid();

async function readActivityId(paramsPromise: Promise<{ activityId: string }>) {
  const params = await paramsPromise;
  const parsed = activityIdSchema.safeParse(params.activityId);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Identificador de atividade inválido.");
  }

  return parsed.data;
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ activityId: string }> },
) {
  try {
    const authContext = await ensureFoodDiaryAccess(request);
    const activityId = await readActivityId(context.params);

    const result = await makeFoodDiaryService().removeActivity(
      { userId: authContext.userId, email: authContext.email },
      activityId,
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
