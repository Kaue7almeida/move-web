import { NextResponse } from "next/server";

import { ensureFoodDiaryAccess } from "@/bff/core/auth/ensureFoodDiaryAccess";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeFoodDiaryService } from "@/bff/modules/foodDiary/factories/makeFoodDiaryService";

import { parseEstimateActivityBody } from "./schema";

// Interpreta a descrição via IA (structured output) e estima determinístico. Beta-gated.
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const authContext = await ensureFoodDiaryAccess(request);
    const body = await parseEstimateActivityBody(request);

    const result = await makeFoodDiaryService().estimateActivity(
      { userId: authContext.userId, email: authContext.email },
      body,
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
