import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "@/bff/core/errors/ApiError";
import type { Database } from "@/bff/core/supabase/database.types";
import type {
  CreateScanAnalysisDbInput,
  FinalizeScanLifecycleDbInput,
  IScanRepository,
  UpsertScanPhotoDbInput,
} from "@/bff/modules/scan/types/IScanRepository";
import type {
  ScanAnalysisRecord,
  ScanPhotoRecord,
  ScanPhotoSlot,
} from "@/bff/modules/scan/types";

const SCAN_PHOTOS_BUCKET = "scan-photos";

const STORAGE_FAILED = new ApiError(
  502,
  "scan_storage_failed",
  "Falha ao acessar o armazenamento de imagens.",
);

const DB_QUERY_FAILED = new ApiError(
  500,
  "scan_query_failed",
  "Falha ao consultar os dados de análise.",
);

export class ScanRepository implements IScanRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /* ─── scan_analyses ─── */

  async createDraft(input: CreateScanAnalysisDbInput): Promise<ScanAnalysisRecord> {
    const payload: Database["public"]["Tables"]["scan_analyses"]["Insert"] = {
      student_user_id: input.studentUserId,
      status: "draft",
      consent_at: input.consentAt,
      source: input.source,
      weight_kg: input.weightKg,
      height_cm: input.heightCm,
      age_years: input.ageYears,
      sex: input.sex,
      allowance_type: input.allowanceType,
    };

    const { data, error } = await this.supabase
      .from("scan_analyses")
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      throw new ApiError(500, "scan_create_failed", "Não foi possível criar a análise.");
    }

    return data;
  }

  async listForStudent(studentUserId: string): Promise<ScanAnalysisRecord[]> {
    const { data, error } = await this.supabase
      .from("scan_analyses")
      .select("*")
      .eq("student_user_id", studentUserId)
      .order("created_at", { ascending: false });

    if (error) {
      throw DB_QUERY_FAILED;
    }

    return data ?? [];
  }

  async listCompletedForStudentSince(
    studentUserId: string,
    sinceIso: string,
  ): Promise<ScanAnalysisRecord[]> {
    const { data, error } = await this.supabase
      .from("scan_analyses")
      .select("*")
      .eq("student_user_id", studentUserId)
      .eq("status", "completed")
      .or(`processed_at.gte.${sinceIso},and(processed_at.is.null,created_at.gte.${sinceIso})`);

    if (error) {
      throw DB_QUERY_FAILED;
    }

    return data ?? [];
  }

  async countCompletedForStudentSince(studentUserId: string, sinceIso: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("scan_analyses")
      .select("id", { count: "exact", head: true })
      .eq("student_user_id", studentUserId)
      .eq("status", "completed")
      .or(`processed_at.gte.${sinceIso},and(processed_at.is.null,created_at.gte.${sinceIso})`);

    if (error) {
      throw DB_QUERY_FAILED;
    }

    return count ?? 0;
  }

  async findLastCompletedForStudent(studentUserId: string): Promise<ScanAnalysisRecord | null> {
    const { data, error } = await this.supabase
      .from("scan_analyses")
      .select("*")
      .eq("student_user_id", studentUserId)
      .eq("status", "completed")
      .order("processed_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw DB_QUERY_FAILED;
    }

    return data;
  }

  async findCompletedBefore(
    studentUserId: string,
    beforeCreatedAt: string,
    excludeScanId: string,
  ): Promise<ScanAnalysisRecord | null> {
    const { data, error } = await this.supabase
      .from("scan_analyses")
      .select("*")
      .eq("student_user_id", studentUserId)
      .eq("status", "completed")
      .neq("id", excludeScanId)
      .lt("created_at", beforeCreatedAt)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw DB_QUERY_FAILED;
    }

    return data;
  }

  async findByIdForStudent(
    scanId: string,
    studentUserId: string,
  ): Promise<ScanAnalysisRecord | null> {
    const { data, error } = await this.supabase
      .from("scan_analyses")
      .select("*")
      .eq("id", scanId)
      .eq("student_user_id", studentUserId)
      .maybeSingle();

    if (error) {
      throw DB_QUERY_FAILED;
    }

    return data;
  }

  async transitionToProcessing(
    scanId: string,
    studentUserId: string,
  ): Promise<ScanAnalysisRecord | null> {
    // Atomic state transition: only succeeds when the row still has a status that
    // permits processing (draft | rejected | failed) and is owned by the student.
    // Concurrent invocations: only one of them flips the row; the others get null.
    const { data, error } = await this.supabase
      .from("scan_analyses")
      .update({ status: "processing" })
      .eq("id", scanId)
      .eq("student_user_id", studentUserId)
      .in("status", ["draft", "rejected", "failed"])
      .select("*")
      .maybeSingle();

    if (error) {
      throw new ApiError(500, "scan_status_update_failed", "Não foi possível atualizar o status.");
    }

    return data;
  }

  async finalizeScanLifecycle(
    scanId: string,
    input: FinalizeScanLifecycleDbInput,
  ): Promise<ScanAnalysisRecord> {
    const payload: Database["public"]["Tables"]["scan_analyses"]["Update"] = {
      status: input.status,
      processed_at: input.processedAt,
      failure_reason: input.failureReason,
      quality_overall: input.qualityOverall,
      result: input.result,
      body_fat_percent: input.bodyFatPercent,
      lean_mass_kg: input.leanMassKg,
      fat_mass_kg: input.fatMassKg,
      bmi: input.bmi,
      bmr: input.bmr,
      whr: input.whr,
    };

    const { data, error } = await this.supabase
      .from("scan_analyses")
      .update(payload)
      .eq("id", scanId)
      .select("*")
      .single();

    if (error || !data) {
      throw new ApiError(500, "scan_finalize_failed", "Não foi possível finalizar a análise.");
    }

    return data;
  }

  /* ─── scan_photos ─── */

  async upsertPhoto(input: UpsertScanPhotoDbInput): Promise<ScanPhotoRecord> {
    const payload: Database["public"]["Tables"]["scan_photos"]["Insert"] = {
      scan_id: input.scanId,
      slot: input.slot,
      storage_path: input.storagePath,
      content_type: input.contentType,
    };

    const { data, error } = await this.supabase
      .from("scan_photos")
      .upsert(payload, { onConflict: "scan_id,slot" })
      .select("*")
      .single();

    if (error || !data) {
      throw new ApiError(500, "scan_photo_save_failed", "Não foi possível salvar a foto.");
    }

    return data;
  }

  async findPhotosByScanId(scanId: string): Promise<ScanPhotoRecord[]> {
    const { data, error } = await this.supabase
      .from("scan_photos")
      .select("*")
      .eq("scan_id", scanId)
      .order("slot", { ascending: true });

    if (error) {
      throw DB_QUERY_FAILED;
    }

    return data ?? [];
  }

  async findPhotoByScanAndSlot(
    scanId: string,
    slot: ScanPhotoSlot,
  ): Promise<ScanPhotoRecord | null> {
    const { data, error } = await this.supabase
      .from("scan_photos")
      .select("*")
      .eq("scan_id", scanId)
      .eq("slot", slot)
      .maybeSingle();

    if (error) {
      throw DB_QUERY_FAILED;
    }

    return data;
  }

  /* ─── Storage (private bucket) ─── */

  async uploadScanPhotoObject(
    path: string,
    body: ArrayBuffer,
    contentType: string,
  ): Promise<void> {
    const { error } = await this.supabase.storage
      .from(SCAN_PHOTOS_BUCKET)
      .upload(path, body, { contentType, upsert: true });

    if (error) {
      throw STORAGE_FAILED;
    }
  }

  async removeScanPhotoObject(path: string): Promise<void> {
    // Best-effort: a missing object is not an error for our flow.
    await this.supabase.storage.from(SCAN_PHOTOS_BUCKET).remove([path]);
  }

  async createSignedReadUrl(path: string, ttlSeconds: number): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(SCAN_PHOTOS_BUCKET)
      .createSignedUrl(path, ttlSeconds);

    if (error || !data?.signedUrl) {
      throw STORAGE_FAILED;
    }

    return data.signedUrl;
  }
}
