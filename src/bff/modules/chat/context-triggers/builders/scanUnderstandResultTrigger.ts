import type { Json } from "@/bff/core/supabase/database.types";
import { ApiError } from "@/bff/core/errors/ApiError";
import type { ScanService } from "@/bff/modules/scan/services/ScanService";
import type { ScanComparison, ScanDetail } from "@/bff/modules/scan/types";

import type {
  ChatContextTriggerBuilder,
  ChatContextTriggerInput,
  ChatContextTriggerResult,
} from "../types";

const CHAT_CONTEXT_NOT_FOUND = new ApiError(
  404,
  "chat_context_not_found",
  "Não foi possível encontrar o contexto solicitado.",
);

const CHAT_SCAN_RESULT_NOT_READY = new ApiError(
  400,
  "chat_scan_result_not_ready",
  "O resultado do Scan ainda não está disponível.",
);

function isJsonObject(value: Json): value is { [key: string]: Json } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Safely pulls the AI insight strings from the opaque result JSON. */
function extractObservations(result: Json): string[] {
  if (!isJsonObject(result)) return [];
  const observations = result.observations;
  if (!Array.isArray(observations)) return [];
  return observations.filter((item): item is string => typeof item === "string");
}

/** Safely pulls a few key body measurements (cm) from the opaque result JSON. */
function extractMeasurements(result: Json): Array<{ label: string; value: number }> {
  if (!isJsonObject(result)) return [];
  const measurements = result.measurementsCm;
  if (!isJsonObject(measurements)) return [];

  const entries: Array<{ label: string; value: number }> = [];
  for (const [label, value] of Object.entries(measurements)) {
    if (typeof value === "number") {
      entries.push({ label, value });
    }
  }
  return entries;
}

function formatNumber(value: number | null, suffix: string): string {
  return value === null ? "não informado" : `${value}${suffix}`;
}

function formatSignedDelta(value: number, suffix: string): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value)}${suffix}`;
}

function buildComparisonLine(comparison: ScanComparison | null): string {
  if (!comparison) {
    return "- Comparação com scan anterior: não há scan anterior para comparar.";
  }

  const parts: string[] = [];
  if (comparison.bodyFatPercentDelta !== null) {
    parts.push(`gordura ${formatSignedDelta(comparison.bodyFatPercentDelta, " p.p.")}`);
  }
  if (comparison.weightKgDelta !== null) {
    parts.push(`peso ${formatSignedDelta(comparison.weightKgDelta, " kg")}`);
  }
  if (comparison.leanMassKgDelta !== null) {
    parts.push(`massa magra ${formatSignedDelta(comparison.leanMassKgDelta, " kg")}`);
  }

  const summary = parts.length > 0 ? parts.join(", ") : "sem variações relevantes";
  return `- Comparação com o scan anterior: ${summary}.`;
}

/** Data-only context block (no task framing) reused on first turn + follow-ups. */
function buildScanContextBlock(
  scan: ScanDetail,
  comparison: ScanComparison | null,
): string {
  const observations = extractObservations(scan.result).slice(0, 5);
  const measurements = extractMeasurements(scan.result).slice(0, 6);

  const lines = [
    "Contexto real do Scan que originou esta conversa:",
    `- Data: ${scan.processedAt ?? scan.createdAt}`,
    `- Status: ${scan.status}`,
    `- Gordura corporal estimada: ${formatNumber(scan.bodyFatPercent, "%")}`,
    `- Massa magra estimada: ${formatNumber(scan.leanMassKg, " kg")}`,
    `- Massa gorda estimada: ${formatNumber(scan.fatMassKg, " kg")}`,
    `- IMC: ${formatNumber(scan.bmi, "")}`,
    `- BMR: ${scan.bmr === null ? "não informado" : `${scan.bmr} kcal`}`,
    `- WHR: ${formatNumber(scan.whr, "")}`,
    `- Qualidade da captura: ${scan.qualityOverall ?? "não informada"}`,
  ];

  if (measurements.length > 0) {
    const measuresText = measurements
      .map((measure) => `${measure.label}: ${measure.value} cm`)
      .join(", ");
    lines.push(`- Medidas principais: ${measuresText}`);
  }

  if (observations.length > 0) {
    lines.push("- Observações relevantes:");
    for (const observation of observations) {
      lines.push(`  - ${observation}`);
    }
  }

  lines.push(buildComparisonLine(comparison));
  lines.push("- Aviso: o Scan é uma estimativa visual, não um diagnóstico médico.");

  return lines.join("\n");
}

/** Builds the enriched (hidden) AI content from the real, owned scan data. */
function buildScanUnderstandPrompt(
  scan: ScanDetail,
  comparison: ScanComparison | null,
  visibleMessage: string,
): string {
  return [
    "O usuário abriu o gatilho contextual 'Entender meu resultado do Scan' no app Move.",
    "",
    "Mensagem visível do usuário:",
    visibleMessage,
    "",
    buildScanContextBlock(scan, comparison),
    "",
    "Tarefa:",
    "Explique o resultado em linguagem simples.",
    "Contextualize em 2 ou 3 frases.",
    "Cite até 3 pontos positivos e até 3 pontos de atenção.",
    "Sugira 2 ou 3 ações práticas para as próximas 4 semanas.",
    "Reforce que o Scan é uma estimativa visual, não um diagnóstico médico.",
    "Não invente dados ausentes.",
    "Não prescreva tratamento.",
    "Não prometa resultado.",
    "Se houver dúvida médica, oriente procurar um profissional de saúde.",
    "",
    "Formato: use **negrito** para seções curtas e listas com '- '. Não use títulos com #.",
  ].join("\n");
}

/**
 * "Entender meu resultado" — fetches the student's own completed scan and builds
 * the hidden enriched content. Ownership is enforced by ScanService.
 */
export class ScanUnderstandResultTrigger implements ChatContextTriggerBuilder {
  readonly id = "scan_understand_result";

  constructor(private readonly scanService: ScanService) {}

  async build(input: ChatContextTriggerInput): Promise<ChatContextTriggerResult> {
    let scan: ScanDetail;
    let comparison: ScanComparison | null;

    try {
      const result = await this.scanService.getScanResultForContext(
        { userId: input.userId },
        input.entityId,
      );
      scan = result.scan;
      comparison = result.comparison;
    } catch (error: unknown) {
      if (error instanceof ApiError && error.code === "scan_not_found") {
        throw CHAT_CONTEXT_NOT_FOUND;
      }
      throw error;
    }

    if (scan.status !== "completed" || scan.bodyFatPercent === null) {
      throw CHAT_SCAN_RESULT_NOT_READY;
    }

    return {
      visibleMessage: input.visibleMessage,
      aiUserContent: buildScanUnderstandPrompt(scan, comparison, input.visibleMessage),
      persistentContext: buildScanContextBlock(scan, comparison),
      contextLabel: "Resultado do Scan",
    };
  }
}
