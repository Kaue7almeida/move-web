import { NextResponse } from "next/server";

import { ensureAuthenticated } from "@/bff/core/auth/ensureAuthenticated";
import { ApiError } from "@/bff/core/errors/ApiError";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeProfileService } from "@/bff/modules/profile/factories/makeProfileService";

import { parsePostTrainerStudentBody } from "./schema";

async function readPostTrainerStudentBody(request: Request) {
  try {
    const body: unknown = await request.json();

    return parsePostTrainerStudentBody(body);
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(400, "invalid_request", "Payload inválido.");
  }
}

export async function GET(request: Request) {
  try {
    const authContext = await ensureAuthenticated(request);
    const profileService = makeProfileService();

    const result = await profileService.getStudentsForTrainer({
      userId: authContext.userId,
      email: authContext.email,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const authContext = await ensureAuthenticated(request);
    const body = await readPostTrainerStudentBody(request);
    const profileService = makeProfileService();

    const result = await profileService.addStudentForTrainer(
      {
        userId: authContext.userId,
        email: authContext.email,
      },
      body,
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}