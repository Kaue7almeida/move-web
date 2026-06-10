import { NextResponse } from "next/server";

import { ensureAuthenticated } from "@/bff/core/auth/ensureAuthenticated";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeProfileService } from "@/bff/modules/profile/factories/makeProfileService";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ inviteSlug: string }> },
) {
  try {
    const authContext = await ensureAuthenticated(request);
    const { inviteSlug } = await params;
    const profileService = makeProfileService();

    const result = await profileService.acceptInvite(
      {
        userId: authContext.userId,
        email: authContext.email,
      },
      inviteSlug,
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
