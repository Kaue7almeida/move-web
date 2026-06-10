import { NextResponse } from "next/server";

import { ensureAuthenticated } from "@/bff/core/auth/ensureAuthenticated";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeProfileService } from "@/bff/modules/profile/factories/makeProfileService";

export async function GET(request: Request) {
  try {
    const authContext = await ensureAuthenticated(request);
    const profileService = makeProfileService();

    const inviteSlug = await profileService.ensureInviteSlug({
      userId: authContext.userId,
      email: authContext.email,
    });

    return NextResponse.json({ inviteSlug });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
