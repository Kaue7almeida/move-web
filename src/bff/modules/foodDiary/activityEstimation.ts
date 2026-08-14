/**
 * Diário — estimativa de GASTO EXTRA de atividade física (PURO, sem I/O).
 *
 * Princípios (inegociáveis):
 *  • METs vêm de um CONJUNTO CURADO baseado no 2024 Compendium of Physical
 *    Activities (Herrmann et al.). A IA só MAPEIA a descrição para uma dessas
 *    chaves — nunca inventa um MET arbitrário.
 *  • O gasto-base do MoveX (TMB × fatorRotina) já inclui o repouso, então aqui
 *    calculamos o EXTRA de forma líquida:
 *        activeKcal = max(0, (MET − 1) × pesoKg × duraçãoHoras)
 *  • Sempre "gasto EXTRA estimado". Nunca promessa de precisão.
 *
 * NÃO altera o motor energético (planEnergy). É uma função de estimativa isolada,
 * determinística e testável. Se faltar dado (duração/peso) ou a atividade não for
 * reconhecida, retorna um motivo — nunca um número inventado.
 */

export type ActivityKey =
  | "walking"
  | "running"
  | "cycling"
  | "strength"
  | "stairs"
  | "elliptical"
  | "swimming"
  | "soccer"
  | "basketball"
  | "tennis"
  | "volleyball"
  | "sports";

export const ACTIVITY_KEYS: readonly ActivityKey[] = [
  "walking",
  "running",
  "cycling",
  "strength",
  "stairs",
  "elliptical",
  "swimming",
  "soccer",
  "basketball",
  "tennis",
  "volleyball",
  "sports",
];

export type ActivityIntensity = "leve" | "moderada" | "intensa";

/** Rótulo humano (pt-BR) de cada atividade curada. */
export const ACTIVITY_LABELS: Record<ActivityKey, string> = {
  walking: "Caminhada",
  running: "Corrida",
  cycling: "Bike",
  strength: "Musculação",
  stairs: "Escadas",
  elliptical: "Elíptico",
  swimming: "Natação",
  soccer: "Futebol",
  basketball: "Basquete",
  tennis: "Tênis",
  volleyball: "Vôlei",
  sports: "Atividade esportiva",
};

type SpeedBracket = { maxKmh: number; met: number };
type IntensityMet = Record<ActivityIntensity, number>;

/** Retorna o MET do primeiro bracket cujo teto de velocidade cobre `kmh`. */
function fromSpeed(kmh: number, brackets: readonly SpeedBracket[]): number {
  for (const bracket of brackets) {
    if (kmh < bracket.maxKmh) {
      return bracket.met;
    }
  }
  return brackets[brackets.length - 1].met;
}

/* ── Brackets de velocidade (2024 Compendium; km/h → MET) ── */
const WALK_SPEED: readonly SpeedBracket[] = [
  { maxKmh: 3.6, met: 2.8 },
  { maxKmh: 4.4, met: 3.0 },
  { maxKmh: 5.2, met: 3.5 },
  { maxKmh: 6.0, met: 4.3 },
  { maxKmh: 7.0, met: 5.0 },
  { maxKmh: Infinity, met: 7.0 },
];
const RUN_SPEED: readonly SpeedBracket[] = [
  { maxKmh: 7.2, met: 6.0 },
  { maxKmh: 8.8, met: 8.3 },
  { maxKmh: 10.8, met: 9.8 },
  { maxKmh: 12.0, met: 11.0 },
  { maxKmh: 13.8, met: 11.8 },
  { maxKmh: 15.5, met: 12.8 },
  { maxKmh: Infinity, met: 14.5 },
];
const CYCLE_SPEED: readonly SpeedBracket[] = [
  { maxKmh: 16, met: 4.0 },
  { maxKmh: 19.2, met: 6.8 },
  { maxKmh: 22.4, met: 8.0 },
  { maxKmh: 25.6, met: 10.0 },
  { maxKmh: Infinity, met: 12.0 },
];

/* ── Mapeamento por intensidade (quando não há velocidade) ── */
const WALK_INTENSITY: IntensityMet = { leve: 2.8, moderada: 3.5, intensa: 5.0 };
const RUN_INTENSITY: IntensityMet = { leve: 8.3, moderada: 9.8, intensa: 11.8 };
const CYCLE_INTENSITY: IntensityMet = { leve: 4.0, moderada: 6.8, intensa: 10.0 };
const STRENGTH_INTENSITY: IntensityMet = { leve: 3.5, moderada: 5.0, intensa: 6.0 };
const STAIRS_INTENSITY: IntensityMet = { leve: 4.0, moderada: 5.0, intensa: 8.8 };
const ELLIPTICAL_INTENSITY: IntensityMet = { leve: 4.6, moderada: 5.0, intensa: 8.0 };
const SWIM_INTENSITY: IntensityMet = { leve: 5.3, moderada: 7.0, intensa: 9.8 };
const SPORTS_INTENSITY: IntensityMet = { leve: 5.0, moderada: 7.0, intensa: 8.5 };

type MetContext = { speedKmh: number | null; intensity: ActivityIntensity | null };

/** Resolvedor de MET por atividade. Nunca lê MET do modelo — só da curadoria. */
const MET_RESOLVERS: Record<ActivityKey, (ctx: MetContext) => number> = {
  walking: ({ speedKmh, intensity }) =>
    speedKmh !== null ? fromSpeed(speedKmh, WALK_SPEED) : WALK_INTENSITY[intensity ?? "moderada"],
  running: ({ speedKmh, intensity }) =>
    speedKmh !== null ? fromSpeed(speedKmh, RUN_SPEED) : RUN_INTENSITY[intensity ?? "moderada"],
  cycling: ({ speedKmh, intensity }) =>
    speedKmh !== null ? fromSpeed(speedKmh, CYCLE_SPEED) : CYCLE_INTENSITY[intensity ?? "moderada"],
  strength: ({ intensity }) => STRENGTH_INTENSITY[intensity ?? "moderada"],
  stairs: ({ intensity }) => STAIRS_INTENSITY[intensity ?? "moderada"],
  elliptical: ({ intensity }) => ELLIPTICAL_INTENSITY[intensity ?? "moderada"],
  swimming: ({ intensity }) => SWIM_INTENSITY[intensity ?? "moderada"],
  soccer: () => 7.0,
  basketball: () => 6.5,
  tennis: () => 7.3,
  volleyball: () => 4.0,
  sports: ({ intensity }) => SPORTS_INTENSITY[intensity ?? "moderada"],
};

export function isActivityKey(value: string): value is ActivityKey {
  return (ACTIVITY_KEYS as readonly string[]).includes(value);
}

export type EstimateActivityInput = {
  activityKey: string;
  weightKg: number;
  durationMinutes: number | null;
  distanceKm: number | null;
  intensity: ActivityIntensity | null;
};

export type EstimateActivityResult =
  | {
      ok: true;
      activityKey: ActivityKey;
      label: string;
      met: number;
      /** Gasto EXTRA estimado (kcal), líquido do repouso já contido no gasto-base. */
      activeKcal: number;
      durationMinutes: number;
      distanceKm: number | null;
      speedKmh: number | null;
    }
  | { ok: false; reason: "unknown_activity" | "missing_duration" | "invalid_weight" };

const MAX_DURATION_MIN = 12 * 60; // teto sensato (12 h) — evita entradas absurdas

/**
 * Função CENTRAL da estimativa. Determinística: mesmos inputs → mesmo kcal.
 * Nunca inventa: atividade fora da curadoria, sem duração ou sem peso → motivo.
 */
export function estimateActivity(input: EstimateActivityInput): EstimateActivityResult {
  if (!Number.isFinite(input.weightKg) || input.weightKg < 30 || input.weightKg > 400) {
    return { ok: false, reason: "invalid_weight" };
  }

  if (!isActivityKey(input.activityKey)) {
    return { ok: false, reason: "unknown_activity" };
  }

  const duration = input.durationMinutes;

  if (duration === null || !Number.isFinite(duration) || duration <= 0 || duration > MAX_DURATION_MIN) {
    return { ok: false, reason: "missing_duration" };
  }

  const durationHours = duration / 60;
  const distanceKm =
    input.distanceKm !== null && Number.isFinite(input.distanceKm) && input.distanceKm > 0
      ? input.distanceKm
      : null;
  const speedKmh = distanceKm !== null ? round1(distanceKm / durationHours) : null;

  const met = MET_RESOLVERS[input.activityKey]({ speedKmh, intensity: input.intensity });
  const activeKcal = Math.max(0, Math.round((met - 1) * input.weightKg * durationHours));

  return {
    ok: true,
    activityKey: input.activityKey,
    label: ACTIVITY_LABELS[input.activityKey],
    met,
    activeKcal,
    durationMinutes: Math.round(duration),
    distanceKm,
    speedKmh,
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
