import type { LucideIcon } from "lucide-react";
import { Camera, Ruler, Sun } from "lucide-react";

import type { GoalKind, RoutineLevel } from "@/bff/modules/foodDiary/planEnergy";
import type { ContainerSize, MealOrigin, MealType } from "@/bff/modules/foodDiary/types";

/**
 * Copy e constantes fixas do Diário Alimentar. Nada aqui é dado mockado de
 * refeição — são rótulos, opções de formulário e uma sugestão de meta inicial.
 * Todo dado de refeição vem do BFF real (GET/POST /api/v1/food-diary/*).
 */

/** Aviso reutilizado: valores são estimativa, não medição/prescrição. */
export const DIARY_DISCLAIMER =
  "Os valores do Diário são estimativas a partir de fotos e da tabela nutricional. Não substituem o acompanhamento de um nutricionista.";

/* ─── Refeições ──────────────────────────────────────────────────────────────── */

export const MEAL_LABELS: Record<MealType, string> = {
  cafe_da_manha: "Café da manhã",
  almoco: "Almoço",
  lanche: "Lanche",
  jantar: "Jantar",
  extra: "Extra",
};

/** Âncoras da trilha do dia — "extra" fica fora da trilha, contado à parte. */
export const MEAL_ANCHORS: MealType[] = ["cafe_da_manha", "almoco", "lanche", "jantar"];

/** Opções oferecidas no wizard (inclui refeições fora do padrão). */
export const MEAL_CHOICES: MealType[] = [...MEAL_ANCHORS, "extra"];

/** Meta sugerida no primeiro uso (na versão real virá da TMB do MoveScan). */
export const SUGGESTED_TARGET_KCAL = 2200;

/* ─── Contexto da foto (wizard) ──────────────────────────────────────────────── */

export type PrepTip = {
  icon: LucideIcon;
  title: string;
  description: string;
  highlight?: boolean;
};

/** Dicas antes da foto — objeto de referência é o item de maior impacto. */
export const PREP_TIPS: PrepTip[] = [
  {
    icon: Ruler,
    title: "Objeto de referência ao lado",
    description:
      "Um talher ou a sua mão ao lado do prato calibra a escala — é o que mais aumenta a precisão.",
    highlight: true,
  },
  {
    icon: Camera,
    title: "Fotografe de cima",
    description: "Segure o celular na vertical, a 90° do prato, com o prato inteiro no quadro.",
  },
  {
    icon: Sun,
    title: "Boa iluminação",
    description: "Evite sombras fortes cobrindo parte da comida.",
  },
];

export const CONTAINER_OPTIONS: Array<{ value: ContainerSize; label: string }> = [
  { value: "pequeno", label: "Pequeno" },
  { value: "medio", label: "Médio" },
  { value: "grande", label: "Grande" },
];

export const MEAL_ORIGIN_OPTIONS: Array<{ value: MealOrigin; label: string }> = [
  { value: "caseiro", label: "Caseiro" },
  { value: "restaurante", label: "Restaurante" },
  { value: "embalado", label: "Embalado" },
];

export const PREPARO_OPTIONS = ["Grelhado", "Frito", "Cozido", "Assado", "Cru"];
export const ESCONDIDOS_OPTIONS = ["Óleo", "Manteiga", "Açúcar", "Molho"];

/* ─── Sugestões rápidas de atividade ─────────────────────────────────────────── */

export const QUICK_ACTIVITIES: Array<{ label: string; kcal: number }> = [
  { label: "Treino de força · 50 min", kcal: 280 },
  { label: "Corrida · 5 km", kcal: 350 },
  { label: "Caminhada · 40 min", kcal: 160 },
  { label: "Bike · 30 min", kcal: 240 },
];

/* ─── Copy do plano (rótulos curtos + descrições humanas) ────────────────────── */

/** Objetivo em uma frase curta (cards do wizard). */
export const GOAL_DESCRIPTIONS: Record<GoalKind, string> = {
  lose: "Consumir um pouco abaixo do seu gasto.",
  maintain: "Ficar próximo do seu gasto diário.",
  gain: "Consumir um pouco acima do seu gasto.",
};

/** Rótulo curto de rotina (cards legíveis, sem quebrar). */
export const ROUTINE_SHORT_LABELS: Record<RoutineLevel, string> = {
  sedentary: "Baixa",
  light: "Leve",
  moderate: "Moderada",
  high: "Alta",
};

export const ROUTINE_DESCRIPTIONS: Record<RoutineLevel, string> = {
  sedentary: "Trabalho sentado, pouca caminhada.",
  light: "Caminhadas curtas no dia a dia.",
  moderate: "Em pé ou caminhando boa parte do dia.",
  high: "Trabalho físico ou muito movimento.",
};

/** Intensidade do objetivo (saldo planejado por baixo, em kcal/dia). */
export type IntensityPreset = { key: string; label: string; balance: number };

export const INTENSITY_PRESETS: Record<"lose" | "gain", IntensityPreset[]> = {
  lose: [
    { key: "leve", label: "Leve", balance: -200 },
    { key: "moderada", label: "Moderada", balance: -400 },
    { key: "acelerada", label: "Acelerada", balance: -600 },
  ],
  gain: [
    { key: "leve", label: "Leve", balance: 150 },
    { key: "moderada", label: "Moderada", balance: 300 },
    { key: "acelerada", label: "Acelerada", balance: 500 },
  ],
};

/* ─── Formatação ─────────────────────────────────────────────────────────────── */

export function formatKcal(value: number): string {
  return Math.round(value).toLocaleString("pt-BR");
}
