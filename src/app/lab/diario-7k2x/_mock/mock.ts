/**
 * Diário Alimentar — LAB (100% mock).
 *
 * Nada aqui toca rede, banco ou IA. Os tipos espelham a modelagem proposta em
 * docs/diario-alimentar/04-modelagem-dados.md (food_diary_entries / food_diary_items /
 * daily_calorie_targets / activity_energy_entries) para que, quando formos criar as
 * tabelas e rotas reais, o schema já esteja validado pela UI.
 */

/* ─── Tipos de domínio (mock) ────────────────────────────────────────────────── */

export type MealType = "cafe_da_manha" | "almoco" | "lanche" | "jantar" | "extra";

export type NutritionSource = "taco" | "ia_estimado" | "manual";

export type CatalogFood = {
  id: string;
  nome: string;
  categoria: "carboidrato" | "proteina" | "vegetal" | "fruta" | "gordura" | "bebida";
  /** Valores por 100 g (aproximados da tabela TACO). */
  kcal: number;
  proteinaG: number;
  carboG: number;
  gorduraG: number;
};

export type DiaryItem = {
  id: string;
  foodId: string;
  nome: string;
  categoria: CatalogFood["categoria"];
  /** Valor atual (confirmado/editado pelo usuário) — espelha grams_confirmed do schema real. */
  gramas: number;
  /** Estimativa original da IA, congelada — escala fixa do slider e opção de restaurar. */
  gramasEstimadas: number;
  /** 0–1, confiança simulada da IA para este item. */
  confianca: number;
  fonte: NutritionSource;
};

export type DiaryEntry = {
  id: string;
  mealType: MealType;
  loggedAtISO: string;
  itens: DiaryItem[];
};

export type ActivityEntry = {
  id: string;
  label: string;
  kcal: number;
};

export type BurnMode = "atividades" | "estimativa";

export type DayState = {
  /** yyyy-mm-dd — se mudar o dia, o mock reinicia. */
  dateKey: string;
  /** null = usuário ainda não definiu a meta (estado de primeiro uso). */
  targetKcal: number | null;
  burnMode: BurnMode;
  estimatedDailyBurn: number;
  activities: ActivityEntry[];
  entries: DiaryEntry[];
};

/** Meta sugerida no primeiro uso (na versão final virá da TMB do Scan × fator de atividade). */
export const SUGGESTED_TARGET_KCAL = 2200;

/* ─── Catálogo mock (valores por 100 g, aproximados da TACO) ─────────────────── */

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
  { id: "azeite", nome: "Azeite de oliva", categoria: "gordura", kcal: 884, proteinaG: 0, carboG: 0, gorduraG: 100 },
  { id: "macarrao", nome: "Macarrão cozido", categoria: "carboidrato", kcal: 158, proteinaG: 5.8, carboG: 30.9, gorduraG: 1.2 },
];

export function findFood(foodId: string): CatalogFood | null {
  return FOOD_CATALOG.find((food) => food.id === foodId) ?? null;
}

/* ─── Cálculo de macros (mesma regra que o backend fará: gramas × por-100g) ──── */

export type Macros = {
  kcal: number;
  proteinaG: number;
  carboG: number;
  gorduraG: number;
};

export function macrosForItem(item: DiaryItem): Macros {
  const food = findFood(item.foodId);

  if (!food) {
    return { kcal: 0, proteinaG: 0, carboG: 0, gorduraG: 0 };
  }

  const factor = item.gramas / 100;

  return {
    kcal: Math.round(food.kcal * factor),
    proteinaG: Math.round(food.proteinaG * factor * 10) / 10,
    carboG: Math.round(food.carboG * factor * 10) / 10,
    gorduraG: Math.round(food.gorduraG * factor * 10) / 10,
  };
}

export function sumMacros(itens: DiaryItem[]): Macros {
  return itens.reduce<Macros>(
    (acc, item) => {
      const macros = macrosForItem(item);

      return {
        kcal: acc.kcal + macros.kcal,
        proteinaG: Math.round((acc.proteinaG + macros.proteinaG) * 10) / 10,
        carboG: Math.round((acc.carboG + macros.carboG) * 10) / 10,
        gorduraG: Math.round((acc.gorduraG + macros.gorduraG) * 10) / 10,
      };
    },
    { kcal: 0, proteinaG: 0, carboG: 0, gorduraG: 0 },
  );
}

export function entryTotals(entry: DiaryEntry): Macros {
  return sumMacros(entry.itens);
}

export function dayConsumed(day: DayState): Macros {
  return sumMacros(day.entries.flatMap((entry) => entry.itens));
}

export function dayBurned(day: DayState): number {
  if (day.burnMode === "estimativa") {
    return day.estimatedDailyBurn;
  }

  return day.activities.reduce((acc, activity) => acc + activity.kcal, 0);
}

/* ─── Labels e helpers de refeição ───────────────────────────────────────────── */

export const MEAL_LABELS: Record<MealType, string> = {
  cafe_da_manha: "Café da manhã",
  almoco: "Almoço",
  lanche: "Lanche",
  jantar: "Jantar",
  extra: "Extra",
};

/** Âncoras da trilha do dia (o "extra" fica fora da trilha, listado à parte). */
export const MEAL_ORDER: MealType[] = ["cafe_da_manha", "almoco", "lanche", "jantar"];

/** Opções oferecidas no wizard (inclui refeições fora do padrão). */
export const MEAL_CHOICES: MealType[] = [...MEAL_ORDER, "extra"];

export function suggestMealTypeByHour(hour: number): MealType {
  if (hour < 10) return "cafe_da_manha";
  if (hour < 14) return "almoco";
  if (hour < 18) return "lanche";
  return "jantar";
}

/* ─── Metas de macro (derivadas da meta de kcal — sem mais um formulário) ────── */

export type MacroTargets = {
  proteinaG: number;
  carboG: number;
  gorduraG: number;
};

/** Split padrão 25% proteína / 45% carboidrato / 30% gordura (4-4-9 kcal/g). */
export function macroTargetsForKcal(targetKcal: number): MacroTargets {
  return {
    proteinaG: Math.round((targetKcal * 0.25) / 4),
    carboG: Math.round((targetKcal * 0.45) / 4),
    gorduraG: Math.round((targetKcal * 0.3) / 9),
  };
}

/* ─── Drill-down: quais alimentos contribuíram para cada macro ───────────────── */

export type MacroKey = "proteinaG" | "carboG" | "gorduraG";

export type MacroContribution = {
  nome: string;
  grams: number;
};

/** Agrega, por alimento, quanto cada um contribuiu para um macro no dia (desc). */
export function macroContributions(day: DayState, macro: MacroKey): MacroContribution[] {
  const byFood = new Map<string, MacroContribution>();

  for (const entry of day.entries) {
    for (const item of entry.itens) {
      const grams = macrosForItem(item)[macro];

      if (grams <= 0) {
        continue;
      }

      const existing = byFood.get(item.foodId);

      if (existing) {
        existing.grams = Math.round((existing.grams + grams) * 10) / 10;
      } else {
        byFood.set(item.foodId, { nome: item.nome, grams });
      }
    }
  }

  return [...byFood.values()].sort((left, right) => right.grams - left.grams);
}

/* ─── Análise do dia: resumo + dicas por regras sobre os dados reais ─────────── */
// No mock (e possivelmente na v1 real) as dicas vêm de regras determinísticas —
// são instantâneas, custam zero e já são personalizadas pelos dados do dia.
// IA generativa entra depois, via gancho com o Chat Move (context trigger).

export type DayInsights = {
  headline: string;
  tips: string[];
};

export function buildDayInsights(input: {
  consumed: Macros;
  burned: number;
  targetKcal: number;
  macroTargets: MacroTargets;
  anchorsLogged: number;
  hasDinner: boolean;
  hasActivity: boolean;
}): DayInsights {
  const { consumed, burned, targetKcal, macroTargets, anchorsLogged, hasDinner, hasActivity } = input;
  const remaining = targetKcal + burned - consumed.kcal;
  const tips: string[] = [];

  const headline =
    remaining >= 0
      ? `Você tem ${remaining.toLocaleString("pt-BR")} kcal disponíveis e ${anchorsLogged} de 4 refeições registradas.`
      : `Você passou ${Math.abs(remaining).toLocaleString("pt-BR")} kcal da meta de hoje.`;

  const proteinGap = Math.round(macroTargets.proteinaG - consumed.proteinaG);

  if (proteinGap > 15) {
    tips.push(
      `Faltam ~${proteinGap}g de proteína para o alvo. Referência: 150g de frango grelhado adicionam 48g.`,
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
      `Sobram ${remaining.toLocaleString("pt-BR")} kcal para o jantar — dá para um prato completo sem sair da meta.`,
    );
  }

  const carbGap = Math.round(macroTargets.carboG - consumed.carboG);

  if (hasActivity && carbGap > 30) {
    tips.push(
      `Você treinou hoje: repor carboidrato ajuda na recuperação (~${carbGap}g abaixo do alvo).`,
    );
  }

  if (remaining < 0) {
    tips.push(
      "Um dia acima da meta não desfaz a semana — um déficit leve nos próximos dias compensa.",
    );
  }

  if (anchorsLogged >= 4 && remaining >= 0 && remaining <= targetKcal * 0.15) {
    tips.push("Dia redondo: 4 refeições registradas e consumo dentro da meta.");
  }

  if (tips.length === 0) {
    tips.push("Continue registrando as refeições — quanto mais completo o diário, melhores as análises.");
  }

  return { headline, tips: tips.slice(0, 3) };
}

/* ─── Histórico mock de dias anteriores ──────────────────────────────────────── */

/** Pseudo-aleatório determinístico (mesmo dia → mesmos números em todo render). */
export function pseudoRandom(seed: number): number {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

/** ~7700 kcal de déficit/superávit ≈ 1 kg de massa corporal. */
export const KCAL_PER_KG = 7700;

export type HistoryDay = {
  dateKey: string;
  /** Rótulo curto: "seg", "ter"... */
  weekdayLabel: string;
  /** Rótulo completo: "08/07". */
  dateLabel: string;
  consumedKcal: number;
  burnedKcal: number;
  targetKcal: number;
  isToday: boolean;
};

const WEEKDAY_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** Gera `days` dias anteriores (mock determinístico, tendência de leve déficit). */
export function buildMockHistory(days = 13, targetKcal = 2200): HistoryDay[] {
  const history: HistoryDay[] = [];
  const now = new Date();

  for (let offset = days; offset >= 1; offset -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - offset);

    const seed = date.getDate() + date.getMonth() * 31;
    const consumed = 1800 + Math.round((pseudoRandom(seed) * 750) / 10) * 10;
    const burned = Math.round((pseudoRandom(seed + 17) * 400) / 10) * 10;
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const dayOfMonth = String(date.getDate()).padStart(2, "0");

    history.push({
      dateKey: `${date.getFullYear()}-${month}-${dayOfMonth}`,
      weekdayLabel: WEEKDAY_SHORT[date.getDay()],
      dateLabel: `${dayOfMonth}/${month}`,
      consumedKcal: consumed,
      burnedKcal: burned,
      targetKcal,
      isToday: false,
    });
  }

  return history;
}

/** Saldo do dia para fins de peso: consumido − (meta + gasto). Negativo = déficit. */
export function dayBalance(day: Pick<HistoryDay, "consumedKcal" | "burnedKcal" | "targetKcal">): number {
  return day.consumedKcal - (day.targetKcal + day.burnedKcal);
}

/* ─── Resultado mock da "análise de IA" ──────────────────────────────────────── */

let idCounter = 0;

export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

function analysisItem(
  foodId: string,
  nome: string,
  categoria: CatalogFood["categoria"],
  gramas: number,
  confianca: number,
  fonte: NutritionSource = "taco",
): DiaryItem {
  return { id: nextId("item"), foodId, nome, categoria, gramas, gramasEstimadas: gramas, confianca, fonte };
}

/** Itens que a "IA" detecta no prato de exemplo (PF brasileiro clássico). */
export function buildMockAnalysisItems(): DiaryItem[] {
  return [
    analysisItem("arroz", "Arroz branco cozido", "carboidrato", 150, 0.92),
    analysisItem("feijao", "Feijão carioca cozido", "carboidrato", 100, 0.88),
    analysisItem("frango", "Peito de frango grelhado", "proteina", 120, 0.81),
    analysisItem("salada", "Salada de folhas com tomate", "vegetal", 60, 0.74),
    analysisItem("farofa", "Farofa pronta", "carboidrato", 30, 0.62, "ia_estimado"),
  ];
}

export const MOCK_OBSERVATIONS: string[] = [
  "O frango parece grelhado — se foi preparado com óleo, o valor real pode ser maior.",
  "Molhos e temperos líquidos não são visíveis na foto e não entraram na conta.",
];

/** Etapas exibidas na animação de processamento. */
export const PROCESSING_STEPS: string[] = [
  "Analisando enquadramento e iluminação",
  "Identificando os alimentos do prato",
  "Estimando porções em gramas",
  "Consultando tabela nutricional (TACO)",
  "Montando o resumo da refeição",
];

/** Caixas de detecção (posições % sobre a imagem) para a animação de scan. */
export type DetectionBox = {
  label: string;
  top: number;
  left: number;
  width: number;
  height: number;
};

export const DETECTION_BOXES: DetectionBox[] = [
  { label: "Arroz", top: 22, left: 8, width: 38, height: 34 },
  { label: "Feijão", top: 58, left: 14, width: 30, height: 28 },
  { label: "Frango", top: 30, left: 52, width: 36, height: 30 },
  { label: "Salada", top: 8, left: 44, width: 26, height: 22 },
  { label: "Farofa", top: 64, left: 56, width: 24, height: 22 },
];

/* ─── Atividades rápidas (mock) ──────────────────────────────────────────────── */

export const QUICK_ACTIVITIES: Array<{ label: string; kcal: number }> = [
  { label: "Treino de força · 50 min", kcal: 280 },
  { label: "Corrida · 5 km", kcal: 350 },
  { label: "Caminhada · 40 min", kcal: 160 },
  { label: "Bike · 30 min", kcal: 240 },
];

/* ─── Estado inicial do dia (semeado para a tela nunca nascer vazia) ─────────── */

export function todayKey(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(now.getDate()).padStart(2, "0");

  return `${now.getFullYear()}-${month}-${dayOfMonth}`;
}

/** Estado de primeiro uso: sem meta, sem refeições, sem atividades. */
export function emptyDay(): DayState {
  return {
    dateKey: todayKey(),
    targetKcal: null,
    burnMode: "atividades",
    estimatedDailyBurn: 450,
    activities: [],
    entries: [],
  };
}

export function seedDay(): DayState {
  const now = new Date();
  const breakfastAt = new Date(now);
  breakfastAt.setHours(7, 40, 0, 0);

  return {
    dateKey: todayKey(),
    targetKcal: 2200,
    burnMode: "atividades",
    estimatedDailyBurn: 450,
    activities: [{ id: nextId("act"), label: "Treino de força · 50 min", kcal: 280 }],
    entries: [
      {
        id: nextId("entry"),
        mealType: "cafe_da_manha",
        loggedAtISO: breakfastAt.toISOString(),
        itens: [
          { id: nextId("item"), foodId: "pao", nome: "Pão francês", categoria: "carboidrato", gramas: 50, gramasEstimadas: 50, confianca: 0.95, fonte: "taco" },
          { id: nextId("item"), foodId: "ovo", nome: "Ovo frito", categoria: "proteina", gramas: 55, gramasEstimadas: 55, confianca: 0.9, fonte: "taco" },
          { id: nextId("item"), foodId: "banana", nome: "Banana prata", categoria: "fruta", gramas: 85, gramasEstimadas: 85, confianca: 0.93, fonte: "taco" },
          { id: nextId("item"), foodId: "cafe", nome: "Café com açúcar", categoria: "bebida", gramas: 150, gramasEstimadas: 150, confianca: 0.7, fonte: "ia_estimado" },
        ],
      },
    ],
  };
}

/* ─── Persistência local (só navegador, nada sai da máquina) ─────────────────── */

const STORAGE_KEY = "move-diario-lab-v1";

export function loadDay(): DayState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as DayState;

    if (parsed.dateKey !== todayKey()) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function saveDay(day: DayState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(day));
  } catch {
    // Sem storage disponível — o mock segue funcionando só em memória.
  }
}

export function clearDay(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // idem
  }
}
