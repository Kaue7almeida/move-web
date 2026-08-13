import type { FoodDiaryTodayResponse } from "@/bff/modules/foodDiary/types";
import type { FoodDiaryHud } from "@/bff/modules/foodDiary/types/plan";

/**
 * "Próximo movimento" — regra DETERMINÍSTICA (sem IA, sem prescrição médica).
 * Pura e sem imports de runtime (só tipos) para ser testável direto: escolhe UMA
 * recomendação principal e, no máximo, uma secundária, a partir do estado do dia.
 * O componente mapeia iconKey → ícone; aqui só há dados.
 */
export type MoveIconKey = "utensils" | "check" | "moon" | "egg";

export type MoveContent = { iconKey: MoveIconKey; title: string; detail?: string };

export type NextMoveResult = { primary: MoveContent; secondary?: MoveContent };

function fmt(value: number): string {
  return Math.round(value).toLocaleString("pt-BR");
}

/** Alvo de proteína = 25% do alvo central ÷ 4 kcal/g (mesma regra do painel de macros). */
function proteinTargetG(alvoCentralKcal: number): number {
  return Math.round((alvoCentralKcal * 0.25) / 4);
}

export function computeNextMove(
  today: FoodDiaryTodayResponse,
  hud: FoodDiaryHud,
): NextMoveResult {
  // Sem refeições: a única ação que importa é começar.
  if (today.meals.length === 0) {
    return {
      primary: {
        iconKey: "utensils",
        title: "Registre sua primeira refeição",
        detail: "É assim que o Diário começa a acompanhar seu dia.",
      },
    };
  }

  const secondary = proteinMove(today, hud);

  if (hud.status === "below") {
    if (hud.goal === "gain") {
      return {
        primary: {
          iconKey: "utensils",
          title: `Ainda cabem ${fmt(hud.kcalToBandTop)} kcal na sua faixa`,
          detail: "Ganho de massa pede energia — uma refeição a mais aproxima do alvo.",
        },
        secondary,
      };
    }

    const toEnter = Math.max(hud.bandLowKcal - hud.consumedKcal, 0);

    return {
      primary: {
        iconKey: "utensils",
        title: `Faltam ${fmt(toEnter)} kcal para entrar na sua faixa`,
        detail: "Registre a próxima refeição para chegar lá.",
      },
      secondary,
    };
  }

  if (hud.status === "above") {
    return {
      primary: {
        iconKey: "moon",
        title: `Você está ${fmt(hud.kcalOverBandTop)} kcal acima da faixa`,
        detail: "Sem drama: um dia mais leve amanhã reequilibra a semana.",
      },
    };
  }

  // within
  return {
    primary: {
      iconKey: "check",
      title: "Você está dentro da sua faixa hoje",
      detail:
        hud.kcalToBandTop > 0
          ? `Ainda cabem ${fmt(hud.kcalToBandTop)} kcal até o topo — mantenha o ritmo.`
          : "Mantenha o ritmo.",
    },
    secondary,
  };
}

/** Secundária opcional: lembrete de proteína quando o gap é relevante (>20g). */
function proteinMove(today: FoodDiaryTodayResponse, hud: FoodDiaryHud): MoveContent | undefined {
  const gap = Math.round(proteinTargetG(hud.alvoCentralKcal) - today.totals.consumedProteinG);

  if (gap > 20) {
    return { iconKey: "egg", title: `Faltam ~${gap}g de proteína`, detail: "priorize na próxima refeição" };
  }

  return undefined;
}
