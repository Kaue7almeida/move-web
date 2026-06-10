import { NextResponse } from "next/server";

import { ensureAuthenticated } from "@/bff/core/auth/ensureAuthenticated";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeNotificationService } from "@/bff/modules/notifications/factories/makeNotificationService";

import { parseListNotificationsQuery } from "./schema";

export async function GET(request: Request) {
  try {
    const authContext = await ensureAuthenticated(request);
    const params = parseListNotificationsQuery(new URL(request.url).searchParams);
    const notificationService = makeNotificationService();

    const result = await notificationService.listMyNotifications(authContext.userId, params);

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
