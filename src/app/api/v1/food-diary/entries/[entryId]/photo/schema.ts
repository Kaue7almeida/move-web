import { ApiError } from "@/bff/core/errors/ApiError";

export type ParsedPhotoForm = { file: File };

/**
 * Parses the multipart/form-data body for the photo upload endpoint. MIME and size
 * checks live in the service (they map to spec ApiError codes).
 */
export async function parsePhotoForm(request: Request): Promise<ParsedPhotoForm> {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    throw new ApiError(400, "invalid_request", "Payload multipart inválido.");
  }

  const fileRaw = formData.get("file");

  if (!(fileRaw instanceof File)) {
    throw new ApiError(400, "food_diary_photo_required", "Envie a foto para continuar.");
  }

  return { file: fileRaw };
}
