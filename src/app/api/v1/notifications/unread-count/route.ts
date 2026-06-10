import { NextResponse } from "next/server";

import { ensureAuthenticated } from "@/bff/core/auth/ensureAuthenticated";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeNotificationService } from "@/bff/modules/notifications/factories/makeNotificationService";

export async function GET(request: Request) {
  try {
    const authContext = await ensureAuthenticated(request);
    const notificationService = makeNotificationService();

    const unreadCount = await notificationService.getUnreadCount(authContext.userId);

    return NextResponse.json({ unreadCount });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
