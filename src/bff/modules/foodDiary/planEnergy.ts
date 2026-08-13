/**
 * Diário Alimentar — motor energético (PURO, sem I/O).
 *
 * Fonte única da verdade do plano energético. A UI e o BFF NÃO recalculam energia
 * por conta própria: tudo passa por aqui, de forma determinística e documentada.
 *
 * Convenções (inegociáveis para evitar ambiguidade de sinal):
 *   • saldo planejado (plannedBalanceKcal):  déficit < 0 · manutenção = 0 · superávit > 0
 *   • trabalhamos com uma FAIXA-ALVO (band), nunca com uma kcal exata "verdadeira".
 *
 * Cadeia de cálculo:
 *   gastoBase   = TMB × fatorRotina
 *   gastoDia    = gastoBase + atividadesRegistradas
 *   alvoCentral = gastoDia + saldoPlanejado
 *   faixa       = [alvoCentral − tolerância, alvoCentral + tolerância]
 */

export type GoalKind = "lose" | "maintain" | "gain";
export type RoutineLevel = "sedentary" | "light" | "moderate" | "high";
export type TmbSource = "scan" | "body_fat" | "manual";

/** Onde o consumo do dia cai em relação à faixa-alvo. */
export type ConsumptionStatus = "below" | "within" | "above";

/**
 * Fatores de rotina (atividade FORA dos treinos registrados). Centralizados aqui
 * para evitar dupla contagem: estes valores representam o gasto de vida (NEAT +
 * basal) SEM exercício estruturado — os treinos entram DEPOIS, somados como
 * `activitiesKcal`. Por isso são menores que os multiplicadores clássicos de
 * "activity level" (que já embutem exercício).
 */
export const ROUTINE_FACTORS: Record<RoutineLevel, number> = {
  sedentary: 1.2,
  light: 1.3,
  moderate: 1.4,
  high: 1.5,
};

export const ROUTINE_LEVEL_LABELS: Record<RoutineLevel, string> = {
  sedentary: "Sedentária (trabalho sentado, pouca caminhada)",
  light: "Leve (caminhadas curtas no dia a dia)",
  moderate: "Moderada (em pé / caminhando boa parte do dia)",
  high: "Alta (trabalho físico ou muito movimento)",
};

export const GOAL_LABELS: Record<GoalKind, string> = {
  lose: "Perder gordura",
  maintain: "Manter",
  gain: "Ganhar massa",
};

function isRoutineLevel(value: string): value is RoutineLevel {
  return value === "sedentary" || value === "light" || value === "moderate" || value === "high";
}

/** Coerce persisted strings back to the domain unions (fail-safe defaults). */
export function asRoutineLevel(value: string): RoutineLevel {
  return isRoutineLevel(value) ? value : "sedentary";
}

export function asGoal(value: string): GoalKind {
  return value === "lose" || value === "maintain" || value === "gain" ? value : "maintain";
}

export function asTmbSource(value: string): TmbSource {
  return value === "scan" || value === "body_fat" || value === "manual" ? value : "manual";
}

/** "Missão: perder gordura" — the HUD headline. */
export function missionLabelFor(goal: GoalKind): string {
  return `Missão: ${GOAL_LABELS[goal].toLowerCase()}`;
}

/** Neutral, non-medical status label for the day vs. the band. */
export function statusLabelFor(status: ConsumptionStatus): string {
  switch (status) {
    case "within":
      return "Você está dentro do plano hoje";
    case "below":
      return "Você ainda está abaixo da faixa de hoje";
    case "above":
      return "Você passou do topo da faixa de hoje";
  }
}

export function routineFactorFor(level: RoutineLevel): number {
  return ROUTINE_FACTORS[level];
}

export function safeRoutineFactor(level: string): number {
  return isRoutineLevel(level) ? ROUTINE_FACTORS[level] : ROUTINE_FACTORS.sedentary;
}

/* ─── TMB ──────────────────────────────────────────────────────────────────────
 * UMA fórmula no MoveX — a mesma do MoveScan (Katch-McArdle), sobre a massa magra:
 *   TMB = 370 + 21.6 × massa magra (kg)
 * O Diário NÃO cria outra fórmula. Quando há Scan, reusamos a massa magra dele;
 * sem Scan, o usuário informa % de gordura (derivamos a massa magra) ou a TMB direta.
 */
export const TMB_BASE = 370;
export const TMB_PER_LEAN_KG = 21.6;

export function estimateTmbFromLeanMass(leanMassKg: number): number {
  if (!Number.isFinite(leanMassKg) || leanMassKg <= 0) {
    return 0;
  }

  return Math.round(TMB_BASE + TMB_PER_LEAN_KG * leanMassKg);
}

export function leanMassFromBodyFat(weightKg: number, bodyFatPercent: number): number {
  if (
    !Number.isFinite(weightKg) ||
    !Number.isFinite(bodyFatPercent) ||
    weightKg <= 0 ||
    bodyFatPercent < 0 ||
    bodyFatPercent >= 100
  ) {
    return 0;
  }

  return round1(weightKg * (1 - bodyFatPercent / 100));
}

/** TMB a partir do peso + % de gordura, reusando a fórmula única. */
export function estimateTmbFromBodyFat(weightKg: number, bodyFatPercent: number): number {
  return estimateTmbFromLeanMass(leanMassFromBodyFat(weightKg, bodyFatPercent));
}

/* ─── Sugestões editáveis (NUNCA prescrição) ──────────────────────────────────── */

/** Saldo planejado sugerido por objetivo (kcal/dia). Editável pelo usuário. */
export function suggestedPlannedBalance(goal: GoalKind): number {
  switch (goal) {
    case "lose":
      return -400;
    case "gain":
      return 300;
    case "maintain":
      return 0;
  }
}

/** Meia-largura sugerida da faixa (kcal). ~6% do alvo, com piso/teto sensatos. */
export function suggestedToleranceKcal(alvoCentralKcal: number): number {
  const sixPercent = Math.round(Math.abs(alvoCentralKcal) * 0.06);
  return clamp(sixPercent, 120, 300);
}

/* ─── Motor energético ────────────────────────────────────────────────────────── */

export type EnergyPlanInput = {
  tmbKcal: number;
  routineLevel: RoutineLevel;
  /** Soma das atividades ESTRUTURADAS registradas no dia (treinos). */
  activitiesKcal: number;
  plannedBalanceKcal: number;
  /** Meia-largura da faixa. Se ausente/inválida, é derivada do alvo. */
  toleranceKcal?: number;
};

export type EnergyPlan = {
  tmbKcal: number;
  routineFactor: number;
  gastoBaseKcal: number;
  gastoDiaKcal: number;
  alvoCentralKcal: number;
  toleranceKcal: number;
  bandLowKcal: number;
  bandHighKcal: number;
};

export function computeEnergyPlan(input: EnergyPlanInput): EnergyPlan {
  const tmbKcal = nonNegative(input.tmbKcal);
  const routineFactor = ROUTINE_FACTORS[input.routineLevel];
  const activitiesKcal = nonNegative(input.activitiesKcal);
  const plannedBalanceKcal = Number.isFinite(input.plannedBalanceKcal) ? input.plannedBalanceKcal : 0;

  const gastoBaseKcal = Math.round(tmbKcal * routineFactor);
  const gastoDiaKcal = gastoBaseKcal + Math.round(activitiesKcal);
  const alvoCentralKcal = gastoDiaKcal + Math.round(plannedBalanceKcal);

  const toleranceKcal =
    input.toleranceKcal !== undefined && Number.isFinite(input.toleranceKcal) && input.toleranceKcal > 0
      ? Math.round(input.toleranceKcal)
      : suggestedToleranceKcal(alvoCentralKcal);

  return {
    tmbKcal,
    routineFactor,
    gastoBaseKcal,
    gastoDiaKcal,
    alvoCentralKcal,
    toleranceKcal,
    bandLowKcal: Math.max(alvoCentralKcal - toleranceKcal, 0),
    bandHighKcal: alvoCentralKcal + toleranceKcal,
  };
}

export function classifyConsumption(consumedKcal: number, plan: EnergyPlan): ConsumptionStatus {
  const consumed = nonNegative(consumedKcal);

  if (consumed < plan.bandLowKcal) {
    return "below";
  }

  if (consumed > plan.bandHighKcal) {
    return "above";
  }

  return "within";
}

/** kcal restantes até o TOPO da faixa (0 quando já passou do topo). */
export function kcalToBandTop(consumedKcal: number, plan: EnergyPlan): number {
  return Math.max(plan.bandHighKcal - nonNegative(consumedKcal), 0);
}

/** kcal acima do topo da faixa (0 quando ainda dentro/abaixo). */
export function kcalOverBandTop(consumedKcal: number, plan: EnergyPlan): number {
  return Math.max(nonNegative(consumedKcal) - plan.bandHighKcal, 0);
}

/* ─── helpers ─────────────────────────────────────────────────────────────────── */

function nonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
