import { z } from "zod";

import { NextResponse } from "next/server";

import { ensureAdmin } from "@/bff/core/auth/ensureAdmin";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeAdminService } from "@/bff/modules/admin/factories/makeAdminService";
import {
  ADMIN_STUDENT_FILTERS,
  ADMIN_STUDENT_SORTS,
  ADMIN_STUDENTS_DEFAULT_LIMIT,
} from "@/bff/modules/admin/types";

/**
 * Query params são resilientes: valores ausentes ou inválidos caem no padrão em
 * vez de derrubar a listagem. `page`/`limit` são normalizados no service
 * (clamp de mínimo e do teto máximo seguro).
 */
const querySchema = z.object({
  search: z
    .string()
    .trim()
    .max(120)
    .catch("")
    .transform((value) => (value.length > 0 ? value : null)),
  filter: z.enum(ADMIN_STUDENT_FILTERS).catch("all"),
  sort: z.enum(ADMIN_STUDENT_SORTS).catch("newest"),
  page: z.coerce.number().int().catch(1),
  limit: z.coerce.number().int().catch(ADMIN_STUDENTS_DEFAULT_LIMIT),
});

export async function GET(request: Request) {
  try {
    await ensureAdmin(request);

    const url = new URL(request.url);
    const parsed = querySchema.parse({
      search: url.searchParams.get("search") ?? undefined,
      filter: url.searchParams.get("filter") ?? undefined,
      sort: url.searchParams.get("sort") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });

    const adminService = makeAdminService();
    const result = await adminService.listStudents(parsed);

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
