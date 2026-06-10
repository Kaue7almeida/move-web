import { NextResponse } from "next/server";

import { ensureAuthenticated } from "@/bff/core/auth/ensureAuthenticated";
import { ensureStudentProfile } from "@/bff/core/auth/ensureStudentProfile";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeScanAiService } from "@/bff/modules/scan/factories/makeScanAiService";

import { parseAnalyzeScanPreviewBody } from "./schema";

// Allow up to 60 s for the AI call (Vercel/Next.js App Router).
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    // 1) Authenticate — userId comes from the token, never from the body.
    const authContext = await ensureAuthenticated(request);

    // 2) Require a student_profile — trainers/admins without one are rejected.
    await ensureStudentProfile(authContext);

    const body = await parseAnalyzeScanPreviewBody(request);

    const scanAiService = makeScanAiService();
    const result = await scanAiService.analyzePreview({
      frontImageUrl: body.frontImageUrl,
      sideImageUrl: body.sideImageUrl,
      sexo: body.sexo,
      idadeAnos: body.idadeAnos,
      alturaCm: body.alturaCm,
      pesoKg: body.pesoKg,
      observacoes: body.observacoes,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
