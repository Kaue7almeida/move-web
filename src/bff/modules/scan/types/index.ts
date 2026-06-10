import { z } from "zod";

import type { Database, Json } from "@/bff/core/supabase/database.types";

/* ─── Persistence records (snake_case, from DB) ─────────────────────────────── */

export type ScanAnalysisRecord = Database["public"]["Tables"]["scan_analyses"]["Row"];
export type ScanPhotoRecord = Database["public"]["Tables"]["scan_photos"]["Row"];

/* ─── Domain enums ──────────────────────────────────────────────────────────── */

export type ScanStatus = "draft" | "processing" | "completed" | "failed" | "rejected";
export type ScanAllowanceType = "regular" | "bonus";
export type ScanSource = "web" | "webview";
export type ScanSex = "masculino" | "feminino" | "desconhecido";
export type ScanPhotoSlot = "front" | "side";

/* ─── Service inputs (camelCase) ────────────────────────────────────────────── */

export type CreateScanDraftInput = {
  source: ScanSource;
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: ScanSex;
  useBonusAllowance?: boolean;
};

export type UploadScanPhotoInput = {
  slot: ScanPhotoSlot;
  file: File;
};

/* ─── API response shapes (camelCase) ───────────────────────────────────────── */

export type ScanSummaryItem = {
  id: string;
  status: ScanStatus;
  createdAt: string;
  processedAt: string | null;
  bodyFatPercent: number | null;
  weightKg: number;
  qualityOverall: string | null;
};

export type ScanListResponse = {
  eligibility: ScanEligibility;
  items: ScanSummaryItem[];
};

export type ScanEligibility = {
  canCreateRegular: boolean;
  canUseBonus: boolean;
  isBlocked: boolean;
  daysUntilNext: number | null;
  completedInWindow: number;
  lastCompletedAt: string | null;
  nextRecommendedAt: string | null;
};

export type ScanDetail = {
  id: string;
  studentUserId: string;
  status: ScanStatus;
  allowanceType: ScanAllowanceType;
  consentAt: string | null;
  source: ScanSource;
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: ScanSex;
  bodyFatPercent: number | null;
  leanMassKg: number | null;
  fatMassKg: number | null;
  bmi: number | null;
  bmr: number | null;
  whr: number | null;
  result: Json;
  qualityOverall: string | null;
  failureReason: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ScanPhotoOutput = {
  id: string;
  slot: ScanPhotoSlot;
  contentType: string | null;
  qualityStatus: string | null;
  qualityReasons: Json;
  signedUrl: string;
};

export type ScanCreateResponse = {
  scan: ScanDetail;
};

export type ScanDetailResponse = {
  scan: ScanDetail;
  photos: ScanPhotoOutput[];
  comparison: ScanComparison | null;
};

export type ScanComparison = {
  previousScanId: string;
  previousCreatedAt: string;
  bodyFatPercentDelta: number | null;
  weightKgDelta: number | null;
  leanMassKgDelta: number | null;
};

export type ScanPhotoUploadResponse = {
  photo: ScanPhotoOutput;
};

/* ─── Existing analyze-preview types (kept intact) ──────────────────────────── */

/* ─── Request input ─────────────────────────────────────────────────────────── */

export type ScanAnalysisInput = {
  frontImageUrl: string;
  sideImageUrl: string;
  sexo: "masculino" | "feminino" | "desconhecido";
  idadeAnos: number;
  alturaCm: number;
  pesoKg: number;
  observacoes?: string | null;
};

/* ─── AI response types ──────────────────────────────────────────────────────── */

export type ScanQualityItem = {
  status: "ok" | "ajustar";
  /** Confidence score for this dimension, 0 (critical problem) – 1 (perfect). */
  score: number;
  /** Brief observation in pt-BR. */
  observacao: string;
};

export type ScanQuality = {
  enquadramento: ScanQualityItem;
  iluminacao: ScanQualityItem;
  fundo: ScanQualityItem;
  postura: ScanQualityItem;
  vestimenta: ScanQualityItem;
  needsRetake: boolean;
};

export type ScanEstimates = {
  gorduraPercent: number;
  massaMagraKg: number;
  massaGordaKg: number;
  imc: number;
  whr: number;
  tmb: number;
  faixaGordura: string;
  faixaImc: string;
  faixaWhr: string;
};

export type ScanMeasurementsCm = {
  braco: number;
  antebraco: number;
  coxa: number;
  panturrilha: number;
  quadril: number;
  cintura: number;
  toracicoPeito: number;
  ombros: number;
};

export type ScanReferenceRange = {
  min: number | null;
  max: number | null;
  label: string;
};

export type ScanReferenceRanges = {
  gordura: ScanReferenceRange;
  imc: ScanReferenceRange;
  whr: ScanReferenceRange;
};

export type ScanAnalysisResult = {
  inputs: {
    sexo: string;
    idadeAnos: number;
    alturaCm: number;
    pesoKg: number;
  };
  quality: ScanQuality;
  estimates: ScanEstimates;
  measurementsCm: ScanMeasurementsCm;
  referenceRanges: ScanReferenceRanges;
  observations: string[];
  confidence: number;
};

export type ScanAnalysisResponse = {
  analysis: ScanAnalysisResult;
};

/* ─── Zod schema for AI response validation ─────────────────────────────────── */

const scanQualityItemSchema = z.object({
  status: z.enum(["ok", "ajustar"]),
  score: z.number().min(0).max(1),
  observacao: z.string(),
});

const scanQualitySchema = z.object({
  enquadramento: scanQualityItemSchema,
  iluminacao: scanQualityItemSchema,
  fundo: scanQualityItemSchema,
  postura: scanQualityItemSchema,
  vestimenta: scanQualityItemSchema,
  needsRetake: z.boolean(),
});

const scanEstimatesSchema = z.object({
  gorduraPercent: z.number(),
  massaMagraKg: z.number(),
  massaGordaKg: z.number(),
  imc: z.number(),
  whr: z.number(),
  tmb: z.number(),
  faixaGordura: z.string(),
  faixaImc: z.string(),
  faixaWhr: z.string(),
});

const scanMeasurementsCmSchema = z.object({
  braco: z.number(),
  antebraco: z.number(),
  coxa: z.number(),
  panturrilha: z.number(),
  quadril: z.number(),
  cintura: z.number(),
  toracicoPeito: z.number(),
  ombros: z.number(),
});

const scanReferenceRangeSchema = z.object({
  min: z.number().nullable(),
  max: z.number().nullable(),
  label: z.string(),
});

export const scanAiResponseSchema = z.object({
  analysis: z.object({
    inputs: z.object({
      sexo: z.string(),
      idadeAnos: z.number(),
      alturaCm: z.number(),
      pesoKg: z.number(),
    }),
    quality: scanQualitySchema,
    estimates: scanEstimatesSchema,
    measurementsCm: scanMeasurementsCmSchema,
    referenceRanges: z.object({
      gordura: scanReferenceRangeSchema,
      imc: scanReferenceRangeSchema,
      whr: scanReferenceRangeSchema,
    }),
    observations: z.array(z.string()),
    confidence: z.number().min(0).max(1),
  }),
});
