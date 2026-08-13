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
    // ABAIXO: a ação principal é SEMPRE quanto falta para ENTRAR na faixa
    // (bandLow − consumido) — nunca "até o topo". Ganho de massa só muda o tom.
    const toEnter = Math.max(hud.bandLowKcal - hud.consumedKcal, 0);

    return {
      primary: {
        iconKey: "utensils",
        title: `Faltam ${fmt(toEnter)} kcal para entrar na sua faixa`,
        detail:
          hud.goal === "gain"
            ? "Ganho de massa pede energia — registre a próxima refeição para chegar lá."
            : "Registre a próxima refeição para chegar lá.",
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

  // within — reforça que a pessoa JÁ está no plano; espaço restante é opcional,
  // sem soar como obrigação de "comer até o topo".
  return {
    primary: {
      iconKey: "check",
      title: "Você está seguindo seu plano hoje",
      detail:
        hud.kcalToBandTop > 0
          ? `No seu ritmo — ainda cabem ${fmt(hud.kcalToBandTop)} kcal, sem obrigação de chegar ao topo.`
          : "No seu ritmo — você já está no alvo de hoje.",
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
