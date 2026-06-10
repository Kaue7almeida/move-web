import { NextResponse } from "next/server";

import { ensureAuthenticated } from "@/bff/core/auth/ensureAuthenticated";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeNotificationService } from "@/bff/modules/notifications/factories/makeNotificationService";

import { readNotificationIdParam } from "./schema";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ notificationId: string }> },
) {
  try {
    const authContext = await ensureAuthenticated(request);
    const notificationId = await readNotificationIdParam(context.params);
    const notificationService = makeNotificationService();

    const notification = await notificationService.markAsRead(authContext.userId, notificationId);

    return NextResponse.json({ notification });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
