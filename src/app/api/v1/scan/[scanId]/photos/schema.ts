import { ApiError } from "@/bff/core/errors/ApiError";
import type { ScanPhotoSlot } from "@/bff/modules/scan/types";

const VALID_SLOTS: readonly ScanPhotoSlot[] = ["front", "side"];

export type ParsedUploadPhotoForm = {
  slot: ScanPhotoSlot;
  file: File;
};

/**
 * Parses the multipart/form-data body for the photo upload endpoint.
 *
 * Throws 400 with the appropriate error code for missing/invalid fields. MIME
 * and size checks live in the service (they require ApiError codes mapped to
 * the spec: scan_photo_required, scan_photo_invalid_type, scan_photo_too_large).
 */
export async function parseUploadPhotoForm(request: Request): Promise<ParsedUploadPhotoForm> {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    throw new ApiError(400, "invalid_request", "Payload multipart inválido.");
  }

  const slotRaw = formData.get("slot");
  const fileRaw = formData.get("file");

  if (typeof slotRaw !== "string" || !VALID_SLOTS.includes(slotRaw as ScanPhotoSlot)) {
    throw new ApiError(400, "invalid_request", "slot deve ser 'front' ou 'side'.");
  }

  if (!(fileRaw instanceof File)) {
    throw new ApiError(400, "scan_photo_required", "Envie a foto para continuar.");
  }

  return {
    slot: slotRaw as ScanPhotoSlot,
    file: fileRaw,
  };
}
