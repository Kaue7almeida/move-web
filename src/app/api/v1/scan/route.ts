import { NextResponse } from "next/server";

import { ensureAuthenticated } from "@/bff/core/auth/ensureAuthenticated";
import { ensureStudentProfile } from "@/bff/core/auth/ensureStudentProfile";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeScanService } from "@/bff/modules/scan/factories/makeScanService";

import { parseCreateScanBody } from "./schema";

export async function GET(request: Request) {
  try {
    const authContext = await ensureAuthenticated(request);
    await ensureStudentProfile(authContext);

    const result = await makeScanService().listScansForStudent({
      userId: authContext.userId,
      email: authContext.email,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const authContext = await ensureAuthenticated(request);
    await ensureStudentProfile(authContext);

    const body = await parseCreateScanBody(request);

    const result = await makeScanService().createDraft(
      { userId: authContext.userId, email: authContext.email },
      body,
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
