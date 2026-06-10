import { createSupabaseAdminClient } from "@/bff/core/supabase/server";
import { ChatRepository } from "@/bff/modules/chat/infra/ChatRepository";
import { ChatContextTriggerRegistry } from "@/bff/modules/chat/context-triggers/chatContextTriggers";
import { WorkoutUnderstandTrigger } from "@/bff/modules/chat/context-triggers/builders/workoutUnderstandTrigger";
import { ScanUnderstandResultTrigger } from "@/bff/modules/chat/context-triggers/builders/scanUnderstandResultTrigger";
import { OpenAiChatClient } from "@/bff/modules/chat/infra/OpenAiChatClient";
import { ChatService } from "@/bff/modules/chat/services/ChatService";
import { makeNotificationService } from "@/bff/modules/notifications/factories/makeNotificationService";
import { makeWorkoutService } from "@/bff/modules/workouts/factories/makeWorkoutService";
import { makeScanService } from "@/bff/modules/scan/factories/makeScanService";

export function makeChatService() {
  const supabase = createSupabaseAdminClient();
  const chatRepository = new ChatRepository(supabase);
  const openAiChatClient = new OpenAiChatClient(
    process.env.OPENAI_API_KEY,
    process.env.OPENAI_CHAT_MODEL,
  );

  const workoutService = makeWorkoutService();
  const scanService = makeScanService();
  const contextTriggerResolver = new ChatContextTriggerRegistry([
    new WorkoutUnderstandTrigger(workoutService),
    new ScanUnderstandResultTrigger(scanService),
  ]);
  const notificationService = makeNotificationService();

  return new ChatService(
    chatRepository,
    openAiChatClient,
    contextTriggerResolver,
    notificationService,
  );
}
