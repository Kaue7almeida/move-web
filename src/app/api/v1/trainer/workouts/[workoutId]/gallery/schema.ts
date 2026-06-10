import { z } from "zod";

import { ApiError } from "@/bff/core/errors/ApiError";
import type { UpdateWorkoutGalleryInput } from "@/bff/modules/workouts/types";

const gallerySchema = z
  .object({
    isInGallery: z.boolean(),
    galleryCategory: z.union([z.string(), z.null()]).optional(),
  })
  .strict();

export function parseGalleryVisibilityBody(input: unknown): UpdateWorkoutGalleryInput {
  const parsed = gallerySchema.safeParse(input);

  if (!parsed.success) {
    throw new ApiError(400, "invalid_request", "Payload inválido.");
  }

  const { isInGallery, galleryCategory } = parsed.data;

  if (galleryCategory === undefined) {
    return { isInGallery };
  }

  const trimmed = typeof galleryCategory === "string" ? galleryCategory.trim() : "";

  return {
    isInGallery,
    galleryCategory: trimmed === "" ? null : trimmed,
  };
}
