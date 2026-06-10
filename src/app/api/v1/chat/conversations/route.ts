import { NextResponse } from "next/server";

import { ensureAuthenticated } from "@/bff/core/auth/ensureAuthenticated";
import { ApiError } from "@/bff/core/errors/ApiError";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeChatService } from "@/bff/modules/chat/factories/makeChatService";

import { parsePostChatConversationBody } from "./schema";

async function readPostChatConversationBody(request: Request) {
  try {
    const body: unknown = await request.json();

    return parsePostChatConversationBody(body);
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(400, "invalid_request", "Payload inválido.");
  }
}

export async function GET(request: Request) {
  try {
    const authContext = await ensureAuthenticated(request);
    const chatService = makeChatService();
    const conversations = await chatService.listConversationsForUser(authContext.userId);

    return NextResponse.json({ conversations });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const authContext = await ensureAuthenticated(request);
    const body = await readPostChatConversationBody(request);
    const chatService = makeChatService();
    const conversation = await chatService.createConversation(authContext.userId, body);

    return NextResponse.json({ conversation });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
