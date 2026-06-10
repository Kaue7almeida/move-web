import { z } from "zod";

import { ApiError } from "@/bff/core/errors/ApiError";
import type { RoleSelectionInput } from "@/bff/modules/profile/types";

const postRoleSelectionSchema = z
  .object({
    role: z.enum(["student", "trainer"]),
    fullName: z.string().trim().min(1).optional(),
  })
  .strict();

export function parsePostRoleSelectionBody(input: unknown): RoleSelectionInput {
  const parsed = postRoleSelectionSchema.safeParse(input);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Payload inválido.");
  }

  return parsed.data;
}