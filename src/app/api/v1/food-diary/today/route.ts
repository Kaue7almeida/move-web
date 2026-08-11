import { NextResponse } from "next/server";

import { ensureFoodDiaryAccess } from "@/bff/core/auth/ensureFoodDiaryAccess";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeFoodDiaryService } from "@/bff/modules/foodDiary/factories/makeFoodDiaryService";

export async function GET(request: Request) {
  try {
    const authContext = await ensureFoodDiaryAccess(request);

    // Optional local calendar day (YYYY-MM-DD). Not a security input — ownership is
    // always the authenticated userId; this only selects which day to read. The
    // service validates the format and defaults to the current server (UTC) day.
    const date = new URL(request.url).searchParams.get("date") ?? undefined;

    const result = await makeFoodDiaryService().getToday(
      { userId: authContext.userId, email: authContext.email },
      { date },
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
