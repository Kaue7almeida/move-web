import { z } from "zod";

import { ApiError } from "@/bff/core/errors/ApiError";

const notificationIdSchema = z.string().uuid();

export async function readNotificationIdParam(
  paramsPromise: Promise<{ notificationId: string }>,
): Promise<string> {
  const params = await paramsPromise;
  const parsed = notificationIdSchema.safeParse(params.notificationId);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Identificador de notificação inválido.");
  }

  return parsed.data;
}
