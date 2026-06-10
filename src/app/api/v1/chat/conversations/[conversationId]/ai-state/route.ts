import { NextResponse } from "next/server";

import { ensureAuthenticated } from "@/bff/core/auth/ensureAuthenticated";
import { ApiError } from "@/bff/core/errors/ApiError";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeChatService } from "@/bff/modules/chat/factories/makeChatService";

import {
  parsePatchConversationAiStateBody,
  readConversationIdParam,
} from "./schema";

async function readPatchConversationAiStateBody(request: Request) {
  try {
    const body: unknown = await request.json();

    return parsePatchConversationAiStateBody(body);
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(400, "invalid_request", "Payload invalido.");
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ conversationId: string }> },
) {
  try {
    const authContext = await ensureAuthenticated(request);
    const conversationId = await readConversationIdParam(context.params);
    const action = await readPatchConversationAiStateBody(request);
    const chatService = makeChatService();
    const result = await chatService.updateConversationAiState(
      authContext.userId,
      conversationId,
      action,
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
