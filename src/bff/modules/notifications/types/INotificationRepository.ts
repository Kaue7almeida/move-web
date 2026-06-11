import type {
  AppNotification,
  CreateNotificationInput,
  FindUnreadNotificationByTargetInput,
  ListNotificationsOptions,
  UpdateGroupedNotificationInput,
} from "@/bff/modules/notifications/types";

export interface INotificationRepository {
  createNotification(input: CreateNotificationInput): Promise<AppNotification>;
  /** Finds the unread, non-deleted notification for a recipient/type/target. */
  findUnreadByTarget(
    input: FindUnreadNotificationByTargetInput,
  ): Promise<AppNotification | null>;
  /**
   * Updates an unread notification in place (grouping). Returns null when the
   * row was read/deleted meanwhile — callers should then create a fresh one.
   */
  updateGroupedNotification(
    input: UpdateGroupedNotificationInput,
  ): Promise<AppNotification | null>;
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
