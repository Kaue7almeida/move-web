#!/usr/bin/env node
/**
 * Diário Alimentar — harness de validação empírica (LOCAL, sem banco).
 *
 * Mede a qualidade real da estimativa por foto contra um ground truth medido
 * (balança / rótulo). NÃO toca Supabase, NÃO lê dados de usuários — só chama a
 * API da OpenAI (mesma OPENAI_API_KEY do serviço) sobre imagens locais, usando o
 * MESMO JSON Schema estruturado da produção (espelhado abaixo; fonte da verdade:
 * src/bff/modules/foodDiary/infra/OpenAiFoodDiaryClient.ts).
 *
 * Uso:
 *   OPENAI_API_KEY=sk-... node scripts/food-diary-benchmark/run.mjs \
 *     --cases scripts/food-diary-benchmark/cases.csv \
 *     --images ./benchmark-images --out results.csv --repeat 3
 *
 * Ver docs/diario-alimentar/09-validacao-empirica.md para o protocolo e os gates.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";

const MODEL = process.env.OPENAI_FOOD_DIARY_MODEL || "gpt-4o-mini";
const ENDPOINT = "https://api.openai.com/v1/responses";

const NULLABLE_STRING = { anyOf: [{ type: "string" }, { type: "null" }] };
const NULLABLE_NUMBER = { anyOf: [{ type: "number" }, { type: "null" }] };

// Espelha AI_ITEM_SCHEMA / FOOD_DIARY_JSON_SCHEMA da produção (mantido em sincronia
// manual — este é um utilitário de avaliação, não código de produto).
const ITEM_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "name", "preparation", "category", "identification", "alternatives",
    "gramsEstimated", "householdMeasure", "confidence", "isPartiallyHidden",
    "kcalPer100g", "proteinPer100g", "carbPer100g", "fatPer100g", "fiberPer100g", "uncertainty",
  ],
  properties: {
    name: { type: "string" },
    preparation: NULLABLE_STRING,
    category: { type: "string" },
    identification: { type: "string", enum: ["identified", "ambiguous", "unknown"] },
    alternatives: { type: "array", items: { type: "string" } },
    gramsEstimated: { type: "number" },
    householdMeasure: NULLABLE_STRING,
    confidence: { type: "number" },
    isPartiallyHidden: { type: "boolean" },
    kcalPer100g: { type: "number" },
    proteinPer100g: { type: "number" },
    carbPer100g: { type: "number" },
    fatPer100g: { type: "number" },
    fiberPer100g: NULLABLE_NUMBER,
    uncertainty: NULLABLE_STRING,
  },
};

const JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["analysis"],
  properties: {
    analysis: {
      type: "object",
      additionalProperties: false,
      required: ["qualityOverall", "needsRetake", "confidence", "items", "observations"],
      properties: {
        qualityOverall: { type: "string", enum: ["boa", "media", "ruim"] },
        needsRetake: { type: "boolean" },
        confidence: { type: "number" },
        items: { type: "array", items: ITEM_SCHEMA },
        observations: { type: "array", items: { type: "string" } },
      },
    },
  },
};

const SYSTEM_PROMPT = [
  "You are a meal photo analysis engine (fitness estimate, NOT medical).",
  "Identify foods, estimate grams and per-100g nutrients. Preparation is PER ITEM.",
  "Mark identification 'ambiguous' when you cannot tell which food it is and the",
  "candidates differ in calories (e.g. grilled meat: chicken/pork/beef) — list",
  "alternatives. NEVER fake certainty. confidence is self-reported, not accuracy.",
  "All strings in pt-BR. Return only the structured JSON.",
].join(" ");

/* ─── args ─── */
function parseArgs(argv) {
  const args = { repeat: 1, out: "results.csv" };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === "--cases") args.cases = argv[++i];
    else if (key === "--images") args.images = argv[++i];
    else if (key === "--out") args.out = argv[++i];
    else if (key === "--repeat") args.repeat = Math.max(1, Number(argv[++i]) || 1);
  }
  if (!args.cases || !args.images) {
    console.error("Uso: node run.mjs --cases <csv> --images <dir> [--out <csv>] [--repeat N]");
    process.exit(2);
  }
  return args;
}

/* ─── minimal CSV ─── */
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  const header = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row = {};
    header.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
    return row;
  });
}

function toCsvValue(value) {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

async function analyzeImage(dataUrl, mealType, containerSize) {
  const context = [
    `Tipo de refeição: ${mealType || "almoco"}`,
    containerSize ? `Recipiente: ${containerSize}` : "",
    "Analise a refeição a partir da foto (vista de cima).",
  ].filter(Boolean).join("\n");

  const body = {
    model: MODEL,
    instructions: SYSTEM_PROMPT,
    input: [{
      role: "user",
      content: [
        { type: "input_text", text: context },
        { type: "input_image", image_url: dataUrl },
      ],
    }],
    store: false,
    text: { format: { type: "json_schema", name: "food_diary_analysis", schema: JSON_SCHEMA, strict: true } },
  };

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`OpenAI ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }

  const data = await response.json();
  const message = (data.output || []).find((item) => item.type === "message");
  const textPart = message?.content?.find((c) => c.type === "output_text");
  const raw = textPart?.text ?? data.output_text;
  return JSON.parse(raw).analysis;
}

/* ─── metrics ─── */
function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function totalsFromItems(items) {
  let kcal = 0, protein = 0, carb = 0, fat = 0, grams = 0;
  for (const item of items) {
    const f = num(item.gramsEstimated) / 100;
    protein += num(item.proteinPer100g) * f;
    carb += num(item.carbPer100g) * f;
    fat += num(item.fatPer100g) * f;
    grams += num(item.gramsEstimated);
  }
  kcal = 4 * protein + 4 * carb + 9 * fat; // Atwater, como na produção
  return { kcal, protein, carb, fat, grams };
}

function relError(estimate, truth) {
  if (!(truth > 0)) return "";
  return Math.abs(estimate - truth) / truth;
}

function identificationRecall(items, gtItems) {
  if (gtItems.length === 0) return "";
  const haystack = items.flatMap((i) => [i.name, ...(i.alternatives || [])]).map((s) => String(s).toLowerCase());
  const hits = gtItems.filter((gt) => {
    const needle = gt.toLowerCase();
    return haystack.some((h) => h.includes(needle) || needle.includes(h));
  });
  return hits.length / gtItems.length;
}

function median(values) {
  const nums = values.filter((v) => typeof v === "number" && Number.isFinite(v)).sort((a, b) => a - b);
  if (nums.length === 0) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

function percentile(values, p) {
  const nums = values.filter((v) => typeof v === "number" && Number.isFinite(v)).sort((a, b) => a - b);
  if (nums.length === 0) return null;
  return nums[Math.min(nums.length - 1, Math.floor((p / 100) * nums.length))];
}

function pct(value) {
  return value === null ? "n/a" : `${Math.round(value * 100)}%`;
}

/* ─── main ─── */
async function main() {
  const args = parseArgs(process.argv);
  if (!process.env.OPENAI_API_KEY) {
    console.error("Defina OPENAI_API_KEY no ambiente.");
    process.exit(2);
  }

  const cases = parseCsv(readFileSync(args.cases, "utf8"));
  const outRows = [];
  const agg = { kcalErr: [], gramsErr: [], proteinErr: [], carbErr: [], idRecall: [] };
  const repeatByCase = new Map();
  let ambiguityHits = 0;
  let ambiguityCases = 0;
  let falseAmbiguous = 0;

  for (const testCase of cases) {
    const imagePath = join(args.images, testCase.image_file);
    let dataUrl;
    try {
      const bytes = readFileSync(imagePath);
      const mime = MIME[extname(imagePath).toLowerCase()] || "image/jpeg";
      dataUrl = `data:${mime};base64,${bytes.toString("base64")}`;
    } catch {
      console.warn(`! imagem não encontrada: ${imagePath} — pulando ${testCase.case_id}`);
      continue;
    }

    const gtItems = (testCase.gt_items || "").split(";").map((s) => s.trim()).filter(Boolean);
    const expectAmbiguous = (testCase.expected_ambiguous || "").toLowerCase() === "yes";

    for (let rep = 1; rep <= args.repeat; rep += 1) {
      let analysis;
      try {
        analysis = await analyzeImage(dataUrl, testCase.meal_type, testCase.container_size);
      } catch (error) {
        console.warn(`! falha ${testCase.case_id} rep${rep}: ${error.message}`);
        continue;
      }

      const totals = totalsFromItems(analysis.items || []);
      const kcalErr = relError(totals.kcal, num(testCase.gt_total_kcal));
      const gramsErr = relError(totals.grams, num(testCase.gt_total_grams));
      const proteinErr = relError(totals.protein, num(testCase.gt_protein_g));
      const carbErr = relError(totals.carb, num(testCase.gt_carb_g));
      const idRecall = identificationRecall(analysis.items || [], gtItems);
      const gotAmbiguous = (analysis.items || []).some((i) => i.identification === "ambiguous");

      if (expectAmbiguous) {
        ambiguityCases += 1;
        if (gotAmbiguous) ambiguityHits += 1;
      } else if (gotAmbiguous) {
        falseAmbiguous += 1;
      }

      if (typeof kcalErr === "number") agg.kcalErr.push(kcalErr);
      if (typeof gramsErr === "number") agg.gramsErr.push(gramsErr);
      if (typeof proteinErr === "number") agg.proteinErr.push(proteinErr);
      if (typeof carbErr === "number") agg.carbErr.push(carbErr);
      if (typeof idRecall === "number") agg.idRecall.push(idRecall);

      if (!repeatByCase.has(testCase.case_id)) repeatByCase.set(testCase.case_id, []);
      repeatByCase.get(testCase.case_id).push(totals.kcal);

      outRows.push({
        case_id: testCase.case_id, scenario: testCase.scenario, rep,
        items: (analysis.items || []).length,
        got_ambiguous: gotAmbiguous ? "yes" : "no", expected_ambiguous: expectAmbiguous ? "yes" : "no",
        est_kcal: Math.round(totals.kcal), gt_kcal: testCase.gt_total_kcal,
        kcal_err: kcalErr === "" ? "" : kcalErr.toFixed(3),
        grams_err: gramsErr === "" ? "" : gramsErr.toFixed(3),
        id_recall: idRecall === "" ? "" : idRecall.toFixed(2),
        overall_confidence: num(analysis.confidence).toFixed(2),
        quality: analysis.qualityOverall, needs_retake: analysis.needsRetake ? "yes" : "no",
      });
      process.stdout.write(".");
    }
  }
  process.stdout.write("\n");

  // repeatability: relative stddev of total kcal across repeats
  const repeatDispersions = [];
  for (const kcals of repeatByCase.values()) {
    if (kcals.length < 2) continue;
    const mean = kcals.reduce((a, b) => a + b, 0) / kcals.length;
    if (mean <= 0) continue;
    const variance = kcals.reduce((a, b) => a + (b - mean) ** 2, 0) / kcals.length;
    repeatDispersions.push(Math.sqrt(variance) / mean);
  }

  const header = Object.keys(outRows[0] || { case_id: "", note: "sem resultados" });
  const csv = [header.join(","), ...outRows.map((r) => header.map((h) => toCsvValue(r[h])).join(","))].join("\n");
  writeFileSync(args.out, `${csv}\n`);

  console.log("\n── Resumo (mediana · P90) ─────────────────────────────");
  console.log(`Análises:            ${outRows.length}`);
  console.log(`Erro kcal:           ${pct(median(agg.kcalErr))} · ${pct(percentile(agg.kcalErr, 90))}`);
  console.log(`Erro gramas:         ${pct(median(agg.gramsErr))} · ${pct(percentile(agg.gramsErr, 90))}`);
  console.log(`Erro proteína:       ${pct(median(agg.proteinErr))} · ${pct(percentile(agg.proteinErr, 90))}`);
  console.log(`Erro carboidrato:    ${pct(median(agg.carbErr))} · ${pct(percentile(agg.carbErr, 90))}`);
  console.log(`Identificação (recall mediano): ${pct(median(agg.idRecall))}`);
  console.log(`Ambiguidade correta: ${ambiguityCases ? `${ambiguityHits}/${ambiguityCases}` : "n/a"} · falsos-ambíguos: ${falseAmbiguous}`);
  console.log(`Repetibilidade (desvio mediano): ${pct(median(repeatDispersions))}`);
  console.log(`\nResultados por análise: ${args.out}`);
  console.log("Compare com os gates da seção 4 de docs/diario-alimentar/09-validacao-empirica.md");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
