import type { Json } from "@/bff/core/supabase/database.types";
import { ApiError } from "@/bff/core/errors/ApiError";
import type { CurrentUserIdentity } from "@/bff/modules/profile/types";
import type { ScanAiService } from "@/bff/modules/scan/services/ScanAiService";
import type {
  CreateScanDraftInput,
  ScanAnalysisRecord,
  ScanAnalysisResult,
  ScanAllowanceType,
  ScanComparison,
  ScanCreateResponse,
  ScanDetail,
  ScanDetailResponse,
  ScanEligibility,
  ScanListResponse,
  ScanPhotoOutput,
  ScanPhotoRecord,
  ScanPhotoSlot,
  ScanPhotoUploadResponse,
  ScanQuality,
  ScanSex,
  ScanSource,
  ScanStatus,
  ScanSummaryItem,
  UploadScanPhotoInput,
} from "@/bff/modules/scan/types";
import type { IScanRepository } from "@/bff/modules/scan/types/IScanRepository";

const MAX_PHOTO_BYTES = 15 * 1024 * 1024; // 15 MB
const SIGNED_URL_TTL_SECONDS = 300;
const SCAN_ELIGIBILITY_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const UPLOADABLE_STATUSES: readonly ScanStatus[] = ["draft", "rejected"];

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function extFromContentType(contentType: string): string | null {
  return ALLOWED_MIME_TO_EXT[contentType] ?? null;
}

function buildStoragePath(
  studentUserId: string,
  scanId: string,
  slot: ScanPhotoSlot,
  ext: string,
): string {
  return `${studentUserId}/${scanId}/${slot}.${ext}`;
}

/** Maps a numeric DB column (may come as string from numeric type) to number|null. */
function toNumberOrNull(value: number | string | null): number | null {
  if (value === null) {
    return null;
  }

  const numeric = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numeric) ? numeric : null;
}

/** Same as toNumberOrNull but for non-nullable numeric columns. */
function toNumber(value: number | string): number {
  const numeric = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numeric)) {
    throw new ApiError(500, "scan_invalid_value", "Valor numérico inválido em scan.");
  }

  return numeric;
}

function mapRecordToScanDetail(record: ScanAnalysisRecord): ScanDetail {
  return {
    id: record.id,
    studentUserId: record.student_user_id,
    status: record.status as ScanStatus,
    allowanceType: readAllowanceType(record.allowance_type),
    consentAt: record.consent_at,
    source: record.source as ScanSource,
    weightKg: toNumber(record.weight_kg),
    heightCm: toNumber(record.height_cm),
    ageYears: record.age_years,
    sex: record.sex as ScanSex,
    bodyFatPercent: toNumberOrNull(record.body_fat_percent),
    leanMassKg: toNumberOrNull(record.lean_mass_kg),
    fatMassKg: toNumberOrNull(record.fat_mass_kg),
    bmi: toNumberOrNull(record.bmi),
    bmr: record.bmr,
    whr: toNumberOrNull(record.whr),
    result: record.result,
    qualityOverall: record.quality_overall,
    failureReason: record.failure_reason,
    processedAt: record.processed_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapRecordToSummary(record: ScanAnalysisRecord): ScanSummaryItem {
  return {
    id: record.id,
    status: record.status as ScanStatus,
    createdAt: record.created_at,
    processedAt: record.processed_at,
    bodyFatPercent: toNumberOrNull(record.body_fat_percent),
    weightKg: toNumber(record.weight_kg),
    qualityOverall: record.quality_overall,
  };
}

export class ScanService {
  // Lazy AI factory: avoids requiring OPENAI_API_KEY for endpoints that don't use AI.
  constructor(
    private readonly scanRepository: IScanRepository,
    private readonly scanAiServiceFactory: () => ScanAiService,
  ) {}

  /* ─── Create draft ─── */

  async createDraft(
    identity: CurrentUserIdentity,
    input: { consent: boolean } & CreateScanDraftInput,
  ): Promise<ScanCreateResponse> {
    if (input.consent !== true) {
      throw new ApiError(
        400,
        "scan_consent_required",
        "É preciso aceitar a privacidade para iniciar a análise.",
      );
    }

    const consentAt = new Date().toISOString();
    const eligibility = await this.getScanEligibility(identity.userId);
    const allowanceType = resolveCreateAllowanceType(
      input.useBonusAllowance === true,
      eligibility,
    );

    const record = await this.scanRepository.createDraft({
      studentUserId: identity.userId,
      source: input.source,
      consentAt,
      weightKg: input.weightKg,
      heightCm: input.heightCm,
      ageYears: input.ageYears,
      sex: input.sex,
      allowanceType,
    });

    return { scan: mapRecordToScanDetail(record) };
  }

  /* ─── List ─── */

  async listScansForStudent(identity: CurrentUserIdentity): Promise<ScanListResponse> {
    const [records, eligibility] = await Promise.all([
      this.scanRepository.listForStudent(identity.userId),
      this.getScanEligibility(identity.userId),
    ]);

    return {
      eligibility,
      items: records.map(mapRecordToSummary),
    };
  }

  /* ─── Detail ─── */

  async getScanDetail(
    identity: CurrentUserIdentity,
    scanId: string,
  ): Promise<ScanDetailResponse> {
    const record = await this.requireScanOwnedByStudent(scanId, identity.userId);

    return this.composeDetailResponse(record);
  }

  /**
   * Read-only scan context for chat triggers: ownership-validated numeric result
   * + comparison, WITHOUT photos or signed URLs. Throws scan_not_found (404) when
   * the scan does not exist or is not owned by the user.
   */
  async getScanResultForContext(
    identity: CurrentUserIdentity,
    scanId: string,
  ): Promise<{ scan: ScanDetail; comparison: ScanComparison | null }> {
    const record = await this.requireScanOwnedByStudent(scanId, identity.userId);

    return {
      scan: mapRecordToScanDetail(record),
      comparison: await this.buildComparison(record),
    };
  }

  private async composeDetailResponse(
    record: ScanAnalysisRecord,
  ): Promise<ScanDetailResponse> {
    const photos = await this.scanRepository.findPhotosByScanId(record.id);
    const photoOutputs: ScanPhotoOutput[] = [];

    for (const photo of photos) {
      const signedUrl = await this.scanRepository.createSignedReadUrl(
        photo.storage_path,
        SIGNED_URL_TTL_SECONDS,
      );
      photoOutputs.push(mapPhotoToOutput(photo, signedUrl));
    }

    return {
      scan: mapRecordToScanDetail(record),
      photos: photoOutputs,
      comparison: await this.buildComparison(record),
    };
  }

  /* ─── Upload photo ─── */

  async uploadScanPhoto(
    identity: CurrentUserIdentity,
    scanId: string,
    input: UploadScanPhotoInput,
  ): Promise<ScanPhotoUploadResponse> {
    const record = await this.requireScanOwnedByStudent(scanId, identity.userId);
    const status = record.status as ScanStatus;

    if (!UPLOADABLE_STATUSES.includes(status)) {
      throw new ApiError(
        409,
        "scan_invalid_status",
        "Esta análise não aceita mais upload de fotos.",
      );
    }

    const file = input.file;

    if (!file || file.size <= 0) {
      throw new ApiError(400, "scan_photo_required", "Envie a foto para continuar.");
    }

    if (file.size > MAX_PHOTO_BYTES) {
      throw new ApiError(400, "scan_photo_too_large", "A imagem ultrapassa o limite de 15 MB.");
    }

    const contentType = file.type;
    const ext = extFromContentType(contentType);

    if (!ext) {
      throw new ApiError(
        400,
        "scan_photo_invalid_type",
        "Formato de imagem não suportado. Use JPEG, PNG ou WEBP.",
      );
    }

    const newPath = buildStoragePath(identity.userId, record.id, input.slot, ext);

    // If an older photo exists with a different extension, remove the old object
    // best-effort to avoid orphaned files in the private bucket.
    const existing = await this.scanRepository.findPhotoByScanAndSlot(record.id, input.slot);

    if (existing && existing.storage_path !== newPath) {
      await this.scanRepository.removeScanPhotoObject(existing.storage_path);
    }

    const buffer = await file.arrayBuffer();
    await this.scanRepository.uploadScanPhotoObject(newPath, buffer, contentType);

    const photo = await this.scanRepository.upsertPhoto({
      scanId: record.id,
      slot: input.slot,
      storagePath: newPath,
      contentType,
    });

    const signedUrl = await this.scanRepository.createSignedReadUrl(
      photo.storage_path,
      SIGNED_URL_TTL_SECONDS,
    );

    return { photo: mapPhotoToOutput(photo, signedUrl) };
  }

  /* ─── Process (AI) ─── */

  async processScan(
    identity: CurrentUserIdentity,
    scanId: string,
  ): Promise<ScanDetailResponse> {
    const record = await this.requireScanOwnedByStudent(scanId, identity.userId);
    const status = record.status as ScanStatus;

    // Status guards
    if (status === "processing") {
      throw new ApiError(409, "scan_already_processing", "Esta análise já está em processamento.");
    }

    if (status === "completed") {
      throw new ApiError(409, "scan_already_completed", "Esta análise já foi concluída.");
    }
    // Allowed: draft | rejected | failed

    if (!record.consent_at) {
      throw new ApiError(
        409,
        "scan_consent_required",
        "É preciso aceitar a privacidade para processar a análise.",
      );
    }

    await this.assertCanProcessByAllowance(record, identity.userId);

    // Both photos required
    const photos = await this.scanRepository.findPhotosByScanId(record.id);
    const frontPhoto = photos.find((photo) => photo.slot === "front");
    const sidePhoto = photos.find((photo) => photo.slot === "side");

    if (!frontPhoto || !sidePhoto) {
      throw new ApiError(
        400,
        "scan_photos_required",
        "Envie as fotos frontal e lateral antes de processar.",
      );
    }

    // Generate signed URLs (short TTL) — these URLs are passed to the AI and
    // never exposed in responses or logs.
    const [frontUrl, sideUrl] = await Promise.all([
      this.scanRepository.createSignedReadUrl(frontPhoto.storage_path, SIGNED_URL_TTL_SECONDS),
      this.scanRepository.createSignedReadUrl(sidePhoto.storage_path, SIGNED_URL_TTL_SECONDS),
    ]);

    // Atomic state transition — guards concurrent invocations (double click / retries).
    // The UPDATE in Postgres only succeeds when the row still has a processable
    // status. The losing request gets null and never invokes the AI.
    const transitioned = await this.scanRepository.transitionToProcessing(
      record.id,
      identity.userId,
    );

    if (!transitioned) {
      throw new ApiError(409, "scan_already_processing", "Esta análise já está em processamento.");
    }

    // Call AI (reuses ScanAiService — same prompt, JSON schema and Zod validation)
    const scanAiService = this.scanAiServiceFactory();

    let aiAnalysis: ScanAnalysisResult;

    try {
      const aiResponse = await scanAiService.analyzePreview({
        frontImageUrl: frontUrl,
        sideImageUrl: sideUrl,
        sexo: record.sex as ScanSex,
        idadeAnos: record.age_years,
        alturaCm: toNumber(record.height_cm),
        pesoKg: toNumber(record.weight_kg),
      });
      aiAnalysis = aiResponse.analysis;
    } catch (error: unknown) {
      // Persist a terminal state then re-throw the original ApiError.
      const failureReason = error instanceof ApiError ? error.code : "scan_ai_failed";
      const finalStatus: ScanStatus =
        error instanceof ApiError && error.code === "scan_image_rejected" ? "rejected" : "failed";

      await this.scanRepository.finalizeScanLifecycle(record.id, {
        status: finalStatus,
        processedAt: new Date().toISOString(),
        failureReason,
        qualityOverall: null,
        result: {},
        bodyFatPercent: null,
        leanMassKg: null,
        fatMassKg: null,
        bmi: null,
        bmr: null,
        whr: null,
      });

      throw error;
    }

    const qualityOverall = computeQualityOverall(aiAnalysis.quality);
    const processedAt = new Date().toISOString();
    // ScanAnalysisResult is structurally a JSON value — cast through unknown.
    const resultJson = aiAnalysis as unknown as Json;

    let updated: ScanAnalysisRecord;

    if (aiAnalysis.quality.needsRetake) {
      // Rejected: don't expose unreliable metric estimates, but keep the result
      // payload so the UI can explain why the user needs to retake the photos.
      updated = await this.scanRepository.finalizeScanLifecycle(record.id, {
        status: "rejected",
        processedAt,
        failureReason: "needs_retake",
        qualityOverall,
        result: resultJson,
        bodyFatPercent: null,
        leanMassKg: null,
        fatMassKg: null,
        bmi: null,
        bmr: null,
        whr: null,
      });
    } else {
      updated = await this.scanRepository.finalizeScanLifecycle(record.id, {
        status: "completed",
        processedAt,
        failureReason: null,
        qualityOverall,
        result: resultJson,
        bodyFatPercent: aiAnalysis.estimates.gorduraPercent,
        leanMassKg: aiAnalysis.estimates.massaMagraKg,
        fatMassKg: aiAnalysis.estimates.massaGordaKg,
        bmi: aiAnalysis.estimates.imc,
        bmr: Math.round(aiAnalysis.estimates.tmb),
        whr: aiAnalysis.estimates.whr,
      });
    }

    return this.composeDetailResponse(updated);
  }

  /* ─── Internal: ownership ─── */

  private async requireScanOwnedByStudent(
    scanId: string,
    studentUserId: string,
  ): Promise<ScanAnalysisRecord> {
    const record = await this.scanRepository.findByIdForStudent(scanId, studentUserId);

    if (!record) {
      throw new ApiError(404, "scan_not_found", "Análise não encontrada.");
    }

    return record;
  }

  private async getScanEligibility(studentUserId: string): Promise<ScanEligibility> {
    const now = new Date();
    const sinceIso = new Date(now.getTime() - SCAN_ELIGIBILITY_WINDOW_DAYS * DAY_MS).toISOString();

    const [completedInWindowRecords, completedInWindow, lastCompleted] = await Promise.all([
      this.scanRepository.listCompletedForStudentSince(studentUserId, sinceIso),
      this.scanRepository.countCompletedForStudentSince(studentUserId, sinceIso),
      this.scanRepository.findLastCompletedForStudent(studentUserId),
    ]);

    const oldestCompletedInWindow =
      completedInWindowRecords
        .slice()
        .sort((left, right) => completedAtMs(left) - completedAtMs(right))[0] ?? null;
    const lastCompletedAt = lastCompleted ? completedAtIso(lastCompleted) : null;
    const nextRecommendedAt = lastCompletedAt
      ? addDaysIso(lastCompletedAt, SCAN_ELIGIBILITY_WINDOW_DAYS)
      : null;
    const daysUntilNext = oldestCompletedInWindow
      ? daysUntil(
          addDaysIso(completedAtIso(oldestCompletedInWindow), SCAN_ELIGIBILITY_WINDOW_DAYS),
          now,
        )
      : null;

    return {
      canCreateRegular: completedInWindow === 0,
      canUseBonus: completedInWindow === 1,
      isBlocked: completedInWindow >= 2,
      daysUntilNext,
      completedInWindow,
      lastCompletedAt,
      nextRecommendedAt,
    };
  }

  private async assertCanProcessByAllowance(
    record: ScanAnalysisRecord,
    studentUserId: string,
  ): Promise<void> {
    const eligibility = await this.getScanEligibility(studentUserId);
    const allowanceType = readAllowanceType(record.allowance_type);

    if (allowanceType === "regular" && eligibility.completedInWindow === 0) {
      return;
    }

    if (allowanceType === "bonus" && eligibility.completedInWindow === 1) {
      return;
    }

    throwScanLimitError(eligibility);
  }

  private async buildComparison(record: ScanAnalysisRecord): Promise<ScanComparison | null> {
    if (record.status !== "completed") {
      return null;
    }

    const previous = await this.scanRepository.findCompletedBefore(
      record.student_user_id,
      record.created_at,
      record.id,
    );

    if (!previous) {
      return null;
    }

    return {
      previousScanId: previous.id,
      previousCreatedAt: previous.created_at,
      bodyFatPercentDelta: nullableDelta(
        toNumberOrNull(record.body_fat_percent),
        toNumberOrNull(previous.body_fat_percent),
      ),
      weightKgDelta: nullableDelta(toNumber(record.weight_kg), toNumber(previous.weight_kg)),
      leanMassKgDelta: nullableDelta(
        toNumberOrNull(record.lean_mass_kg),
        toNumberOrNull(previous.lean_mass_kg),
      ),
    };
  }
}

/* ─── Helpers ─── */

/**
 * Derives a coarse "quality_overall" bucket from the 5 per-dimension scores.
 * Average is intentionally simple — UI consumes the rich per-item breakdown
 * from the `result` JSON when it wants detail.
 */
function computeQualityOverall(quality: ScanQuality): string {
  const scores = [
    quality.enquadramento.score,
    quality.iluminacao.score,
    quality.fundo.score,
    quality.postura.score,
    quality.vestimenta.score,
  ];

  const avg = scores.reduce((sum, value) => sum + value, 0) / scores.length;

  if (avg >= 0.85) {
    return "boa";
  }

  if (avg >= 0.6) {
    return "media";
  }

  return "ruim";
}

function readAllowanceType(value: string): ScanAllowanceType {
  return value === "bonus" ? "bonus" : "regular";
}

function completedAtIso(record: ScanAnalysisRecord): string {
  return record.processed_at ?? record.created_at;
}

function completedAtMs(record: ScanAnalysisRecord): number {
  const timestamp = new Date(completedAtIso(record)).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function addDaysIso(iso: string, days: number): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return new Date(date.getTime() + days * DAY_MS).toISOString();
}

function daysUntil(targetIso: string, from: Date): number {
  const target = new Date(targetIso);

  if (Number.isNaN(target.getTime())) {
    return 0;
  }

  return Math.max(0, Math.ceil((target.getTime() - from.getTime()) / DAY_MS));
}

function resolveCreateAllowanceType(
  useBonusAllowance: boolean,
  eligibility: ScanEligibility,
): ScanAllowanceType {
  if (eligibility.canCreateRegular) {
    return "regular";
  }

  if (eligibility.canUseBonus && useBonusAllowance) {
    return "bonus";
  }

  throwScanLimitError(eligibility);
}

function throwScanLimitError(eligibility: ScanEligibility): never {
  if (eligibility.completedInWindow >= 2) {
    throw new ApiError(
      409,
      "scan_limit_reached",
      "Voce ja usou sua analise regular e a analise extra deste periodo.",
      {
        daysUntilNext: eligibility.daysUntilNext,
        bonusAvailable: false,
      },
    );
  }

  throw new ApiError(
    409,
    "scan_cooldown_active",
    "Voce ja tem uma analise concluida nos ultimos 30 dias.",
    {
      daysUntilNext: eligibility.daysUntilNext,
      bonusAvailable: eligibility.canUseBonus,
    },
  );
}

function nullableDelta(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) {
    return null;
  }

  return Number((current - previous).toFixed(2));
}

function mapPhotoToOutput(record: ScanPhotoRecord, signedUrl: string): ScanPhotoOutput {
  return {
    id: record.id,
    slot: record.slot as ScanPhotoSlot,
    contentType: record.content_type,
    qualityStatus: record.quality_status,
    qualityReasons: record.quality_reasons,
    signedUrl,
  };
}
