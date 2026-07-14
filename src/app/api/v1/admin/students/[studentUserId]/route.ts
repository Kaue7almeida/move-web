import { z } from "zod";

import { NextResponse } from "next/server";

import { ensureAdmin } from "@/bff/core/auth/ensureAdmin";
import { ApiError } from "@/bff/core/errors/ApiError";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeAdminService } from "@/bff/modules/admin/factories/makeAdminService";

const studentUserIdSchema = z.string().uuid();

async function readStudentUserId(paramsPromise: Promise<{ studentUserId: string }>) {
  const params = await paramsPromise;
  const parsed = studentUserIdSchema.safeParse(params.studentUserId);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Identificador de aluno inválido.");
  }

  return parsed.data;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ studentUserId: string }> },
) {
  try {
    await ensureAdmin(request);
    const studentUserId = await readStudentUserId(context.params);
    const adminService = makeAdminService();
    const result = await adminService.getStudentDetail(studentUserId);

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
