import type {
  ScanCreateResponse,
  ScanDetailResponse,
  ScanListResponse,
  ScanPhotoSlot,
  ScanPhotoUploadResponse,
  ScanSex,
  ScanSource,
} from "@/bff/modules/scan/types";
import { authenticatedFetch } from "@/services/api/authenticatedFetch";

/* ─── Error with backend error.code ─────────────────────────────────────────── */

export class ScanApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly daysUntilNext: number | null;
  readonly bonusAvailable: boolean | null;

  constructor(
    status: number,
    code: string,
    message: string,
    daysUntilNext: number | null = null,
    bonusAvailable: boolean | null = null,
  ) {
    super(message);
    this.name = "ScanApiError";
    this.code = code;
    this.status = status;
    this.daysUntilNext = daysUntilNext;
    this.bonusAvailable = bonusAvailable;
  }
}

async function throwScanApiError(response: Response, fallback: string): Promise<never> {
  let code = "unknown_error";
  let message = fallback;
  let daysUntilNext: number | null = null;
  let bonusAvailable: boolean | null = null;

  try {
    const payload = (await response.json()) as {
      error?: { code?: string; message?: string };
      daysUntilNext?: number | null;
      bonusAvailable?: boolean;
    };

    if (payload.error?.code) code = payload.error.code;
    if (payload.error?.message) message = payload.error.message;
    if (payload.daysUntilNext !== undefined) daysUntilNext = payload.daysUntilNext ?? null;
    if (payload.bonusAvailable !== undefined) bonusAvailable = payload.bonusAvailable ?? null;
  } catch {
    // keep fallback values
  }

  throw new ScanApiError(response.status, code, message, daysUntilNext, bonusAvailable);
}

/* ─── Requests ──────────────────────────────────────────────────────────────── */

export type CreateScanInput = {
  consent: boolean;
  source: ScanSource;
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: ScanSex;
  useBonusAllowance?: boolean;
};

export async function createScan(input: CreateScanInput): Promise<ScanCreateResponse> {
  const response = await authenticatedFetch("/api/v1/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    await throwScanApiError(response, "Não foi possível criar a análise.");
  }

  return (await response.json()) as ScanCreateResponse;
}

export async function uploadScanPhoto(
  scanId: string,
  slot: ScanPhotoSlot,
  file: File,
): Promise<ScanPhotoUploadResponse> {
  const formData = new FormData();
  formData.append("slot", slot);
  formData.append("file", file);

  const response = await authenticatedFetch(`/api/v1/scan/${scanId}/photos`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    await throwScanApiError(response, "Não foi possível enviar a foto.");
  }

  return (await response.json()) as ScanPhotoUploadResponse;
}

export async function processScan(scanId: string): Promise<ScanDetailResponse> {
  const response = await authenticatedFetch(`/api/v1/scan/${scanId}/process`, {
    method: "POST",
  });

  if (!response.ok) {
    await throwScanApiError(response, "Não foi possível processar a análise.");
  }

  return (await response.json()) as ScanDetailResponse;
}

export async function getScan(scanId: string): Promise<ScanDetailResponse> {
  const response = await authenticatedFetch(`/api/v1/scan/${scanId}`, {
    method: "GET",
  });

  if (!response.ok) {
    await throwScanApiError(response, "Não foi possível carregar a análise.");
  }

  return (await response.json()) as ScanDetailResponse;
}

export async function listScans(): Promise<ScanListResponse> {
  const response = await authenticatedFetch("/api/v1/scan", { method: "GET" });

  if (!response.ok) {
    await throwScanApiError(response, "Não foi possível carregar suas análises.");
  }

  return (await response.json()) as ScanListResponse;
}
