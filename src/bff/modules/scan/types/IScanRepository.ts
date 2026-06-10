import type { Json } from "@/bff/core/supabase/database.types";
import type {
  ScanAnalysisRecord,
  ScanAllowanceType,
  ScanPhotoRecord,
  ScanPhotoSlot,
  ScanSex,
  ScanSource,
  ScanStatus,
} from "@/bff/modules/scan/types";

export type CreateScanAnalysisDbInput = {
  studentUserId: string;
  source: ScanSource;
  consentAt: string;
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: ScanSex;
  allowanceType: ScanAllowanceType;
};

export type UpsertScanPhotoDbInput = {
  scanId: string;
  slot: ScanPhotoSlot;
  storagePath: string;
  contentType: string;
};

export type FinalizeScanLifecycleDbInput = {
  status: ScanStatus;
  processedAt: string;
  failureReason: string | null;
  qualityOverall: string | null;
  result: Json;
  bodyFatPercent: number | null;
  leanMassKg: number | null;
  fatMassKg: number | null;
  bmi: number | null;
  bmr: number | null;
  whr: number | null;
};

export interface IScanRepository {
  // ── DB: scan_analyses ──
  createDraft(input: CreateScanAnalysisDbInput): Promise<ScanAnalysisRecord>;
  listForStudent(studentUserId: string): Promise<ScanAnalysisRecord[]>;
  listCompletedForStudentSince(
    studentUserId: string,
    sinceIso: string,
  ): Promise<ScanAnalysisRecord[]>;
  countCompletedForStudentSince(studentUserId: string, sinceIso: string): Promise<number>;
  findLastCompletedForStudent(studentUserId: string): Promise<ScanAnalysisRecord | null>;
  findCompletedBefore(
    studentUserId: string,
    beforeCreatedAt: string,
    excludeScanId: string,
  ): Promise<ScanAnalysisRecord | null>;
  findByIdForStudent(scanId: string, studentUserId: string): Promise<ScanAnalysisRecord | null>;
  /**
   * Atomically transitions a scan to `processing` only when its current status
   * is one of `draft | rejected | failed` AND it belongs to the given student.
   * Returns the updated row, or `null` if no row matched (already processing,
   * already completed, or not owned by this student).
   */
  transitionToProcessing(
    scanId: string,
    studentUserId: string,
  ): Promise<ScanAnalysisRecord | null>;
  finalizeScanLifecycle(
    scanId: string,
    input: FinalizeScanLifecycleDbInput,
  ): Promise<ScanAnalysisRecord>;

  // ── DB: scan_photos ──
  upsertPhoto(input: UpsertScanPhotoDbInput): Promise<ScanPhotoRecord>;
  findPhotosByScanId(scanId: string): Promise<ScanPhotoRecord[]>;
  findPhotoByScanAndSlot(scanId: string, slot: ScanPhotoSlot): Promise<ScanPhotoRecord | null>;

  // ── Storage: scan-photos (private bucket) ──
  uploadScanPhotoObject(path: string, body: ArrayBuffer, contentType: string): Promise<void>;
  removeScanPhotoObject(path: string): Promise<void>;
  createSignedReadUrl(path: string, ttlSeconds: number): Promise<string>;
}
