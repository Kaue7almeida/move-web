import { NextResponse } from "next/server";

import { ensureAuthenticated } from "@/bff/core/auth/ensureAuthenticated";
import { ApiError } from "@/bff/core/errors/ApiError";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeChatService } from "@/bff/modules/chat/factories/makeChatService";

import { parseSendMoveAiMessageBody } from "./schema";

async function readSendMoveAiMessageBody(request: Request) {
  try {
    const body: unknown = await request.json();

    return parseSendMoveAiMessageBody(body);
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(400, "invalid_request", "Payload inválido.");
  }
}

export async function POST(request: Request) {
  try {
    const authContext = await ensureAuthenticated(request);
    const body = await readSendMoveAiMessageBody(request);
    const chatService = makeChatService();
    const message = await chatService.sendMoveAiMessage(authContext.userId, body);

    return NextResponse.json({ message });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
