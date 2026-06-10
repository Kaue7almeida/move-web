import { NextResponse } from "next/server";

import { ensureAdmin } from "@/bff/core/auth/ensureAdmin";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeAdminService } from "@/bff/modules/admin/factories/makeAdminService";

export async function GET(request: Request) {
  try {
    await ensureAdmin(request);
    const adminService = makeAdminService();
    const attention = await adminService.getAttention();

    return NextResponse.json(attention);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
