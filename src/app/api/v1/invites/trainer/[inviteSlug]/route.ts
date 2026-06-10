import { NextResponse } from "next/server";

import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeProfileService } from "@/bff/modules/profile/factories/makeProfileService";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ inviteSlug: string }> },
) {
  try {
    const { inviteSlug } = await params;
    const profileService = makeProfileService();
    const result = await profileService.getTrainerPublicBySlug(inviteSlug);

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
