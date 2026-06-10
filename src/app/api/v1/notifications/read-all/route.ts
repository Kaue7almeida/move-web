import { NextResponse } from "next/server";

import { ensureAuthenticated } from "@/bff/core/auth/ensureAuthenticated";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeNotificationService } from "@/bff/modules/notifications/factories/makeNotificationService";

export async function POST(request: Request) {
  try {
    const authContext = await ensureAuthenticated(request);
    const notificationService = makeNotificationService();

    const updatedCount = await notificationService.markAllAsRead(authContext.userId);

    return NextResponse.json({ updatedCount });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
