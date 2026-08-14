import {
  type ActivityIntensity,
  estimateActivity,
  isActivityKey,
} from "@/bff/modules/foodDiary/activityEstimation";
import type { ActivityAiInterpretation } from "@/bff/modules/foodDiary/types/activityAi";

/**
 * Decisão PURA do fluxo de estimativa de atividade — a partir da interpretação da IA
 * e do peso resolvido (server-side ou informado), escolhe UM próximo passo:
 *  • unrecognized   → atividade fora da curadoria → oferecer "valor do relógio";
 *  • clarification  → falta um dado decisivo (ex.: passos sem duração) → UMA pergunta;
 *  • needs_weight   → sem peso confiável → perguntar o peso (só para a estimativa);
 *  • routine_check  → parece movimento cotidiano → confirmar "extra vs. rotina"
 *                     (evita dupla contagem com o fatorRotina — não muda planEnergy);
 *  • estimate       → tudo pronto → card de revisão com o gasto EXTRA estimado.
 *
 * Nunca inventa: sem duração/peso ou atividade desconhecida NÃO viram kcal chutado.
 */

export type WeightSource = "scan" | "plan" | "profile" | "informed";

export const WEIGHT_SOURCE_LABELS: Record<WeightSource, string> = {
  scan: "seu MoveScan",
  plan: "seu plano",
  profile: "seu perfil",
  informed: "informado agora",
};

export type ActivityEstimateView = {
  activityKey: string;
  label: string;
  durationMinutes: number;
  distanceKm: number | null;
  speedKmh: number | null;
  intensity: ActivityIntensity | null;
  met: number;
  weightKg: number;
  weightSource: WeightSource;
  /** Gasto EXTRA estimado (kcal). */
  activeKcal: number;
  /** Linha curta de contexto (ex.: "4 km · 50 min"). */
  detailLine: string;
  /** Rótulo sugerido para persistir (ex.: "Caminhada · 4 km · 50 min"). */
  suggestedLabel: string;
};

export type ActivityEstimateOutcome =
  | { kind: "unrecognized"; message: string }
  | { kind: "clarification"; question: string }
  | { kind: "needs_weight"; question: string }
  | { kind: "routine_check"; label: string; question: string }
  | { kind: "estimate"; estimate: ActivityEstimateView };

const DEFAULT_DURATION_QUESTION = "Quanto tempo durou, aproximadamente?";
const WEIGHT_QUESTION = "Qual seu peso aproximado hoje?";
const ROUTINE_QUESTION = "Isso foi uma atividade extra ou já faz parte da sua rotina normal?";
const UNRECOGNIZED_MESSAGE =
  "Não reconheci essa atividade com segurança. Se seu relógio registrou o gasto, você pode usar esse valor.";

export function resolveActivityEstimate(params: {
  interpretation: ActivityAiInterpretation;
  weightKg: number | null;
  weightSource: WeightSource | null;
  forceExtra: boolean;
}): ActivityEstimateOutcome {
  const { interpretation, weightKg, weightSource, forceExtra } = params;

  // 1) Atividade fora da curadoria → não inventa MET.
  if (interpretation.activityKey === "unknown" || !isActivityKey(interpretation.activityKey)) {
    return { kind: "unrecognized", message: UNRECOGNIZED_MESSAGE };
  }

  // 2) A IA sinalizou que falta um dado decisivo → UMA pergunta.
  if (interpretation.needsClarification) {
    const question = nonEmpty(interpretation.clarificationQuestion) ?? DEFAULT_DURATION_QUESTION;
    return { kind: "clarification", question };
  }

  // 3) Sem duração não há como estimar honestamente → pergunta a duração.
  const duration = interpretation.durationMinutes;
  if (duration === null || !Number.isFinite(duration) || duration <= 0) {
    return { kind: "clarification", question: DEFAULT_DURATION_QUESTION };
  }

  // 4) Sem peso confiável → pergunta o peso (usado só para esta estimativa).
  if (weightKg === null || weightSource === null) {
    return { kind: "needs_weight", question: WEIGHT_QUESTION };
  }

  // 5) Movimento cotidiano ainda não confirmado como extra → confirma antes de somar.
  if (interpretation.isEverydayMovement && !forceExtra) {
    return { kind: "routine_check", label: interpretation.label, question: ROUTINE_QUESTION };
  }

  // 6) Estima (determinístico).
  const result = estimateActivity({
    activityKey: interpretation.activityKey,
    weightKg,
    durationMinutes: duration,
    distanceKm: interpretation.distanceKm,
    intensity: interpretation.intensity,
  });

  if (!result.ok) {
    if (result.reason === "invalid_weight") {
      return { kind: "needs_weight", question: WEIGHT_QUESTION };
    }
    if (result.reason === "unknown_activity") {
      return { kind: "unrecognized", message: UNRECOGNIZED_MESSAGE };
    }
    return { kind: "clarification", question: DEFAULT_DURATION_QUESTION };
  }

  const detailLine = buildDetailLine(result.distanceKm, result.durationMinutes, interpretation.intensity);

  return {
    kind: "estimate",
    estimate: {
      activityKey: result.activityKey,
      label: result.label,
      durationMinutes: result.durationMinutes,
      distanceKm: result.distanceKm,
      speedKmh: result.speedKmh,
      intensity: interpretation.intensity,
      met: result.met,
      weightKg,
      weightSource,
      activeKcal: result.activeKcal,
      detailLine,
      suggestedLabel: `${result.label} · ${detailLine}`,
    },
  };
}

function buildDetailLine(
  distanceKm: number | null,
  durationMinutes: number,
  intensity: ActivityIntensity | null,
): string {
  const parts: string[] = [];

  if (distanceKm !== null) {
    parts.push(`${distanceKm} km`);
  }

  parts.push(`${durationMinutes} min`);

  if (distanceKm === null && intensity !== null) {
    parts.push(intensity);
  }

  return parts.join(" · ");
}

function nonEmpty(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
