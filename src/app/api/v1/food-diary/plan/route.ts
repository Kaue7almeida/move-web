import { NextResponse } from "next/server";

import { ensureFoodDiaryAccess } from "@/bff/core/auth/ensureFoodDiaryAccess";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeFoodDiaryService } from "@/bff/modules/foodDiary/factories/makeFoodDiaryService";

import { parseUpsertPlanBody } from "./schema";

export async function GET(request: Request) {
  try {
    const authContext = await ensureFoodDiaryAccess(request);

    const result = await makeFoodDiaryService().getPlan({
      userId: authContext.userId,
      email: authContext.email,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const authContext = await ensureFoodDiaryAccess(request);
    const body = await parseUpsertPlanBody(request);

    const result = await makeFoodDiaryService().upsertPlan(
      { userId: authContext.userId, email: authContext.email },
      body,
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
