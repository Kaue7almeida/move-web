/**
 * Real UI/result types for the Scan screens.
 *
 * These describe the shape the result screen renders. The REAL result page
 * (`[scanId]`) maps backend data into `ScanResult`; the example fixtures in
 * `_examples/` build the same shape. No mock data lives here.
 */

export type ScanBand = "saudavel" | "atencao" | "neutro";

export type ScanMetric = {
  key: string;
  label: string;
  value: string;
  unit?: string;
  band: ScanBand;
  bandLabel?: string;
  hint?: string;
};

export type ScanMeasurement = {
  label: string;
  value: string;
};

export type ScanImageQualityItem = {
  label: string;
  status: "boa" | "media" | "ruim";
  statusLabel: string;
};

export type ScanInsight = {
  title: string;
  description: string;
};

export type ScanResult = {
  id: string;
  previousId: string | null;
  createdAt: string;
  summary: string;
  bodyFatPercent: number;
  bodyFatBand: ScanBand;
  bodyFatBandLabel: string;
  weightKg: number;
  leanMassKg: number;
  metrics: ScanMetric[];
  measurements: ScanMeasurement[];
  imageQualityOverall: string;
  imageQualityItems: ScanImageQualityItem[];
  observations: string[];
  insights: ScanInsight[];
};

export type ScanHistoryItem = {
  id: string;
  createdAt: string;
  bodyFatPercent: number;
  weightKg: number;
  imageQualityOverall: string;
};

export type ScanDelta = {
  previousCreatedAt: string;
  bodyFatPercentDelta: number;
  weightKgDelta: number;
  leanMassKgDelta: number;
};
