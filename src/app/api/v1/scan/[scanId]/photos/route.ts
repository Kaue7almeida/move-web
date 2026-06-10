import { z } from "zod";

import { NextResponse } from "next/server";

import { ensureAuthenticated } from "@/bff/core/auth/ensureAuthenticated";
import { ensureStudentProfile } from "@/bff/core/auth/ensureStudentProfile";
import { ApiError } from "@/bff/core/errors/ApiError";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeScanService } from "@/bff/modules/scan/factories/makeScanService";

import { parseUploadPhotoForm } from "./schema";

// Allow up to 60 s for large uploads / slow networks.
export const maxDuration = 60;

const scanIdSchema = z.string().uuid();

async function readScanId(paramsPromise: Promise<{ scanId: string }>) {
  const params = await paramsPromise;
  const parsed = scanIdSchema.safeParse(params.scanId);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Identificador de análise inválido.");
  }

  return parsed.data;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ scanId: string }> },
) {
  try {
    const authContext = await ensureAuthenticated(request);
    await ensureStudentProfile(authContext);

    const scanId = await readScanId(context.params);
    const { slot, file } = await parseUploadPhotoForm(request);

    const result = await makeScanService().uploadScanPhoto(
      { userId: authContext.userId, email: authContext.email },
      scanId,
      { slot, file },
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
