import { NextResponse } from "next/server";

import { ensureAuthenticated } from "@/bff/core/auth/ensureAuthenticated";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeChatService } from "@/bff/modules/chat/factories/makeChatService";

import { readConversationIdParam } from "./schema";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ conversationId: string }> },
) {
  try {
    const authContext = await ensureAuthenticated(request);
    const conversationId = await readConversationIdParam(context.params);
    const chatService = makeChatService();

    await chatService.deleteEmptyMoveAiConversation(authContext.userId, conversationId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
