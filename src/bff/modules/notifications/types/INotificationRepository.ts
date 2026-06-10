import type {
  AppNotification,
  CreateNotificationInput,
  ListNotificationsOptions,
} from "@/bff/modules/notifications/types";

export interface INotificationRepository {
  createNotification(input: CreateNotificationInput): Promise<AppNotification>;
  listForUser(
    recipientUserId: string,
    options: ListNotificationsOptions,
  ): Promise<AppNotification[]>;
  countUnreadForUser(recipientUserId: string): Promise<number>;
  /** Marks one notification read; returns null when it is not the user's. */
  markAsRead(
    recipientUserId: string,
    notificationId: string,
  ): Promise<AppNotification | null>;
  /** Marks all the user's unread notifications read; returns how many changed. */
  markAllAsRead(recipientUserId: string): Promise<number>;
}
