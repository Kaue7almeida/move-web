import type {
  AppNotification,
  NotificationListResponse,
  NotificationUnreadCountResponse,
} from "@/bff/modules/notifications/types";
import { authenticatedFetch, readApiErrorMessage } from "@/services/api/authenticatedFetch";

export type ListNotificationsParams = {
  limit?: number;
  unreadOnly?: boolean;
};

export async function listNotifications(
  params: ListNotificationsParams = {},
): Promise<NotificationListResponse> {
  const search = new URLSearchParams();
  if (params.limit !== undefined) {
    search.set("limit", String(params.limit));
  }
  if (params.unreadOnly) {
    search.set("unreadOnly", "true");
  }

  const query = search.toString();
  const response = await authenticatedFetch(
    `/api/v1/notifications${query ? `?${query}` : ""}`,
    { method: "GET" },
  );

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response, "Não foi possível carregar as notificações."));
  }

  return (await response.json()) as NotificationListResponse;
}

export async function getUnreadCount(): Promise<number> {
  const response = await authenticatedFetch("/api/v1/notifications/unread-count", {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response, "Não foi possível carregar as notificações."));
  }

  const payload = (await response.json()) as NotificationUnreadCountResponse;
  return payload.unreadCount;
}

export async function markNotificationRead(notificationId: string): Promise<AppNotification> {
  const response = await authenticatedFetch(
    `/api/v1/notifications/${notificationId}/read`,
    { method: "PATCH" },
  );

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response, "Não foi possível atualizar a notificação."));
  }

  const payload = (await response.json()) as { notification: AppNotification };
  return payload.notification;
}

export async function markAllNotificationsRead(): Promise<number> {
  const response = await authenticatedFetch("/api/v1/notifications/read-all", {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response, "Não foi possível atualizar as notificações."));
  }

  const payload = (await response.json()) as { updatedCount: number };
  return payload.updatedCount;
}
