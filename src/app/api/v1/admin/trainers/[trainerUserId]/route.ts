import { z } from "zod";

import { NextResponse } from "next/server";

import { ensureAdmin } from "@/bff/core/auth/ensureAdmin";
import { ApiError } from "@/bff/core/errors/ApiError";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeAdminService } from "@/bff/modules/admin/factories/makeAdminService";

const trainerUserIdSchema = z.string().uuid();

async function readTrainerUserId(paramsPromise: Promise<{ trainerUserId: string }>) {
  const params = await paramsPromise;
  const parsed = trainerUserIdSchema.safeParse(params.trainerUserId);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Identificador de personal inválido.");
  }

  return parsed.data;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ trainerUserId: string }> },
) {
  try {
    await ensureAdmin(request);
    const trainerUserId = await readTrainerUserId(context.params);
    const adminService = makeAdminService();
    const result = await adminService.getTrainerDetail(trainerUserId);

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
