import assert from "node:assert/strict";
import { test } from "node:test";

import { estimateActivity } from "@/bff/modules/foodDiary/activityEstimation";

test("caminhada 4 km em 50 min (80 kg) → MET por velocidade + gasto EXTRA líquido", () => {
  const r = estimateActivity({ activityKey: "walking", weightKg: 80, durationMinutes: 50, distanceKm: 4, intensity: null });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.speedKmh, 4.8); // 4 km / (50/60) h
    assert.equal(r.met, 3.5); // bracket de caminhada moderada
    // Líquido: (3.5 − 1) × 80 × (50/60) = 166.7 → 167 (NÃO 200, que seria bruto).
    assert.equal(r.activeKcal, 167);
    assert.equal(r.label, "Caminhada");
  }
});

test("corrida 5 km em 32 min (75 kg) → MET de corrida por velocidade", () => {
  const r = estimateActivity({ activityKey: "running", weightKg: 75, durationMinutes: 32, distanceKm: 5, intensity: null });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.met, 9.8); // ~9.4 km/h
    assert.equal(r.activeKcal, Math.round((9.8 - 1) * 75 * (32 / 60))); // 352
  }
});

test("musculação 45 min sem intensidade → moderada (MET 5.0)", () => {
  const r = estimateActivity({ activityKey: "strength", weightKg: 80, durationMinutes: 45, distanceKm: null, intensity: null });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.met, 5.0);
    assert.equal(r.activeKcal, 240); // (5−1) × 80 × 0.75
    assert.equal(r.speedKmh, null);
  }
});

test("intensidade muda o MET da musculação (leve < moderada < intensa)", () => {
  const leve = estimateActivity({ activityKey: "strength", weightKg: 80, durationMinutes: 45, distanceKm: null, intensity: "leve" });
  const intensa = estimateActivity({ activityKey: "strength", weightKg: 80, durationMinutes: 45, distanceKm: null, intensity: "intensa" });
  assert.ok(leve.ok && intensa.ok);
  if (leve.ok && intensa.ok) {
    assert.ok(leve.activeKcal < intensa.activeKcal);
  }
});

test("sem duração (só passos/distância) → missing_duration (não inventa)", () => {
  const r = estimateActivity({ activityKey: "walking", weightKg: 80, durationMinutes: null, distanceKm: 4, intensity: null });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.reason, "missing_duration");
  }
});

test("atividade fora da curadoria → unknown_activity (MET nunca inventado)", () => {
  const r = estimateActivity({ activityKey: "crossfit_freestyle", weightKg: 80, durationMinutes: 30, distanceKm: null, intensity: null });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.reason, "unknown_activity");
  }
});

test("peso ausente/inválido → invalid_weight", () => {
  assert.equal(estimateActivity({ activityKey: "walking", weightKg: 0, durationMinutes: 30, distanceKm: null, intensity: null }).ok, false);
  assert.equal(estimateActivity({ activityKey: "walking", weightKg: 500, durationMinutes: 30, distanceKm: null, intensity: null }).ok, false);
});

test("gasto é líquido: usa (MET − 1), nunca MET cheio", () => {
  const r = estimateActivity({ activityKey: "sports", weightKg: 70, durationMinutes: 60, distanceKm: null, intensity: "moderada" });
  assert.ok(r.ok);
  if (r.ok) {
    // MET sports moderada = 7.0 → líquido (7−1)×70×1 = 420 (bruto seria 490).
    assert.equal(r.activeKcal, 420);
  }
});
