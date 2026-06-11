import { ApiError } from "@/bff/core/errors/ApiError";
import type { Json } from "@/bff/core/supabase/database.types";
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

/**
 * Grouped emission: instead of one row per event, an unread notification for
 * the same recipient/type/target is updated in place with a running count.
 */
export type NotifyUserGroupedInput = NotifyUserInput & {
  /** Copy overrides applied when the notification groups 2+ events. */
  groupedTitle?: (eventCount: number) => string;
  groupedBody?: (eventCount: number) => string;
};

function normalizeLimit(limit?: number): number {
  if (limit === undefined || Number.isNaN(limit)) {
    return DEFAULT_LIST_LIMIT;
  }
  return Math.min(Math.max(1, Math.trunc(limit)), MAX_LIST_LIMIT);
}

function asJsonObject(value: Json | undefined): { [key: string]: Json | undefined } {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value;
  }
  return {};
}

function readMessageCount(metadata: Json): number {
  const count = asJsonObject(metadata).messageCount;
  if (typeof count === "number" && Number.isFinite(count) && count >= 1) {
    return Math.trunc(count);
  }
  return 1;
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

  /**
   * Emits a notification, coalescing into an existing UNREAD one for the same
   * recipient + type + target.entityId instead of creating a new row. The
   * grouped row gets messageCount in metadata and its created_at bumped so it
   * resurfaces at the top of the list. Falls back to a plain create when there
   * is no target entity id or the unread row was read/deleted meanwhile.
   */
  async notifyUserGrouped(input: NotifyUserGroupedInput): Promise<AppNotification> {
    const { groupedTitle, groupedBody, ...notifyInput } = input;
    const targetEntityId = notifyInput.target?.entityId ?? null;
    const baseMetadata = asJsonObject(notifyInput.metadata);

    if (targetEntityId) {
      const existing = await this.notificationRepository.findUnreadByTarget({
        recipientUserId: notifyInput.recipientUserId,
        type: notifyInput.type,
        targetEntityId,
      });

      if (existing) {
        const messageCount = readMessageCount(existing.metadata) + 1;
        const updated = await this.notificationRepository.updateGroupedNotification({
          notificationId: existing.id,
          actorUserId: notifyInput.actorUserId ?? null,
          title: groupedTitle?.(messageCount) ?? notifyInput.title,
          body: groupedBody?.(messageCount) ?? notifyInput.body ?? null,
          metadata: { ...baseMetadata, messageCount },
          createdAt: new Date().toISOString(),
        });

        if (updated) {
          return updated;
        }
      }
    }

    return this.notifyUser({
      ...notifyInput,
      metadata: { ...baseMetadata, messageCount: 1 },
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
