import type { Json } from "@/bff/core/supabase/database.types";

/** Controlled MVP notification types (mirrors the DB check constraint). */
export type NotificationType = "chat_message_received" | "workout_assigned";

/** Serializable deep-link target — reusable by web and a future mobile client. */
export type NotificationTarget = {
  /** Relative path (starts with "/"), e.g. "/app/chat". */
  path: string | null;
  /** Logical target kind, e.g. "chat_conversation" | "student_workout". */
  type: string | null;
  /** Opaque entity id the target points to. */
  entityId: string | null;
};

/** Domain model (camelCase mirror of the notifications row). */
export type AppNotification = {
  id: string;
  recipientUserId: string;
  actorUserId: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  targetPath: string | null;
  targetType: string | null;
  targetEntityId: string | null;
  metadata: Json;
  readAt: string | null;
  createdAt: string;
};

export type NotificationListResponse = {
  notifications: AppNotification[];
  unreadCount: number;
};

export type NotificationUnreadCountResponse = {
  unreadCount: number;
};

/** Input used by other modules to emit a notification. */
export type NotifyUserInput = {
  recipientUserId: string;
  actorUserId?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  target?: NotificationTarget | null;
  metadata?: Json;
};

/** Repository-level create input (flat, all fields resolved). */
export type CreateNotificationInput = {
  recipientUserId: string;
  actorUserId: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  targetPath: string | null;
  targetType: string | null;
  targetEntityId: string | null;
  metadata: Json;
};

export type ListNotificationsOptions = {
  limit: number;
  unreadOnly: boolean;
};
