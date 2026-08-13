import { ApiError } from "@/bff/core/errors/ApiError";
import {
  foodDiaryAiResponseSchema,
  type FoodDiaryAiInput,
  type FoodDiaryAiResponse,
  type FoodDiaryTextInput,
} from "@/bff/modules/foodDiary/types/ai";

/* ─── OpenAI Responses API internal types ────────────────────────────────────── */

type InputContentText = { type: "input_text"; text: string };
type InputContentImage = { type: "input_image"; image_url: string };
type InputContent = InputContentText | InputContentImage;

type InputMessage = { role: "user"; content: InputContent[] };

type OutputContentItem =
  | { type: "output_text"; text: string }
  | { type: "refusal"; refusal: string };

type OutputItem = {
  type: "message";
  role?: "assistant";
  content: OutputContentItem[];
};

type ResponsesApiBody = {
  model: string;
  instructions: string;
  input: InputMessage[];
  // One-shot analysis: do not let OpenAI persist Responses API application state for
  // this call. The meal photo is user data and there is no conversational state.
  store: false;
  text: {
    format: { type: "json_schema"; name: string; schema: Record<string, unknown>; strict: boolean };
  };
};

type ResponsesApiResponse = {
  status?: "completed" | "failed" | "in_progress" | "incomplete";
  output?: OutputItem[];
  output_text?: string | null;
};

/* ─── JSON Schema for Structured Outputs (kept in sync with foodDiaryAiResponseSchema) ─── */

const NULLABLE_STRING = { anyOf: [{ type: "string" }, { type: "null" }] } as const;
const NULLABLE_NUMBER = { anyOf: [{ type: "number" }, { type: "null" }] } as const;

const AI_ALTERNATIVE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name", "kcalPer100g", "proteinPer100g", "carbPer100g", "fatPer100g", "fiberPer100g"],
  properties: {
    name: { type: "string" },
    kcalPer100g: { type: "number" },
    proteinPer100g: { type: "number" },
    carbPer100g: { type: "number" },
    fatPer100g: { type: "number" },
    fiberPer100g: NULLABLE_NUMBER,
  },
} as const;

const AI_ITEM_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "name",
    "preparation",
    "category",
    "identification",
    "alternatives",
    "gramsEstimated",
    "householdMeasure",
    "confidence",
    "isPartiallyHidden",
    "kcalPer100g",
    "proteinPer100g",
    "carbPer100g",
    "fatPer100g",
    "fiberPer100g",
    "uncertainty",
  ],
  properties: {
    name: { type: "string" },
    preparation: NULLABLE_STRING,
    category: { type: "string" },
    identification: { type: "string", enum: ["identified", "ambiguous", "unknown"] },
    alternatives: { type: "array", items: AI_ALTERNATIVE_SCHEMA },
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
} as const;

const FOOD_DIARY_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["analysis"],
  properties: {
    analysis: {
      type: "object",
      additionalProperties: false,
      required: [
        "qualityOverall",
        "needsRetake",
        "needsClarification",
        "clarificationQuestion",
        "confidence",
        "items",
        "observations",
      ],
      properties: {
        qualityOverall: { type: "string", enum: ["boa", "media", "ruim"] },
        needsRetake: { type: "boolean" },
        needsClarification: { type: "boolean" },
        clarificationQuestion: NULLABLE_STRING,
        confidence: { type: "number" },
        items: { type: "array", items: AI_ITEM_SCHEMA },
        observations: { type: "array", items: { type: "string" } },
      },
    },
  },
};

/* ─── Prompt builders ────────────────────────────────────────────────────────── */

const MEAL_TYPE_LABELS: Record<string, string> = {
  cafe_da_manha: "café da manhã",
  almoco: "almoço",
  lanche: "lanche",
  jantar: "jantar",
  extra: "refeição extra",
};

const CONTAINER_SIZE_LABELS: Record<string, string> = {
  pequeno: "prato/recipiente pequeno",
  medio: "prato/recipiente médio",
  grande: "prato/recipiente grande",
};

function buildSystemPrompt(): string {
  return `\
You are a meal photo analysis engine for the Move fitness app.

CONTEXT: You receive ONE top-down photo of a meal plus optional textual context. You identify the foods, estimate each food's portion in grams, and estimate its per-100g nutrients. This is a fitness estimate — NOT a medical or clinical service, and NOT a promise of precision.

SCALE / PORTION METHOD:
• Use any reference object in the scene (cutlery is the most common) to calibrate scale.
• Use the informed container size (small/medium/large plate or bowl) as a diameter anchor.
• Reason about the visible area and apparent volume of each food to estimate grams.
• If the portion is shared (informed), estimate the WHOLE plate — the review step splits it.

STRICT CONSTRAINTS:
• Return valid JSON only, matching the provided schema exactly. No prose outside the structure.
• Do NOT reveal your reasoning/chain-of-thought — only the final structured result.
• All human-readable strings (name, preparation, category, householdMeasure, uncertainty, observations) must be in pt-BR.
• NEVER infer medical conditions or give clinical/prescriptive advice.

PER ITEM:
• name: food name in pt-BR. Preparation is PER ITEM, never for the whole plate (a plate can mix grilled meat, fried potato and boiled rice).
• preparation: this item's cooking method e.g. "grelhado","frito","cozido","assado","refogado","cru" or null.
• category: e.g. "carboidrato","proteina","vegetal","fruta","gordura","bebida","molho","outro".
• identification: "identified" | "ambiguous" | "unknown". Use "ambiguous" when the photo does NOT let you tell which food it is AND the candidates differ in calories/macros (classic case: grilled meat that could be chicken, pork or beef). Use "unknown" when you truly cannot tell what it is. NEVER fake a specific identity you cannot see.
• alternatives: when ambiguous, the plausible identities in pt-BR, EACH WITH ITS OWN per-100g nutrients (name, kcalPer100g, proteinPer100g, carbPer100g, fatPer100g, fiberPer100g) so the user can pick a COMPLETE candidate without another AI call. Pick the most likely as the item's own name/nutrients. Empty array when not ambiguous.
• gramsEstimated: estimated edible grams (> 0).
• householdMeasure: e.g. "1 concha média","2 colheres de sopa" or null.
• confidence: 0.0–1.0, your SELF-REPORTED certainty for this item — this is NOT a validated accuracy figure.
• isPartiallyHidden: true if the item is largely covered by another on the plate.
• kcalPer100g/proteinPer100g/carbPer100g/fatPer100g: per 100 g, non-negative. fiberPer100g: per 100 g or null.
• uncertainty: short pt-BR note when relevant (e.g. "molho pode conter óleo não visível") or null.

QUALITY:
• qualityOverall: "boa" | "media" | "ruim" (overall photo usability for estimation).
• needsRetake: true ONLY when the photo is technically inadequate (no meal visible, too dark/blurry, unusable framing). Low confidence alone is NOT a reason to retake.
• needsClarification: false and clarificationQuestion: null — the photo path resolves doubt via needsRetake / ambiguity alternatives, never a text question.
• confidence: 0.0–1.0 for the overall analysis.

observations: array of short pt-BR notes (blind spots, hidden ingredients, assumptions). Keep it brief; never medical.`;
}

function buildUserContent(input: FoodDiaryAiInput): InputContent[] {
  const lines: string[] = [
    "Analise esta refeição a partir da foto (vista de cima) e do contexto informado.",
    "",
    `Tipo de refeição: ${MEAL_TYPE_LABELS[input.mealType] ?? input.mealType}`,
  ];

  if (input.containerSize) {
    lines.push(`Recipiente: ${CONTAINER_SIZE_LABELS[input.containerSize] ?? input.containerSize}`);
  }
  if (input.mealOrigin) {
    lines.push(`Origem: ${input.mealOrigin}`);
  }
  if (input.preparationHint) {
    lines.push(`Preparo informado: ${input.preparationHint}`);
  }
  if (input.hiddenIngredients.length > 0) {
    lines.push(`Ingredientes possivelmente ocultos: ${input.hiddenIngredients.join(", ")}`);
  }
  if (input.isSharedPortion) {
    lines.push("O aluno indicou que vai dividir esta porção — estime o prato inteiro mesmo assim.");
  }
  if (input.userNotes) {
    lines.push(`Observações do aluno: ${input.userNotes}`);
  }

  return [
    { type: "input_text", text: lines.join("\n") },
    { type: "input_image", image_url: input.imageUrl },
  ];
}

function buildTextSystemPrompt(): string {
  return `\
You are a meal analysis engine for the Move fitness app.

CONTEXT: You receive a TEXT description of what someone ate (NO photo). Identify the foods, estimate each food's portion in grams, and estimate its per-100g nutrients. This is a fitness estimate — NOT a medical service, and NOT a promise of precision.

METHOD:
• Parse quantities from the text ("2 pães de queijo", "um prato de", "uma barra pequena").
• If the user states an approximate total kcal, treat it as a hint, not ground truth — still return per-item macros.

CLARIFICATION (do NOT guess in silence):
• A description can be too vague to estimate honestly — a bare food word with no portion and no defining detail (e.g. "bolo", "carne", "salgado", "um doce"). Wildly different calories fit the same word (a thin slice vs. a big piece; lean vs. fatty cut).
• In that case set needsClarification=true and put ONE short, specific pt-BR question in clarificationQuestion (e.g. "Qual era aproximadamente o tamanho da fatia?" or "Era um salgado assado ou frito, e de que tamanho?"). Ask for the SINGLE most decisive missing detail — never a questionnaire.
• When needsClarification=true, still fill items with your best provisional guess (the UI re-analyzes after the answer). Otherwise set needsClarification=false and clarificationQuestion=null.
• A description that gives a portion, a count, or a defining detail is NOT vague — do not ask when you can reasonably estimate.

STRICT CONSTRAINTS:
• Return valid JSON only, matching the provided schema exactly. No prose outside the structure.
• Do NOT reveal your reasoning/chain-of-thought — only the final structured result.
• All human-readable strings must be in pt-BR.
• NEVER infer medical conditions or give clinical/prescriptive advice.

PER ITEM:
• name (pt-BR). preparation POR ITEM (e.g. "frito","assado","cru") or null.
• category: "carboidrato","proteina","vegetal","fruta","gordura","bebida","molho","outro".
• identification: "identified" | "ambiguous" | "unknown". Use "ambiguous" only when the text truly does not disambiguate a food whose calories differ a lot (e.g. "carne" that could be frango/porco/bovino). NEVER fake certainty.
• alternatives: when ambiguous, the plausible identities in pt-BR, EACH WITH ITS OWN per-100g nutrients (name, kcalPer100g, proteinPer100g, carbPer100g, fatPer100g, fiberPer100g) so the user can pick a COMPLETE candidate without another AI call. Pick the most likely as the item's own name/nutrients. Empty array when not ambiguous.
• gramsEstimated (> 0). householdMeasure (pt-BR) or null.
• confidence: 0.0–1.0 self-reported certainty (NOT accuracy). isPartiallyHidden: false for text.
• kcalPer100g/proteinPer100g/carbPer100g/fatPer100g per 100 g (non-negative). fiberPer100g per 100 g or null.
• uncertainty: short pt-BR note or null.

QUALITY:
• qualityOverall: "boa" | "media" | "ruim" (how usable the DESCRIPTION is).
• needsRetake: false (there is no photo to retake) unless the description is empty/nonsensical.
• confidence: 0.0–1.0 overall.

observations: short pt-BR notes (assumptions about quantity, hidden fats/oils). Never medical.`;
}

function buildTextContent(input: FoodDiaryTextInput): InputContent[] {
  const lines: string[] = [
    input.isSnack
      ? "Analise este docinho/petisco a partir da descrição do usuário."
      : "Analise esta refeição a partir da descrição do usuário.",
    "",
    `Tipo de refeição: ${MEAL_TYPE_LABELS[input.mealType] ?? input.mealType}`,
    `Descrição: ${input.description}`,
  ];

  if (input.containerSize) {
    lines.push(`Tamanho/porção: ${CONTAINER_SIZE_LABELS[input.containerSize] ?? input.containerSize}`);
  }
  if (input.userNotes) {
    lines.push(`Observações do usuário: ${input.userNotes}`);
  }

  return [{ type: "input_text", text: lines.join("\n") }];
}

/* ─── Client ─────────────────────────────────────────────────────────────────── */

export class OpenAiFoodDiaryClient {
  private static readonly ENDPOINT = "https://api.openai.com/v1/responses";
  private static readonly TIMEOUT_MS = 55_000;

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  get modelName(): string {
    return this.model;
  }

  /** Photo meal analysis (image + context). */
  async analyze(input: FoodDiaryAiInput): Promise<FoodDiaryAiResponse> {
    return this.send(buildSystemPrompt(), buildUserContent(input), {
      code: "food_diary_image_rejected",
      message: "A imagem não foi aceita pelo serviço de análise. Verifique o enquadramento e a iluminação.",
    });
  }

  /** Text meal / snack analysis (no photo) — same structured output contract. */
  async analyzeText(input: FoodDiaryTextInput): Promise<FoodDiaryAiResponse> {
    return this.send(buildTextSystemPrompt(), buildTextContent(input), {
      code: "food_diary_text_rejected",
      message: "Não consegui interpretar a descrição. Tente detalhar melhor o que você comeu.",
    });
  }

  private async send(
    instructions: string,
    content: InputContent[],
    refusal: { code: string; message: string },
  ): Promise<FoodDiaryAiResponse> {
    const requestBody: ResponsesApiBody = {
      model: this.model,
      instructions,
      input: [{ role: "user", content }],
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: "food_diary_analysis",
          schema: FOOD_DIARY_JSON_SCHEMA,
          strict: true,
        },
      },
    };

    let rawResponse: Response;

    try {
      rawResponse = await fetch(OpenAiFoodDiaryClient.ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(OpenAiFoodDiaryClient.TIMEOUT_MS),
      });
    } catch (error: unknown) {
      const isTimeout =
        error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");

      throw new ApiError(
        502,
        "food_diary_ai_failed",
        isTimeout
          ? "Tempo limite da análise excedido. Tente novamente."
          : "Não foi possível conectar ao serviço de análise.",
      );
    }

    if (!rawResponse.ok) {
      const errorBody = (await rawResponse.json().catch(() => null)) as Record<string, unknown> | null;
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

      if (errorCode === "insufficient_quota" || errorType === "insufficient_quota") {
        throw new ApiError(
          503,
          "food_diary_ai_quota_exceeded",
          "O serviço de análise está temporariamente indisponível.",
        );
      }

      throw new ApiError(502, "food_diary_ai_failed", "O serviço de análise retornou um erro.");
    }

    const responseData = (await rawResponse.json()) as ResponsesApiResponse;

    if (responseData.status === "failed") {
      throw new ApiError(502, "food_diary_ai_failed", "A análise falhou no serviço de IA.");
    }

    const messageOutput = responseData.output?.find((item) => item.type === "message");

    if (messageOutput) {
      const refusalItem = messageOutput.content.find((item) => item.type === "refusal");

      if (refusalItem) {
        // Modality-specific refusal (image vs text), supplied by the caller.
        throw new ApiError(422, refusal.code, refusal.message);
      }
    }

    const textContent = messageOutput?.content.find((item) => item.type === "output_text");
    const rawText =
      (textContent as { type: "output_text"; text: string } | undefined)?.text
      ?? responseData.output_text
      ?? null;

    if (!rawText) {
      throw new ApiError(502, "food_diary_ai_failed", "O serviço de análise não retornou conteúdo.");
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new ApiError(
        502,
        "food_diary_ai_invalid_response",
        "O serviço de análise retornou um formato inválido.",
      );
    }

    const validated = foodDiaryAiResponseSchema.safeParse(parsed);

    if (!validated.success) {
      throw new ApiError(
        502,
        "food_diary_ai_invalid_response",
        "A resposta da análise não corresponde ao formato esperado.",
      );
    }

    return validated.data;
  }
}
