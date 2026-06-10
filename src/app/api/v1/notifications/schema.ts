import { z } from "zod";

import type { ListMyNotificationsParams } from "@/bff/modules/notifications/services/NotificationService";

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  unreadOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});

export function parseListNotificationsQuery(
  searchParams: URLSearchParams,
): ListMyNotificationsParams {
  const parsed = listQuerySchema.safeParse({
    limit: searchParams.get("limit") ?? undefined,
    unreadOnly: searchParams.get("unreadOnly") ?? undefined,
  });

  if (!parsed.success) {
    return {};
  }

  return {
    limit: parsed.data.limit,
    unreadOnly: parsed.data.unreadOnly,
  };
}
