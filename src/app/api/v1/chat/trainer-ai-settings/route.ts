import { NextResponse } from "next/server";

import { ensureAuthenticated } from "@/bff/core/auth/ensureAuthenticated";
import { ApiError } from "@/bff/core/errors/ApiError";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeChatService } from "@/bff/modules/chat/factories/makeChatService";

import { parsePatchTrainerAiSettingsBody } from "./schema";

async function readPatchTrainerAiSettingsBody(request: Request) {
  try {
    const body: unknown = await request.json();

    return parsePatchTrainerAiSettingsBody(body);
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(400, "invalid_request", "Payload invalido.");
  }
}

export async function GET(request: Request) {
  try {
    const authContext = await ensureAuthenticated(request);
    const chatService = makeChatService();
    const settings = await chatService.getTrainerAiSettings(authContext.userId);

    return NextResponse.json({ settings });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const authContext = await ensureAuthenticated(request);
    const body = await readPatchTrainerAiSettingsBody(request);
    const chatService = makeChatService();
    const settings = await chatService.updateTrainerAiSettings(authContext.userId, body);

    return NextResponse.json({ settings });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
