import { NextResponse } from "next/server";

import { ensureAuthenticated } from "@/bff/core/auth/ensureAuthenticated";
import { ensureStudentProfile } from "@/bff/core/auth/ensureStudentProfile";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeScanService } from "@/bff/modules/scan/factories/makeScanService";

import { readScanIdParam } from "./schema";

// AI call can take ~30s — give it generous headroom.
export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: Promise<{ scanId: string }> },
) {
  try {
    const authContext = await ensureAuthenticated(request);
    await ensureStudentProfile(authContext);

    const scanId = await readScanIdParam(context.params);

    const result = await makeScanService().processScan(
      { userId: authContext.userId, email: authContext.email },
      scanId,
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
