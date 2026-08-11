import { NextResponse } from "next/server";

import { ensureFoodDiaryAccess } from "@/bff/core/auth/ensureFoodDiaryAccess";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeFoodDiaryService } from "@/bff/modules/foodDiary/factories/makeFoodDiaryService";

export async function GET(request: Request) {
  try {
    const authContext = await ensureFoodDiaryAccess(request);

    // Optional last day of the 7-day window (YYYY-MM-DD). Defaults to the current
    // server (UTC) day; the service validates the format.
    const date = new URL(request.url).searchParams.get("date") ?? undefined;

    const result = await makeFoodDiaryService().getHistory(
      { userId: authContext.userId, email: authContext.email },
      { date },
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
