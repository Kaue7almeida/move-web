import { NextResponse } from "next/server";

import { ensureFoodDiaryAccess } from "@/bff/core/auth/ensureFoodDiaryAccess";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeFoodDiaryService } from "@/bff/modules/foodDiary/factories/makeFoodDiaryService";

import { parseCreateEntryBody } from "./schema";

export async function POST(request: Request) {
  try {
    const authContext = await ensureFoodDiaryAccess(request);
    const body = await parseCreateEntryBody(request);

    const result = await makeFoodDiaryService().createEntryDraft(
      { userId: authContext.userId, email: authContext.email },
      body,
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
