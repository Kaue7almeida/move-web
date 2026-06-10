/**
 * Fabricated example data for the illustrative Scan result (ids "mock-*").
 *
 * This is the ONLY place with mock/example scan data. It is consumed solely by
 * the illustrative example flow (`/app/scan/mock-latest`), which renders behind
 * an explicit "Exemplo ilustrativo" banner. Real scans never use this module.
 */

import type {
  ScanBand,
  ScanDelta,
  ScanHistoryItem,
  ScanImageQualityItem,
  ScanInsight,
  ScanMeasurement,
  ScanResult,
} from "../_types";

/** Toggle to simulate the "with history" hub state vs. the first-analysis state. */
export const SCAN_HAS_HISTORY = true;

const SCAN_OBSERVATIONS = [
  "Os valores são estimativas a partir das fotos e dos dados informados, e podem variar entre análises.",
  "Para comparações mais justas, refaça a análise em condições parecidas (luz, roupa e enquadramento).",
];

const SCAN_INSIGHTS: ScanInsight[] = [
  {
    title: "Acompanhe a tendência, não o número isolado",
    description:
      "Refaça a análise a cada 4–6 semanas, sempre em condições parecidas, para ver a evolução real.",
  },
  {
    title: "Consistência no treino e na rotina",
    description:
      "Manter treino regular, sono e hidratação ajuda a sustentar massa magra ao longo do tempo.",
  },
];

function fmtDecimal(value: number, digits: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

type ScanResultSeed = {
  id: string;
  previousId: string | null;
  createdAt: string;
  summary: string;
  bodyFatPercent: number;
  bodyFatBand: ScanBand;
  bodyFatBandLabel: string;
  weightKg: number;
  leanMassKg: number;
  fatMassKg: number;
  bmi: number;
  bmiBand: ScanBand;
  bmiBandLabel: string;
  bmr: number;
  whr: number;
  measurements: ScanMeasurement[];
  imageQualityOverall: string;
  imageQualityItems: ScanImageQualityItem[];
};

function makeScanResult(seed: ScanResultSeed): ScanResult {
  return {
    id: seed.id,
    previousId: seed.previousId,
    createdAt: seed.createdAt,
    summary: seed.summary,
    bodyFatPercent: seed.bodyFatPercent,
    bodyFatBand: seed.bodyFatBand,
    bodyFatBandLabel: seed.bodyFatBandLabel,
    weightKg: seed.weightKg,
    leanMassKg: seed.leanMassKg,
    metrics: [
      {
        key: "lean_mass",
        label: "Massa magra",
        value: fmtDecimal(seed.leanMassKg, 1),
        unit: "kg",
        band: "neutro",
        hint: "Inclui músculos, ossos e água.",
      },
      {
        key: "fat_mass",
        label: "Massa gorda",
        value: fmtDecimal(seed.fatMassKg, 1),
        unit: "kg",
        band: "neutro",
        hint: "Estimativa a partir do % de gordura.",
      },
      {
        key: "bmi",
        label: "IMC",
        value: fmtDecimal(seed.bmi, 1),
        band: seed.bmiBand,
        bandLabel: seed.bmiBandLabel,
        hint: "Faixa de referência: 18,5–24,9.",
      },
      {
        key: "bmr",
        label: "TMB",
        value: seed.bmr.toLocaleString("pt-BR"),
        unit: "kcal",
        band: "neutro",
        hint: "Gasto energético estimado em repouso.",
      },
      {
        key: "whr",
        label: "Cintura-quadril (WHR)",
        value: fmtDecimal(seed.whr, 2),
        band: "saudavel",
        bandLabel: "Dentro da referência",
        hint: "Proporção entre cintura e quadril.",
      },
    ],
    measurements: seed.measurements,
    imageQualityOverall: seed.imageQualityOverall,
    imageQualityItems: seed.imageQualityItems,
    observations: SCAN_OBSERVATIONS,
    insights: SCAN_INSIGHTS,
  };
}

/** Ordered newest → oldest. */
const SCAN_RESULTS_ORDERED: ScanResult[] = [
  makeScanResult({
    id: "mock-latest",
    previousId: "mock-previous",
    createdAt: "2026-06-01T09:30:00.000Z",
    summary:
      "Sua composição corporal estimada está numa faixa equilibrada e em evolução positiva em relação à análise anterior.",
    bodyFatPercent: 22.4,
    bodyFatBand: "saudavel",
    bodyFatBandLabel: "Faixa saudável",
    weightKg: 75.0,
    leanMassKg: 58.2,
    fatMassKg: 16.8,
    bmi: 24.5,
    bmiBand: "saudavel",
    bmiBandLabel: "Saudável",
    bmr: 1650,
    whr: 0.84,
    measurements: [
      { label: "Cintura", value: "82 cm" },
      { label: "Quadril", value: "98 cm" },
      { label: "Peito", value: "100 cm" },
      { label: "Braço", value: "34 cm" },
      { label: "Coxa", value: "56 cm" },
    ],
    imageQualityOverall: "Boa",
    imageQualityItems: [
      { label: "Foto frontal", status: "boa", statusLabel: "Boa" },
      { label: "Foto lateral", status: "boa", statusLabel: "Boa" },
    ],
  }),
  makeScanResult({
    id: "mock-previous",
    previousId: "mock-older",
    createdAt: "2026-04-15T08:15:00.000Z",
    summary:
      "Resultado estável, com leve redução de gordura corporal em relação à análise anterior.",
    bodyFatPercent: 23.6,
    bodyFatBand: "saudavel",
    bodyFatBandLabel: "Faixa saudável",
    weightKg: 76.5,
    leanMassKg: 57.6,
    fatMassKg: 18.1,
    bmi: 24.9,
    bmiBand: "saudavel",
    bmiBandLabel: "Saudável",
    bmr: 1635,
    whr: 0.86,
    measurements: [
      { label: "Cintura", value: "84 cm" },
      { label: "Quadril", value: "98 cm" },
      { label: "Peito", value: "101 cm" },
      { label: "Braço", value: "34 cm" },
      { label: "Coxa", value: "56 cm" },
    ],
    imageQualityOverall: "Boa",
    imageQualityItems: [
      { label: "Foto frontal", status: "boa", statusLabel: "Boa" },
      { label: "Foto lateral", status: "boa", statusLabel: "Boa" },
    ],
  }),
  makeScanResult({
    id: "mock-older",
    previousId: null,
    createdAt: "2026-02-20T07:50:00.000Z",
    summary:
      "Primeira análise registrada — seu ponto de partida para acompanhar a evolução ao longo do tempo.",
    bodyFatPercent: 25.1,
    bodyFatBand: "atencao",
    bodyFatBandLabel: "Acima da faixa",
    weightKg: 78.0,
    leanMassKg: 57.0,
    fatMassKg: 19.6,
    bmi: 25.6,
    bmiBand: "atencao",
    bmiBandLabel: "Acima da faixa",
    bmr: 1670,
    whr: 0.88,
    measurements: [
      { label: "Cintura", value: "88 cm" },
      { label: "Quadril", value: "99 cm" },
      { label: "Peito", value: "103 cm" },
      { label: "Braço", value: "33 cm" },
      { label: "Coxa", value: "57 cm" },
    ],
    imageQualityOverall: "Média",
    imageQualityItems: [
      { label: "Foto frontal", status: "boa", statusLabel: "Boa" },
      { label: "Foto lateral", status: "media", statusLabel: "Média" },
    ],
  }),
];

const SCAN_RESULTS: Record<string, ScanResult> = {};
for (const result of SCAN_RESULTS_ORDERED) {
  SCAN_RESULTS[result.id] = result;
}

function roundToOne(value: number): number {
  return Math.round(value * 10) / 10;
}

export function getScanResultById(scanId: string): ScanResult | null {
  return SCAN_RESULTS[scanId] ?? null;
}

export function listScanHistory(): ScanHistoryItem[] {
  return SCAN_RESULTS_ORDERED.map((result) => ({
    id: result.id,
    createdAt: result.createdAt,
    bodyFatPercent: result.bodyFatPercent,
    weightKg: result.weightKg,
    imageQualityOverall: result.imageQualityOverall,
  }));
}

export function getScanComparison(scanId: string): ScanDelta | null {
  const current = SCAN_RESULTS[scanId];

  if (!current || !current.previousId) {
    return null;
  }

  const previous = SCAN_RESULTS[current.previousId];

  if (!previous) {
    return null;
  }

  return {
    previousCreatedAt: previous.createdAt,
    bodyFatPercentDelta: roundToOne(current.bodyFatPercent - previous.bodyFatPercent),
    weightKgDelta: roundToOne(current.weightKg - previous.weightKg),
    leanMassKgDelta: roundToOne(current.leanMassKg - previous.leanMassKg),
  };
}
