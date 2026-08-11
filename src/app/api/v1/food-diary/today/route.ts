import { NextResponse } from "next/server";

import { ensureFoodDiaryAccess } from "@/bff/core/auth/ensureFoodDiaryAccess";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeFoodDiaryService } from "@/bff/modules/foodDiary/factories/makeFoodDiaryService";

export async function GET(request: Request) {
  try {
    const authContext = await ensureFoodDiaryAccess(request);

    // Optional local calendar day (YYYY-MM-DD) + IANA time zone (tz). Not security
    // inputs — ownership is always the authenticated userId; they only select which
    // local day to read. The service validates the date and falls back to UTC for an
    // absent/invalid tz.
    const url = new URL(request.url);
    const date = url.searchParams.get("date") ?? undefined;
    const timeZone = url.searchParams.get("tz") ?? undefined;

    const result = await makeFoodDiaryService().getToday(
      { userId: authContext.userId, email: authContext.email },
      { date, timeZone },
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
