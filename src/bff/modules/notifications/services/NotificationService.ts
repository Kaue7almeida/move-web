import { ApiError } from "@/bff/core/errors/ApiError";
import type {
  AppNotification,
  NotificationListResponse,
  NotifyUserInput,
} from "@/bff/modules/notifications/types";
import type { INotificationRepository } from "@/bff/modules/notifications/types/INotificationRepository";

const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 50;

const NOTIFICATION_NOT_FOUND = new ApiError(
  404,
  "notification_not_found",
  "Notificação não encontrada.",
);

export type ListMyNotificationsParams = {
  limit?: number;
  unreadOnly?: boolean;
};

function normalizeLimit(limit?: number): number {
  if (limit === undefined || Number.isNaN(limit)) {
    return DEFAULT_LIST_LIMIT;
  }
  return Math.min(Math.max(1, Math.trunc(limit)), MAX_LIST_LIMIT);
}

export class NotificationService {
  constructor(private readonly notificationRepository: INotificationRepository) {}

  /** Emit a notification to a user. Callers should treat this as best-effort. */
  async notifyUser(input: NotifyUserInput): Promise<AppNotification> {
    return this.notificationRepository.createNotification({
      recipientUserId: input.recipientUserId,
      actorUserId: input.actorUserId ?? null,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      targetPath: input.target?.path ?? null,
      targetType: input.target?.type ?? null,
      targetEntityId: input.target?.entityId ?? null,
      metadata: input.metadata ?? {},
    });
  }

  async listMyNotifications(
    userId: string,
    params: ListMyNotificationsParams = {},
  ): Promise<NotificationListResponse> {
    const [notifications, unreadCount] = await Promise.all([
      this.notificationRepository.listForUser(userId, {
        limit: normalizeLimit(params.limit),
        unreadOnly: params.unreadOnly ?? false,
      }),
      this.notificationRepository.countUnreadForUser(userId),
    ]);

    return { notifications, unreadCount };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.countUnreadForUser(userId);
  }

  async markAsRead(userId: string, notificationId: string): Promise<AppNotification> {
    const updated = await this.notificationRepository.markAsRead(userId, notificationId);

    if (!updated) {
      throw NOTIFICATION_NOT_FOUND;
    }

    return updated;
  }

  async markAllAsRead(userId: string): Promise<number> {
    return this.notificationRepository.markAllAsRead(userId);
  }
}
