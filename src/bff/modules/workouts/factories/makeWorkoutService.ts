import { createSupabaseAdminClient } from "@/bff/core/supabase/server";
import { makeNotificationService } from "@/bff/modules/notifications/factories/makeNotificationService";
import { WorkoutRepository } from "@/bff/modules/workouts/infra/WorkoutRepository";
import { WorkoutService } from "@/bff/modules/workouts/services/WorkoutService";

export function makeWorkoutService() {
  const supabase = createSupabaseAdminClient();
  const workoutRepository = new WorkoutRepository(supabase);
  const notificationService = makeNotificationService();

  return new WorkoutService(workoutRepository, notificationService);
}