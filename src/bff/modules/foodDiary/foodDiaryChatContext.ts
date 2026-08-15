import type {
  FoodDiaryHistoryResponse,
  FoodDiaryTodayResponse,
} from "@/bff/modules/foodDiary/types";

/**
 * Constrói o CONTEXTO (compacto, estruturado) do Diário para a IA Move — HOJE +
 * últimos 7 dias. PURO e testável: recebe as respostas já resolvidas pelo BFF
 * (Today/History) e devolve texto. NÃO inclui fotos, signed URLs, payload cru da
 * OpenAI nem dados de outro usuário — o chamador já resolveu tudo do usuário
 * autenticado. Tudo é estimativa (deixado explícito), nunca diagnóstico.
 */

function kcal(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${Math.round(value)} kcal`;
}

function grams(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${Math.round(value)} g`;
}

const STATUS_LABEL: Record<string, string> = {
  below: "abaixo da faixa",
  within: "dentro da faixa",
  above: "acima da faixa",
  incomplete: "sem plano no dia",
};

const MEAL_LABEL: Record<string, string> = {
  cafe_da_manha: "Café da manhã",
  almoco: "Almoço",
  lanche: "Lanche",
  jantar: "Jantar",
  extra: "Extra",
};

/** Linha "próximo passo" derivada do HUD (mesma regra 2.1; presentation-only). */
function nextStepLine(today: FoodDiaryTodayResponse): string {
  const hud = today.hud;
  if (!hud) {
    return "Usuário ainda não montou o plano energético.";
  }
  if (hud.status === "above") {
    return `${Math.round(hud.kcalOverBandTop)} kcal acima do topo da faixa hoje.`;
  }
  if (hud.status === "within") {
    return "Dentro da faixa hoje.";
  }
  const toEnter = Math.max(hud.bandLowKcal - hud.consumedKcal, 0);
  return `Faltam ${Math.round(toEnter)} kcal para entrar na faixa.`;
}

/** Bloco data-only reusado no 1º turno e nos follow-ups (persistentContext). */
export function buildFoodDiaryContextBlock(
  today: FoodDiaryTodayResponse,
  history: FoodDiaryHistoryResponse,
): string {
  const lines: string[] = [
    "Contexto real do Diário Alimentar do usuário (valores são ESTIMATIVAS a partir de fotos/descrições e da tabela nutricional — não medição clínica).",
    "",
    `HOJE (${today.date}):`,
  ];

  const hud = today.hud;
  if (hud) {
    lines.push(`- Objetivo: ${hud.goalLabel} (${hud.missionLabel}).`);
    lines.push(`- Situação: ${STATUS_LABEL[hud.status] ?? hud.status} — ${hud.statusLabel}.`);
    lines.push(`- Faixa-alvo do dia: ${Math.round(hud.bandLowKcal)}–${Math.round(hud.bandHighKcal)} kcal (alvo ${Math.round(hud.alvoCentralKcal)}).`);
    lines.push(`- Gasto do dia (estimado): ${kcal(hud.gastoDiaKcal)} (TMB ${kcal(hud.tmbKcal)} × rotina + atividades).`);
  } else {
    lines.push("- Usuário ainda não montou o plano energético (sem objetivo/faixa definidos).");
  }

  lines.push(`- Consumido hoje: ${kcal(today.totals.consumedKcal)}.`);
  lines.push(
    `- Macros consumidos: proteína ${grams(today.totals.consumedProteinG)} · carboidrato ${grams(today.totals.consumedCarbG)} · gordura ${grams(today.totals.consumedFatG)}.`,
  );
  lines.push(`- Próximo passo: ${nextStepLine(today)}`);

  // Refeições confirmadas (resumos, sem fotos).
  if (today.meals.length > 0) {
    lines.push(`- Refeições confirmadas (${today.meals.length}):`);
    for (const meal of today.meals) {
      const mealKcal = meal.confirmedTotals.kcal ?? meal.estimatedTotals.kcal ?? 0;
      const items = meal.items
        .filter((item) => !item.isRemoved)
        .map((item) => item.name)
        .slice(0, 8)
        .join(", ");
      lines.push(`  - ${MEAL_LABEL[meal.mealType] ?? meal.mealType} ~${Math.round(mealKcal)} kcal${items ? `: ${items}` : ""}.`);
    }
  } else {
    lines.push("- Nenhuma refeição confirmada hoje ainda.");
  }

  // Atividades (gasto extra).
  if (today.activities.length > 0) {
    lines.push(`- Atividades hoje (gasto extra ~${Math.round(today.totals.burnedKcal)} kcal):`);
    for (const activity of today.activities.slice(0, 8)) {
      lines.push(`  - ${activity.label ?? "Atividade"} ~${Math.round(activity.kcalBurned)} kcal.`);
    }
  } else {
    lines.push("- Nenhuma atividade registrada hoje.");
  }

  // Últimos 7 dias.
  lines.push("", "ÚLTIMOS 7 DIAS (mais antigo → mais recente):");
  for (const day of history.days) {
    const band =
      day.bandLowKcal !== null && day.bandHighKcal !== null
        ? `faixa ${Math.round(day.bandLowKcal)}–${Math.round(day.bandHighKcal)}`
        : "sem faixa";
    lines.push(
      `- ${day.date}: consumo ${Math.round(day.consumedKcal)} kcal · ${STATUS_LABEL[day.status] ?? day.status} · ${band} · proteína ${grams(day.consumedProteinG)} · atividade ${Math.round(day.burnedKcal)} kcal.`,
    );
  }

  lines.push(buildTrendLine(history));
  lines.push("- Aviso: todos os números são estimativas de fitness, não diagnóstico nem prescrição.");

  return lines.join("\n");
}

/** Tendência simples dos 7 dias (consistência + médias). */
function buildTrendLine(history: FoodDiaryHistoryResponse): string {
  const days = history.days;
  const planned = days.filter((day) => day.status !== "incomplete");

  if (planned.length === 0) {
    return "- Tendência (7 dias): ainda sem dias com plano ativo para comparar.";
  }

  const withinCount = planned.filter((day) => day.status === "within").length;
  const avgConsumed = Math.round(
    planned.reduce((sum, day) => sum + day.consumedKcal, 0) / planned.length,
  );
  const avgProtein = Math.round(
    planned.reduce((sum, day) => sum + day.consumedProteinG, 0) / planned.length,
  );

  return `- Tendência (7 dias): ${withinCount} de ${planned.length} dias dentro da faixa · consumo médio ~${avgConsumed} kcal · proteína média ~${avgProtein} g.`;
}

/** Conteúdo enriquecido (oculto) do PRIMEIRO turno: contexto + tarefa + guardrails. */
export function buildFoodDiaryUnderstandPrompt(
  today: FoodDiaryTodayResponse,
  history: FoodDiaryHistoryResponse,
  visibleMessage: string,
): string {
  return [
    "O usuário abriu o gatilho contextual 'Conversar com a IA sobre meu dia' no Diário Alimentar do app Move.",
    "",
    "Mensagem visível do usuário:",
    visibleMessage,
    "",
    buildFoodDiaryContextBlock(today, history),
    "",
    "Tarefa:",
    "Ajude o usuário a entender o dia dele com base NESTES dados.",
    "Responda em 2 a 4 frases curtas + no máximo 3 bullets quando fizer sentido.",
    "Pode: explicar a situação vs. a faixa, interpretar macros, apontar padrões simples dos últimos dias e ajudar a decidir o próximo movimento (ex.: sugerir tipos de refeição genéricos).",
    "Deixe claro quando algo for estimativa.",
    "Não invente refeições, alimentos ou atividades que não estão nos dados.",
    "Não dê diagnóstico, prescrição clínica nem prometa resultado; para dúvida clínica, oriente procurar um profissional.",
    "Nunca prometa precisão absoluta das calorias/gastos.",
    "",
    "Formato: use **negrito** para destaques curtos e listas com '- '. Não use títulos com #.",
  ].join("\n");
}
