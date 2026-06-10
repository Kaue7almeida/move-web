import { NextResponse } from "next/server";

import { ensureAuthenticated } from "@/bff/core/auth/ensureAuthenticated";
import { ApiError } from "@/bff/core/errors/ApiError";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeChatService } from "@/bff/modules/chat/factories/makeChatService";

import { parsePostHumanMessageBody, readConversationIdParam } from "./schema";

async function readPostHumanMessageBody(request: Request, conversationId: string) {
  try {
    const body: unknown = await request.json();

    return parsePostHumanMessageBody(conversationId, body);
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(400, "invalid_request", "Payload inválido.");
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ conversationId: string }> },
) {
  try {
    const authContext = await ensureAuthenticated(request);
    const conversationId = await readConversationIdParam(context.params);
    const chatService = makeChatService();
    const messages = await chatService.listMessages(authContext.userId, conversationId);

    return NextResponse.json({ messages });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ conversationId: string }> },
) {
  try {
    const authContext = await ensureAuthenticated(request);
    const conversationId = await readConversationIdParam(context.params);
    const body = await readPostHumanMessageBody(request, conversationId);
    const chatService = makeChatService();
    const result = await chatService.sendHumanMessage(authContext.userId, body);

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
