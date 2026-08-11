import { z } from "zod";

import { NextResponse } from "next/server";

import { ensureFoodDiaryAccess } from "@/bff/core/auth/ensureFoodDiaryAccess";
import { ApiError } from "@/bff/core/errors/ApiError";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeFoodDiaryService } from "@/bff/modules/foodDiary/factories/makeFoodDiaryService";

import { parseAnalyzeBody } from "./schema";

// The AI call can take a while — give it generous headroom (mirrors Scan's process).
export const maxDuration = 60;

const entryIdSchema = z.string().uuid();

async function readEntryId(paramsPromise: Promise<{ entryId: string }>) {
  const params = await paramsPromise;
  const parsed = entryIdSchema.safeParse(params.entryId);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Identificador de registro inválido.");
  }

  return parsed.data;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ entryId: string }> },
) {
  try {
    const authContext = await ensureFoodDiaryAccess(request);
    const entryId = await readEntryId(context.params);
    const body = await parseAnalyzeBody(request);

    const result = await makeFoodDiaryService().analyzeEntry(
      { userId: authContext.userId, email: authContext.email },
      entryId,
      body,
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
