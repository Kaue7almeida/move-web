import { z } from "zod";

import { NextResponse } from "next/server";

import { ensureAuthenticated } from "@/bff/core/auth/ensureAuthenticated";
import { ApiError } from "@/bff/core/errors/ApiError";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeProfileService } from "@/bff/modules/profile/factories/makeProfileService";

const trainerUserIdSchema = z.string().uuid();

async function readTrainerUserId(paramsPromise: Promise<{ trainerUserId: string }>) {
  const params = await paramsPromise;
  const parsed = trainerUserIdSchema.safeParse(params.trainerUserId);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Identificador de personal inválido.");
  }

  return parsed.data;
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ trainerUserId: string }> },
) {
  try {
    const authContext = await ensureAuthenticated(request);
    const trainerUserId = await readTrainerUserId(context.params);
    const profileService = makeProfileService();
    const result = await profileService.leaveTrainerByStudent(
      {
        userId: authContext.userId,
        email: authContext.email,
      },
      trainerUserId,
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
