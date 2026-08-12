import { NextResponse } from "next/server";

import { ensureFoodDiaryAccess } from "@/bff/core/auth/ensureFoodDiaryAccess";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeFoodDiaryService } from "@/bff/modules/foodDiary/factories/makeFoodDiaryService";

export async function GET(request: Request) {
  try {
    const authContext = await ensureFoodDiaryAccess(request);

    // Optional last day of the 7-day window (YYYY-MM-DD) + IANA time zone (tz).
    // The service validates the date and falls back to UTC for an absent/invalid tz.
    const url = new URL(request.url);
    const date = url.searchParams.get("date") ?? undefined;
    const timeZone = url.searchParams.get("tz") ?? undefined;

    const result = await makeFoodDiaryService().getHistory(
      { userId: authContext.userId, email: authContext.email },
      { date, timeZone },
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
