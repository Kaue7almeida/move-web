import { NextResponse } from "next/server";

import { ensureAuthenticated } from "@/bff/core/auth/ensureAuthenticated";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { listChatStarters } from "@/bff/modules/chat/data/chatStarters";

export async function GET(request: Request) {
  try {
    await ensureAuthenticated(request);

    return NextResponse.json({ starters: listChatStarters() });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
