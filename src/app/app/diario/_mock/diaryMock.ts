/**
 * Diário Alimentar — camada de mock isolada e determinística.
 *
 * FASE VISUAL/MOCKADA: nada aqui toca rede, Supabase, IA, Storage ou localStorage.
 * O estado principal da demonstração é semeado por `createSeededDay()` de forma
 * determinística (valores fixos, sem `Date.now`), para que Home e /app/diario
 * mostrem sempre o mesmo cenário. Os tipos espelham a modelagem proposta em
 * docs/diario-alimentar/04-modelagem-dados.md para facilitar a troca futura por
 * dados reais sem reescrever a UI.
 */

/* ─── Tipos de domínio ───────────────────────────────────────────────────────── */

export type MealType = "cafe_da_manha" | "almoco" | "lanche" | "jantar" | "extra";

export type NutritionSource = "taco" | "ia_estimado" | "manual";

export type FoodCategory =
  | "carboidrato"
  | "proteina"
  | "vegetal"
  | "fruta"
  | "gordura"
  | "bebida";

export type CatalogFood = {
  id: string;
  nome: string;
  categoria: FoodCategory;
  /** Valores por 100 g (aproximados da TACO — mock). */
  kcal: number;
  proteinaG: number;
  carboG: number;
  gorduraG: number;
};

export type DiaryItem = {
  id: string;
  foodId: string;
  nome: string;
  categoria: FoodCategory;
  /** Valor atual (confirmado/editado pelo usuário) — espelha grams_confirmed. */
  gramas: number;
  /** Estimativa original da "IA", congelada — base do slider e do restaurar. */
  gramasEstimadas: number;
  /** 0–1, confiança simulada da IA para este item. */
  confianca: number;
  fonte: NutritionSource;
};

export type DiaryMeal = {
  id: string;
  mealType: MealType;
  /** Rótulo de horário fixo (string) — sem depender de Date para renderizar. */
  loggedAtLabel: string;
  itens: DiaryItem[];
};

export type ActivityEntry = {
  id: string;
  label: string;
  kcal: number;
};

export type BurnMode = "atividades" | "estimativa";

export type DiaryDay = {
  /** null = usuário ainda não definiu a meta (estado de primeiro uso). */
  targetKcal: number | null;
  burnMode: BurnMode;
  estimatedDailyBurn: number;
  activities: ActivityEntry[];
  meals: DiaryMeal[];
};

export type Macros = {
  kcal: number;
  proteinaG: number;
  carboG: number;
  gorduraG: number;
};

export type MacroTargets = {
  proteinaG: number;
  carboG: number;
  gorduraG: number;
};

export type MacroKey = "proteinaG" | "carboG" | "gorduraG";

/* ─── Constantes ─────────────────────────────────────────────────────────────── */

/** Meta sugerida no primeiro uso (na versão real virá da TMB do MoveScan). */
export const SUGGESTED_TARGET_KCAL = 2200;

/** ~7700 kcal de saldo ≈ 1 kg — usado só internamente, nunca exibido como peso. */
export const KCAL_PER_KG = 7700;

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

/* ─── Catálogo (valores por 100 g, aproximados da TACO) ──────────────────────── */

export const FOOD_CATALOG: CatalogFood[] = [
  { id: "arroz", nome: "Arroz branco cozido", categoria: "carboidrato", kcal: 128, proteinaG: 2.5, carboG: 28.1, gorduraG: 0.2 },
  { id: "feijao", nome: "Feijão carioca cozido", categoria: "carboidrato", kcal: 76, proteinaG: 4.8, carboG: 13.6, gorduraG: 0.5 },
  { id: "frango", nome: "Peito de frango grelhado", categoria: "proteina", kcal: 159, proteinaG: 32, carboG: 0, gorduraG: 2.5 },
  { id: "bife", nome: "Bife bovino grelhado", categoria: "proteina", kcal: 219, proteinaG: 32.2, carboG: 0, gorduraG: 9.1 },
  { id: "ovo", nome: "Ovo frito", categoria: "proteina", kcal: 240, proteinaG: 15.6, carboG: 1.2, gorduraG: 18.6 },
  { id: "salada", nome: "Salada de folhas com tomate", categoria: "vegetal", kcal: 19, proteinaG: 1.1, carboG: 3.5, gorduraG: 0.2 },
  { id: "farofa", nome: "Farofa pronta", categoria: "carboidrato", kcal: 406, proteinaG: 2.1, carboG: 76.4, gorduraG: 9.1 },
  { id: "batata-frita", nome: "Batata frita", categoria: "carboidrato", kcal: 267, proteinaG: 3.4, carboG: 35.6, gorduraG: 12.6 },
  { id: "pao", nome: "Pão francês", categoria: "carboidrato", kcal: 300, proteinaG: 8, carboG: 58.6, gorduraG: 3.1 },
  { id: "banana", nome: "Banana prata", categoria: "fruta", kcal: 98, proteinaG: 1.3, carboG: 26, gorduraG: 0.1 },
  { id: "cafe", nome: "Café com açúcar", categoria: "bebida", kcal: 33, proteinaG: 0.3, carboG: 7.8, gorduraG: 0 },
  { id: "queijo", nome: "Queijo minas frescal", categoria: "proteina", kcal: 264, proteinaG: 17.4, carboG: 3.2, gorduraG: 20.2 },
  { id: "macarrao", nome: "Macarrão cozido", categoria: "carboidrato", kcal: 158, proteinaG: 5.8, carboG: 30.9, gorduraG: 1.2 },
];

export function findFood(foodId: string): CatalogFood | null {
  return FOOD_CATALOG.find((food) => food.id === foodId) ?? null;
}

/* ─── Cálculo (mesma regra que o backend fará: gramas × valor por 100 g) ──────── */

export function macrosForItem(item: DiaryItem): Macros {
  const food = findFood(item.foodId);

  if (!food) {
    return { kcal: 0, proteinaG: 0, carboG: 0, gorduraG: 0 };
  }

  const factor = item.gramas / 100;

  return {
    kcal: Math.round(food.kcal * factor),
    proteinaG: round1(food.proteinaG * factor),
    carboG: round1(food.carboG * factor),
    gorduraG: round1(food.gorduraG * factor),
  };
}

export function sumMacros(itens: DiaryItem[]): Macros {
  return itens.reduce<Macros>(
    (acc, item) => {
      const macros = macrosForItem(item);

      return {
        kcal: acc.kcal + macros.kcal,
        proteinaG: round1(acc.proteinaG + macros.proteinaG),
        carboG: round1(acc.carboG + macros.carboG),
        gorduraG: round1(acc.gorduraG + macros.gorduraG),
      };
    },
    { kcal: 0, proteinaG: 0, carboG: 0, gorduraG: 0 },
  );
}

export function mealTotals(meal: DiaryMeal): Macros {
  return sumMacros(meal.itens);
}

export function dayConsumed(day: DiaryDay): Macros {
  return sumMacros(day.meals.flatMap((meal) => meal.itens));
}

export function dayBurned(day: DiaryDay): number {
  if (day.burnMode === "estimativa") {
    return day.estimatedDailyBurn;
  }

  return day.activities.reduce((acc, activity) => acc + activity.kcal, 0);
}

/** Split padrão 25% proteína / 45% carboidrato / 30% gordura (4-4-9 kcal/g). */
export function macroTargetsForKcal(targetKcal: number): MacroTargets {
  return {
    proteinaG: Math.round((targetKcal * 0.25) / 4),
    carboG: Math.round((targetKcal * 0.45) / 4),
    gorduraG: Math.round((targetKcal * 0.3) / 9),
  };
}

export type MacroContribution = { nome: string; grams: number };

/** Agrega, por alimento, quanto cada um contribuiu para um macro no dia (desc). */
export function macroContributions(day: DiaryDay, macro: MacroKey): MacroContribution[] {
  const byFood = new Map<string, MacroContribution>();

  for (const meal of day.meals) {
    for (const item of meal.itens) {
      const grams = macrosForItem(item)[macro];

      if (grams <= 0) {
        continue;
      }

      const existing = byFood.get(item.foodId);

      if (existing) {
        existing.grams = round1(existing.grams + grams);
      } else {
        byFood.set(item.foodId, { nome: item.nome, grams });
      }
    }
  }

  return [...byFood.values()].sort((left, right) => right.grams - left.grams);
}

/** Refeições-âncora distintas já registradas (repetir um almoço não conta 2x). */
export function anchorsLogged(day: DiaryDay): number {
  return new Set(
    day.meals.filter((meal) => meal.mealType !== "extra").map((meal) => meal.mealType),
  ).size;
}

/* ─── Análise do dia (regras determinísticas — custo zero, instantâneo) ───────── */

export type DayInsights = { headline: string; tips: string[] };

export function buildDayInsights(day: DiaryDay): DayInsights {
  const targetKcal = day.targetKcal ?? SUGGESTED_TARGET_KCAL;
  const consumed = dayConsumed(day);
  const burned = dayBurned(day);
  const macroTargets = macroTargetsForKcal(targetKcal);
  const anchors = anchorsLogged(day);
  const hasDinner = day.meals.some((meal) => meal.mealType === "jantar");
  const hasActivity = burned > 0;
  const remaining = targetKcal + burned - consumed.kcal;
  const tips: string[] = [];

  const headline =
    remaining >= 0
      ? `Você tem ${formatKcal(remaining)} kcal disponíveis e ${anchors} de 4 refeições registradas.`
      : `Você passou ${formatKcal(Math.abs(remaining))} kcal da meta de hoje.`;

  const proteinGap = Math.round(macroTargets.proteinaG - consumed.proteinaG);

  if (proteinGap > 15) {
    tips.push(
      `Faltam ~${proteinGap}g de proteína para o alvo. Referência: 150g de frango grelhado somam 48g.`,
    );
  }

  const fatExcess = Math.round(consumed.gorduraG - macroTargets.gorduraG);

  if (fatExcess > 5) {
    tips.push(
      `As gorduras passaram o alvo em ~${fatExcess}g. Prefira preparos grelhados ou assados no resto do dia.`,
    );
  }

  if (!hasDinner && remaining > 300) {
    tips.push(
      `Sobram ${formatKcal(remaining)} kcal para o jantar — dá para um prato completo dentro da meta.`,
    );
  }

  if (hasActivity && Math.round(macroTargets.carboG - consumed.carboG) > 30) {
    tips.push("Você registrou atividade hoje: repor carboidrato ajuda na recuperação.");
  }

  if (remaining < 0) {
    tips.push("Um dia acima da meta não desfaz a semana — um déficit leve nos próximos dias compensa.");
  }

  if (tips.length === 0) {
    tips.push("Continue registrando as refeições — quanto mais completo o diário, melhores as análises.");
  }

  return { headline, tips: tips.slice(0, 3) };
}

/* ─── Sugestões rápidas de atividade (mock) ──────────────────────────────────── */

export const QUICK_ACTIVITIES: Array<{ label: string; kcal: number }> = [
  { label: "Treino de força · 50 min", kcal: 280 },
  { label: "Corrida · 5 km", kcal: 350 },
  { label: "Caminhada · 40 min", kcal: 160 },
  { label: "Bike · 30 min", kcal: 240 },
];

/* ─── Itens que a "IA" detecta no prato de exemplo (fixos, determinísticos) ───── */

export function buildAnalysisItems(): DiaryItem[] {
  return [
    analysisItem("arroz", "carboidrato", 150, 0.92, "taco"),
    analysisItem("feijao", "carboidrato", 100, 0.88, "taco"),
    analysisItem("frango", "proteina", 120, 0.81, "taco"),
    analysisItem("salada", "vegetal", 60, 0.74, "taco"),
    analysisItem("farofa", "carboidrato", 30, 0.62, "ia_estimado"),
  ];
}

export const ANALYSIS_OBSERVATIONS: string[] = [
  "O frango parece grelhado — se foi preparado com óleo, o valor real pode ser maior.",
  "Molhos e temperos líquidos não são visíveis na foto e não entraram na conta.",
];

export const PROCESSING_STEPS: string[] = [
  "Analisando enquadramento e iluminação",
  "Identificando os alimentos do prato",
  "Estimando porções em gramas",
  "Consultando tabela nutricional (TACO)",
  "Montando o resumo da refeição",
];

export type DetectionBox = { label: string; top: number; left: number; width: number; height: number };

export const DETECTION_BOXES: DetectionBox[] = [
  { label: "Arroz", top: 22, left: 8, width: 38, height: 34 },
  { label: "Feijão", top: 58, left: 14, width: 30, height: 28 },
  { label: "Frango", top: 30, left: 52, width: 36, height: 30 },
  { label: "Salada", top: 8, left: 44, width: 26, height: 22 },
  { label: "Farofa", top: 64, left: 56, width: 24, height: 22 },
];

/* ─── Histórico determinístico (7 dias, sem variação de peso — fora do P1) ────── */

export type HistoryDay = {
  key: string;
  weekdayLabel: string;
  dateLabel: string;
  consumedKcal: number;
  burnedKcal: number;
  targetKcal: number;
  isToday: boolean;
};

/** Saldo do dia: consumido − (meta + gasto). Negativo = déficit. */
export function dayBalance(day: Pick<HistoryDay, "consumedKcal" | "burnedKcal" | "targetKcal">): number {
  return day.consumedKcal - (day.targetKcal + day.burnedKcal);
}

/**
 * Histórico fixo de 6 dias anteriores + hoje. Valores determinísticos (não
 * dependem da data real). O ponto "hoje" recebe os totais reais do dia semeado.
 */
export function buildHistory(today: { consumedKcal: number; burnedKcal: number; targetKcal: number }): HistoryDay[] {
  const past: Array<Omit<HistoryDay, "isToday">> = [
    { key: "d-6", weekdayLabel: "qui", dateLabel: "01/08", consumedKcal: 2080, burnedKcal: 180, targetKcal: 2200 },
    { key: "d-5", weekdayLabel: "sex", dateLabel: "02/08", consumedKcal: 2410, burnedKcal: 120, targetKcal: 2200 },
    { key: "d-4", weekdayLabel: "sáb", dateLabel: "03/08", consumedKcal: 2260, burnedKcal: 90, targetKcal: 2200 },
    { key: "d-3", weekdayLabel: "dom", dateLabel: "04/08", consumedKcal: 1980, burnedKcal: 60, targetKcal: 2200 },
    { key: "d-2", weekdayLabel: "seg", dateLabel: "05/08", consumedKcal: 2150, burnedKcal: 300, targetKcal: 2200 },
    { key: "d-1", weekdayLabel: "ter", dateLabel: "06/08", consumedKcal: 2040, burnedKcal: 220, targetKcal: 2200 },
  ];

  return [
    ...past.map((day) => ({ ...day, isToday: false })),
    {
      key: "today",
      weekdayLabel: "hoje",
      dateLabel: "07/08",
      consumedKcal: today.consumedKcal,
      burnedKcal: today.burnedKcal,
      targetKcal: today.targetKcal,
      isToday: true,
    },
  ];
}

/* ─── Estados semeados (determinísticos) ─────────────────────────────────────── */

/** Estado de primeiro uso: sem meta, sem refeições, sem atividades. */
export function createEmptyDay(): DiaryDay {
  return {
    targetKcal: null,
    burnMode: "atividades",
    estimatedDailyBurn: 450,
    activities: [],
    meals: [],
  };
}

/**
 * Estado principal da demonstração: meta definida, café + almoço registrados,
 * uma atividade. Determinístico — mesmos valores em todo carregamento.
 */
export function createSeededDay(): DiaryDay {
  return {
    targetKcal: 2200,
    burnMode: "atividades",
    estimatedDailyBurn: 450,
    activities: [{ id: nextId("act"), label: "Treino de força · 50 min", kcal: 280 }],
    meals: [
      {
        id: nextId("meal"),
        mealType: "cafe_da_manha",
        loggedAtLabel: "07:40",
        itens: [
          seedItem("pao", "carboidrato", 50, 0.95, "taco"),
          seedItem("ovo", "proteina", 55, 0.9, "taco"),
          seedItem("banana", "fruta", 85, 0.93, "taco"),
          seedItem("cafe", "bebida", 150, 0.7, "ia_estimado"),
        ],
      },
      {
        id: nextId("meal"),
        mealType: "almoco",
        loggedAtLabel: "12:30",
        itens: buildAnalysisItems(),
      },
    ],
  };
}

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

let idCounter = 0;

/** Contador determinístico por carga (sem Date.now) — só serve de key React. */
export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function suggestMealTypeByHour(hour: number): MealType {
  if (hour < 10) return "cafe_da_manha";
  if (hour < 14) return "almoco";
  if (hour < 18) return "lanche";
  return "jantar";
}

export function formatKcal(value: number): string {
  return value.toLocaleString("pt-BR");
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function seedItem(
  foodId: string,
  categoria: FoodCategory,
  gramas: number,
  confianca: number,
  fonte: NutritionSource,
): DiaryItem {
  const food = findFood(foodId);

  return {
    id: nextId("item"),
    foodId,
    nome: food?.nome ?? foodId,
    categoria,
    gramas,
    gramasEstimadas: gramas,
    confianca,
    fonte,
  };
}

function analysisItem(
  foodId: string,
  categoria: FoodCategory,
  gramas: number,
  confianca: number,
  fonte: NutritionSource,
): DiaryItem {
  return seedItem(foodId, categoria, gramas, confianca, fonte);
}
