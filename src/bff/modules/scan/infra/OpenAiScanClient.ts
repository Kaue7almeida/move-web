import { ApiError } from "@/bff/core/errors/ApiError";
import type { ScanAnalysisInput, ScanAnalysisResponse } from "@/bff/modules/scan/types";
import { scanAiResponseSchema } from "@/bff/modules/scan/types";

/* ─── OpenAI Responses API internal types ────────────────────────────────────── */

type InputContentText = { type: "input_text"; text: string };
type InputContentImage = { type: "input_image"; image_url: string };
type InputContent = InputContentText | InputContentImage;

type InputMessage = {
  role: "user";
  content: InputContent[];
};

type OutputContentItem =
  | { type: "output_text"; text: string }
  | { type: "refusal"; refusal: string };

type OutputItem = {
  id?: string;
  type: "message";
  role?: "assistant";
  status?: string;
  content: OutputContentItem[];
};

type JsonSchemaFormat = {
  type: "json_schema";
  name: string;
  schema: Record<string, unknown>;
  strict: boolean;
};

type ResponsesApiBody = {
  model: string;
  instructions: string;
  input: InputMessage[];
  text: { format: JsonSchemaFormat };
};

type ResponsesApiResponse = {
  id?: string;
  object?: string;
  status?: "completed" | "failed" | "in_progress" | "incomplete";
  output?: OutputItem[];
  output_text?: string | null;
  error?: { code?: string; message?: string };
};

/* ─── JSON Schema for Structured Outputs ────────────────────────────────────── */
// Written in full (no $ref) for maximum compatibility with OpenAI strict mode.
// Must stay in sync with scanAiResponseSchema (Zod) in types/index.ts.

const QUALITY_ITEM_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: ["ok", "ajustar"] },
    score: { type: "number" },
    observacao: { type: "string" },
  },
  required: ["status", "score", "observacao"],
} as const;

const NULLABLE_NUMBER = { anyOf: [{ type: "number" }, { type: "null" }] } as const;

const REFERENCE_RANGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    min: NULLABLE_NUMBER,
    max: NULLABLE_NUMBER,
    label: { type: "string" },
  },
  required: ["min", "max", "label"],
} as const;

const SCAN_ANALYSIS_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["analysis"],
  properties: {
    analysis: {
      type: "object",
      additionalProperties: false,
      required: [
        "inputs",
        "quality",
        "estimates",
        "measurementsCm",
        "referenceRanges",
        "observations",
        "confidence",
      ],
      properties: {
        inputs: {
          type: "object",
          additionalProperties: false,
          required: ["sexo", "idadeAnos", "alturaCm", "pesoKg"],
          properties: {
            sexo: { type: "string" },
            idadeAnos: { type: "number" },
            alturaCm: { type: "number" },
            pesoKg: { type: "number" },
          },
        },
        quality: {
          type: "object",
          additionalProperties: false,
          required: ["enquadramento", "iluminacao", "fundo", "postura", "vestimenta", "needsRetake"],
          properties: {
            enquadramento: QUALITY_ITEM_SCHEMA,
            iluminacao: QUALITY_ITEM_SCHEMA,
            fundo: QUALITY_ITEM_SCHEMA,
            postura: QUALITY_ITEM_SCHEMA,
            vestimenta: QUALITY_ITEM_SCHEMA,
            needsRetake: { type: "boolean" },
          },
        },
        estimates: {
          type: "object",
          additionalProperties: false,
          required: [
            "gorduraPercent", "massaMagraKg", "massaGordaKg",
            "imc", "whr", "tmb",
            "faixaGordura", "faixaImc", "faixaWhr",
          ],
          properties: {
            gorduraPercent: { type: "number" },
            massaMagraKg: { type: "number" },
            massaGordaKg: { type: "number" },
            imc: { type: "number" },
            whr: { type: "number" },
            tmb: { type: "number" },
            faixaGordura: { type: "string" },
            faixaImc: { type: "string" },
            faixaWhr: { type: "string" },
          },
        },
        measurementsCm: {
          type: "object",
          additionalProperties: false,
          required: ["braco", "antebraco", "coxa", "panturrilha", "quadril", "cintura", "toracicoPeito", "ombros"],
          properties: {
            braco: { type: "number" },
            antebraco: { type: "number" },
            coxa: { type: "number" },
            panturrilha: { type: "number" },
            quadril: { type: "number" },
            cintura: { type: "number" },
            toracicoPeito: { type: "number" },
            ombros: { type: "number" },
          },
        },
        referenceRanges: {
          type: "object",
          additionalProperties: false,
          required: ["gordura", "imc", "whr"],
          properties: {
            gordura: REFERENCE_RANGE_SCHEMA,
            imc: REFERENCE_RANGE_SCHEMA,
            whr: REFERENCE_RANGE_SCHEMA,
          },
        },
        observations: {
          type: "array",
          items: { type: "string" },
        },
        confidence: { type: "number" },
      },
    },
  },
};

/* ─── System prompt builder ─────────────────────────────────────────────────── */

function buildSystemPrompt(): string {
  return `\
You are a body composition estimation engine for the Move fitness app.

CONTEXT: You receive two photos (front and side view) of a person in fitted workout clothing, plus their anthropometric data. You estimate body composition from visible body proportions and posture markers. This is a fitness tracking tool — NOT a medical service.

STRICT CONSTRAINTS:
• Return valid JSON only — matching the provided schema exactly
• NEVER infer or mention: ethnicity, race, pregnancy, medical conditions, diseases, or any sensitive personal attribute
• NEVER provide medical diagnoses, clinical assessments, or health prescriptions
• All string values and observation text must be in pt-BR (Brazilian Portuguese)
• Remind in observations that results are estimates for fitness tracking, not medical diagnostics

REQUIRED FORMULAS (use exactly these):
• IMC = pesoKg / (alturaCm / 100)²
• WHR = cinturaCm / quadrilCm
• TMB = 370 + (21.6 × massaMagraKg)

BODY FAT % REFERENCE RANGES — use these exact faixaGordura labels:
Masculino — Essencial: 2–5% | Atleta: 6–13% | Saudável: 14–17% | Aceitável: 18–24% | Elevado: ≥25%
Feminino  — Essencial: 10–13% | Atleta: 14–20% | Saudável: 21–24% | Aceitável: 25–31% | Elevado: ≥32%

IMC RANGES — use these exact faixaImc labels:
"Abaixo do peso" <18.5 | "Normal" 18.5–24.9 | "Sobrepeso" 25–29.9 | "Obesidade" ≥30

WHR RANGES — use these exact faixaWhr labels:
Masculino: "Normal" ≤0.90 | "Risco" >0.90
Feminino:  "Normal" ≤0.85 | "Risco" >0.85

QUALITY ASSESSMENT — for each of the 5 dimensions, provide:
• status: "ok" if acceptable for estimation, "ajustar" if problematic
• score: 0.0 (critical problem) – 1.0 (perfect)
• observacao: brief note in pt-BR explaining the score
Dimensions:
  enquadramento — "ok": full body visible | "ajustar": limbs/head cut off
  iluminacao    — "ok": uniform, no strong shadows | "ajustar": dark, backlit, or heavy shadows hiding shape
  fundo         — "ok": plain/neutral background | "ajustar": cluttered, distracting
  postura       — "ok": upright, shoulders level | "ajustar": significantly tilted, twisted, or slouched
  vestimenta    — "ok": fitted athletic wear | "ajustar": baggy/loose clothes hiding body contours
Set needsRetake:true if ANY dimension score < 0.5 (making reliable estimation impossible).

CONFIDENCE SCORE (0.0–1.0 for overall analysis):
≥0.9: excellent | 0.7–0.9: good | 0.5–0.7: acceptable | <0.5: poor (needsRetake typically true)`;
}

/* ─── User content builder ───────────────────────────────────────────────────── */

function buildUserContent(input: ScanAnalysisInput): InputContent[] {
  const lines: string[] = [
    "Analise a composição corporal com base nas duas fotos abaixo.",
    "",
    `Dados da pessoa: sexo=${input.sexo}, idade=${input.idadeAnos} anos, altura=${input.alturaCm} cm, peso=${input.pesoKg} kg`,
  ];

  if (input.observacoes) {
    lines.push(`Observações adicionais: ${input.observacoes}`);
  }

  lines.push("", "Foto 1: vista frontal | Foto 2: vista lateral (perfil direito).");

  return [
    { type: "input_text", text: lines.join("\n") },
    { type: "input_image", image_url: input.frontImageUrl },
    { type: "input_image", image_url: input.sideImageUrl },
  ];
}

/* ─── Client ─────────────────────────────────────────────────────────────────── */

export class OpenAiScanClient {
  private readonly apiKey: string;
  private readonly model: string;
  private static readonly ENDPOINT = "https://api.openai.com/v1/responses";
  private static readonly TIMEOUT_MS = 55_000;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async analyze(input: ScanAnalysisInput): Promise<ScanAnalysisResponse> {
    const requestBody: ResponsesApiBody = {
      model: this.model,
      instructions: buildSystemPrompt(),
      input: [
        {
          role: "user",
          content: buildUserContent(input),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "scan_analysis",
          schema: SCAN_ANALYSIS_JSON_SCHEMA,
          strict: true,
        },
      },
    };

    let rawResponse: Response;

    try {
      rawResponse = await fetch(OpenAiScanClient.ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(OpenAiScanClient.TIMEOUT_MS),
      });
    } catch (error: unknown) {
      const isTimeout =
        error instanceof Error
        && (error.name === "TimeoutError" || error.name === "AbortError");

      throw new ApiError(
        502,
        "scan_ai_failed",
        isTimeout
          ? "Tempo limite da análise excedido. Tente novamente."
          : "Não foi possível conectar ao serviço de análise.",
      );
    }

    if (!rawResponse.ok) {
      const errorBody = await rawResponse.json().catch(() => null) as Record<string, unknown> | null;
      const innerError = errorBody?.["error"];
      const errorCode =
        typeof innerError === "object" && innerError !== null
          ? (innerError as Record<string, unknown>)["code"]
          : undefined;
      const errorType =
        typeof innerError === "object" && innerError !== null
          ? (innerError as Record<string, unknown>)["type"]
          : undefined;

      if (rawResponse.status === 401 || errorCode === "invalid_api_key") {
        throw new ApiError(500, "openai_api_key_missing", "Chave da API OpenAI inválida ou ausente.");
      }

      // Quota/billing exhausted on our side — surface as a transient service issue
      // (503) without leaking the raw OpenAI message to the end user.
      if (errorCode === "insufficient_quota" || errorType === "insufficient_quota") {
        throw new ApiError(
          503,
          "scan_ai_quota_exceeded",
          "O serviço de análise está temporariamente indisponível.",
        );
      }

      throw new ApiError(502, "scan_ai_failed", "O serviço de análise retornou um erro.");
    }

    const responseData = await rawResponse.json() as ResponsesApiResponse;

    // Handle API-level failure status
    if (responseData.status === "failed") {
      throw new ApiError(502, "scan_ai_failed", "A análise falhou no serviço de IA.");
    }

    // Find the first message output item
    const messageOutput = responseData.output?.find((item) => item.type === "message");

    if (messageOutput) {
      // Check for safety refusal
      const refusal = messageOutput.content.find((item) => item.type === "refusal");

      if (refusal) {
        throw new ApiError(
          422,
          "scan_image_rejected",
          "As imagens não foram aceitas pelo serviço de análise. Verifique enquadramento, iluminação e vestimenta.",
        );
      }
    }

    // Extract text: prefer message content, fall back to output_text convenience field
    const textContent = messageOutput?.content.find((item) => item.type === "output_text");
    const rawText =
      (textContent as { type: "output_text"; text: string } | undefined)?.text
      ?? responseData.output_text
      ?? null;

    if (!rawText) {
      throw new ApiError(502, "scan_ai_failed", "O serviço de análise não retornou conteúdo.");
    }

    // Parse JSON (should already be valid from Structured Outputs, but defensive)
    let parsed: unknown;

    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new ApiError(502, "scan_ai_invalid_response", "O serviço de análise retornou um formato inválido.");
    }

    // Second-layer validation with Zod
    const validated = scanAiResponseSchema.safeParse(parsed);

    if (!validated.success) {
      throw new ApiError(
        502,
        "scan_ai_invalid_response",
        "A resposta da análise não corresponde ao formato esperado.",
      );
    }

    return validated.data;
  }
}
