import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "@/bff/core/errors/ApiError";
import type { Database } from "@/bff/core/supabase/database.types";
import type {
  AppNotification,
  CreateNotificationInput,
  ListNotificationsOptions,
  NotificationType,
} from "@/bff/modules/notifications/types";
import type { INotificationRepository } from "@/bff/modules/notifications/types/INotificationRepository";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

const NOTIFICATION_CREATE_FAILED = new ApiError(
  500,
  "notification_create_failed",
  "Não foi possível registrar a notificação.",
);

const NOTIFICATION_QUERY_FAILED = new ApiError(
  500,
  "notification_query_failed",
  "Não foi possível carregar as notificações.",
);

const NOTIFICATION_UPDATE_FAILED = new ApiError(
  500,
  "notification_update_failed",
  "Não foi possível atualizar a notificação.",
);

function mapRow(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    recipientUserId: row.recipient_user_id,
    actorUserId: row.actor_user_id,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body,
    targetPath: row.target_path,
    targetType: row.target_type,
    targetEntityId: row.target_entity_id,
    metadata: row.metadata,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export class NotificationRepository implements INotificationRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async createNotification(input: CreateNotificationInput): Promise<AppNotification> {
    const { data, error } = await this.supabase
      .from("notifications")
      .insert({
        recipient_user_id: input.recipientUserId,
        actor_user_id: input.actorUserId,
        type: input.type,
        title: input.title,
        body: input.body,
        target_path: input.targetPath,
        target_type: input.targetType,
        target_entity_id: input.targetEntityId,
        metadata: input.metadata,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw NOTIFICATION_CREATE_FAILED;
    }

    return mapRow(data);
  }

  async listForUser(
    recipientUserId: string,
    options: ListNotificationsOptions,
  ): Promise<AppNotification[]> {
    let query = this.supabase
      .from("notifications")
      .select("*")
      .eq("recipient_user_id", recipientUserId)
      .is("deleted_at", null);

    if (options.unreadOnly) {
      query = query.is("read_at", null);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(options.limit);

    if (error) {
      throw NOTIFICATION_QUERY_FAILED;
    }

    return (data ?? []).map(mapRow);
  }

  async countUnreadForUser(recipientUserId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_user_id", recipientUserId)
      .is("deleted_at", null)
      .is("read_at", null);

    if (error) {
      throw NOTIFICATION_QUERY_FAILED;
    }

    return count ?? 0;
  }

  async markAsRead(
    recipientUserId: string,
    notificationId: string,
  ): Promise<AppNotification | null> {
    const { data, error } = await this.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("recipient_user_id", recipientUserId)
      .is("deleted_at", null)
      .select("*")
      .maybeSingle();

    if (error) {
      throw NOTIFICATION_UPDATE_FAILED;
    }

    return data ? mapRow(data) : null;
  }

  async markAllAsRead(recipientUserId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_user_id", recipientUserId)
      .is("deleted_at", null)
      .is("read_at", null)
      .select("id");

    if (error) {
      throw NOTIFICATION_UPDATE_FAILED;
    }

    return data?.length ?? 0;
  }
}
