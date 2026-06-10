import { createSupabaseAdminClient } from "@/bff/core/supabase/server";
import { NotificationRepository } from "@/bff/modules/notifications/infra/NotificationRepository";
import { NotificationService } from "@/bff/modules/notifications/services/NotificationService";

export function makeNotificationService(): NotificationService {
  const supabase = createSupabaseAdminClient();
  const notificationRepository = new NotificationRepository(supabase);

  return new NotificationService(notificationRepository);
}
