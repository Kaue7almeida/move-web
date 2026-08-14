import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveActivityEstimate, type WeightSource } from "@/bff/modules/foodDiary/activityEstimateFlow";
import type { ActivityAiInterpretation } from "@/bff/modules/foodDiary/types/activityAi";

function mkInterp(overrides: Partial<ActivityAiInterpretation> = {}): ActivityAiInterpretation {
  return {
    activityKey: "walking",
    label: "Caminhada",
    durationMinutes: 50,
    distanceKm: 4,
    steps: null,
    intensity: null,
    isEverydayMovement: false,
    needsClarification: false,
    clarificationQuestion: null,
    confidence: 0.8,
    notes: null,
    ...overrides,
  };
}

const scan: WeightSource = "scan";

test("caminhada completa + peso → card de estimativa (gasto extra)", () => {
  const out = resolveActivityEstimate({ interpretation: mkInterp(), weightKg: 80, weightSource: scan, forceExtra: false });
  assert.equal(out.kind, "estimate");
  if (out.kind === "estimate") {
    assert.equal(out.estimate.label, "Caminhada");
    assert.equal(out.estimate.activeKcal, 167);
    assert.equal(out.estimate.weightSource, "scan");
    assert.equal(out.estimate.suggestedLabel, "Caminhada · 4 km · 50 min");
  }
});

test("passos sem duração (IA sinaliza) → clarificação com a pergunta da IA", () => {
  const out = resolveActivityEstimate({
    interpretation: mkInterp({ steps: 9000, distanceKm: null, durationMinutes: null, needsClarification: true, clarificationQuestion: "Quanto tempo você levou?" }),
    weightKg: 80,
    weightSource: scan,
    forceExtra: false,
  });
  assert.equal(out.kind, "clarification");
  if (out.kind === "clarification") {
    assert.match(out.question, /tempo/i);
  }
});

test("duração ausente sem flag da IA → clarificação padrão de duração", () => {
  const out = resolveActivityEstimate({
    interpretation: mkInterp({ durationMinutes: null, needsClarification: false }),
    weightKg: 80,
    weightSource: scan,
    forceExtra: false,
  });
  assert.equal(out.kind, "clarification");
});

test("peso ausente → needs_weight (pergunta o peso, só para a estimativa)", () => {
  const out = resolveActivityEstimate({ interpretation: mkInterp(), weightKg: null, weightSource: null, forceExtra: false });
  assert.equal(out.kind, "needs_weight");
  if (out.kind === "needs_weight") {
    assert.match(out.question, /peso/i);
  }
});

test("movimento cotidiano → routine_check; só vira estimativa com forceExtra", () => {
  const interp = mkInterp({ steps: 9000, distanceKm: null, durationMinutes: 60, isEverydayMovement: true });

  const check = resolveActivityEstimate({ interpretation: interp, weightKg: 80, weightSource: scan, forceExtra: false });
  assert.equal(check.kind, "routine_check");

  const extra = resolveActivityEstimate({ interpretation: interp, weightKg: 80, weightSource: scan, forceExtra: true });
  assert.equal(extra.kind, "estimate");
});

test("atividade desconhecida → unrecognized (oferece valor do relógio)", () => {
  const out = resolveActivityEstimate({
    interpretation: mkInterp({ activityKey: "unknown", label: "?" }),
    weightKg: 80,
    weightSource: scan,
    forceExtra: false,
  });
  assert.equal(out.kind, "unrecognized");
});

test("ordem: desconhecida vence clarificação; peso vem depois da duração", () => {
  // desconhecida + needsClarification → unrecognized (não pergunta).
  const unknown = resolveActivityEstimate({
    interpretation: mkInterp({ activityKey: "unknown", needsClarification: true, clarificationQuestion: "x" }),
    weightKg: null,
    weightSource: null,
    forceExtra: false,
  });
  assert.equal(unknown.kind, "unrecognized");

  // duração ausente + peso ausente → pergunta a duração primeiro.
  const durationFirst = resolveActivityEstimate({
    interpretation: mkInterp({ durationMinutes: null }),
    weightKg: null,
    weightSource: null,
    forceExtra: false,
  });
  assert.equal(durationFirst.kind, "clarification");
});
