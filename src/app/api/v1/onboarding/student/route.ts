import { NextResponse } from "next/server";

import { ensureAuthenticated } from "@/bff/core/auth/ensureAuthenticated";
import { ApiError } from "@/bff/core/errors/ApiError";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeProfileService } from "@/bff/modules/profile/factories/makeProfileService";

import { parsePutStudentOnboardingBody } from "./schema";

async function readPutStudentOnboardingBody(request: Request) {
  try {
    const body: unknown = await request.json();

    return parsePutStudentOnboardingBody(body);
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(400, "invalid_request", "Payload inválido.");
  }
}

export async function PUT(request: Request) {
  try {
    const authContext = await ensureAuthenticated(request);
    const body = await readPutStudentOnboardingBody(request);
    const profileService = makeProfileService();

    const me = await profileService.upsertStudentOnboarding(
      {
        userId: authContext.userId,
        email: authContext.email,
      },
      body,
    );

    return NextResponse.json(me);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}