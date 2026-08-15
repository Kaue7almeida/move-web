import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildFoodDiaryContextBlock,
  buildFoodDiaryUnderstandPrompt,
} from "@/bff/modules/foodDiary/foodDiaryChatContext";
import type {
  FoodDiaryHistoryResponse,
  FoodDiaryTodayResponse,
} from "@/bff/modules/foodDiary/types";

function mkToday(overrides: Partial<FoodDiaryTodayResponse> = {}): FoodDiaryTodayResponse {
  return {
    date: "2026-08-14",
    target: null,
    plan: { goal: "lose" },
    hud: {
      goal: "lose",
      goalLabel: "Perder gordura",
      missionLabel: "Missão: perder gordura",
      status: "below",
      statusLabel: "Você ainda está abaixo da faixa de hoje",
      tmbKcal: 1700,
      gastoBaseKcal: 2210,
      gastoDiaKcal: 2210,
      alvoCentralKcal: 1810,
      bandLowKcal: 1660,
      bandHighKcal: 1960,
      consumedKcal: 900,
      burnedKcal: 0,
      kcalToBandTop: 1060,
      kcalOverBandTop: 0,
      plannedBalanceKcal: -400,
    },
    meals: [
      {
        mealType: "almoco",
        confirmedTotals: { kcal: 620, proteinG: 40, carbG: 60, fatG: 18, fiberG: 5 },
        estimatedTotals: { kcal: 620, proteinG: 40, carbG: 60, fatG: 18, fiberG: 5 },
        items: [
          { name: "Arroz", isRemoved: false },
          { name: "Frango grelhado", isRemoved: false },
          { name: "Removido", isRemoved: true },
        ],
      },
    ],
    activities: [{ label: "Caminhada · 4 km · 50 min", kcalBurned: 167 }],
    totals: {
      consumedKcal: 900,
      consumedProteinG: 55,
      consumedCarbG: 90,
      consumedFatG: 25,
      consumedFiberG: 7,
      burnedKcal: 167,
      remainingKcal: 1067,
    },
    ...overrides,
  } as unknown as FoodDiaryTodayResponse;
}

function mkHistory(): FoodDiaryHistoryResponse {
  return {
    days: [
      { date: "2026-08-08", consumedKcal: 1800, consumedProteinG: 100, burnedKcal: 0, status: "within", goal: "lose", gastoDiaKcal: 2210, alvoCentralKcal: 1810, bandLowKcal: 1660, bandHighKcal: 1960, plannedBalanceKcal: -400 },
      { date: "2026-08-09", consumedKcal: 2400, consumedProteinG: 90, burnedKcal: 300, status: "above", goal: "lose", gastoDiaKcal: 2510, alvoCentralKcal: 2110, bandLowKcal: 1960, bandHighKcal: 2260, plannedBalanceKcal: -400 },
      { date: "2026-08-10", consumedKcal: 0, consumedProteinG: 0, burnedKcal: 0, status: "incomplete", goal: null, gastoDiaKcal: null, alvoCentralKcal: null, bandLowKcal: null, bandHighKcal: null, plannedBalanceKcal: null },
    ],
  } as unknown as FoodDiaryHistoryResponse;
}

test("bloco de contexto: HOJE (objetivo/faixa/status/macros/refeições/atividades) + 7 dias + tendência", () => {
  const block = buildFoodDiaryContextBlock(mkToday(), mkHistory());

  assert.match(block, /HOJE \(2026-08-14\)/);
  assert.match(block, /Perder gordura/);
  assert.match(block, /Faixa-alvo do dia: 1660–1960/);
  assert.match(block, /abaixo da faixa/);
  assert.match(block, /Faltam 760 kcal para entrar na faixa/); // 1660 − 900
  assert.match(block, /Almoço ~620 kcal: Arroz, Frango grelhado/);
  assert.doesNotMatch(block, /Removido/); // item removido não entra
  assert.match(block, /Caminhada · 4 km · 50 min ~167 kcal/);
  assert.match(block, /ÚLTIMOS 7 DIAS/);
  assert.match(block, /2026-08-09: consumo 2400 kcal · acima da faixa/);
  assert.match(block, /Tendência \(7 dias\): 1 de 2 dias dentro da faixa/); // 'incomplete' fora da conta
  assert.match(block, /estimativas/i);
});

test("nunca vaza foto/URL/JSON cru", () => {
  const block = buildFoodDiaryContextBlock(mkToday(), mkHistory());
  assert.doesNotMatch(block, /http|signed|storage|photo|\.jpg|\.png/i);
});

test("sem plano: contexto degrada com segurança", () => {
  const block = buildFoodDiaryContextBlock(mkToday({ plan: null, hud: null }), mkHistory());
  assert.match(block, /ainda não montou o plano/i);
  assert.match(block, /Consumido hoje/);
});

test("prompt do 1º turno: contexto + tarefa + guardrails (sem diagnóstico/prescrição)", () => {
  const prompt = buildFoodDiaryUnderstandPrompt(mkToday(), mkHistory(), "Me ajuda a entender meu dia?");
  assert.match(prompt, /Me ajuda a entender meu dia\?/);
  assert.match(prompt, /HOJE \(2026-08-14\)/); // inclui o bloco
  assert.match(prompt, /Tarefa:/);
  assert.match(prompt, /Não invente/);
  assert.match(prompt, /diagnóstico/i);
});
