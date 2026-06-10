import { ApiError } from "@/bff/core/errors/ApiError";

export type OpenAiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OpenAiChatCompletionInput = {
  messages: OpenAiChatMessage[];
};

type ChatCompletionsRequestBody = {
  model: string;
  messages: OpenAiChatMessage[];
  temperature: number;
  max_tokens: number;
};

const OPENAI_CHAT_COMPLETIONS_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const DEFAULT_CHAT_MODEL = "gpt-4o-mini";
const CHAT_TEMPERATURE = 0.5;
const CHAT_MAX_TOKENS = 800;
const CHAT_TIMEOUT_MS = 30_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readOpenAiErrorCode(errorBody: unknown): string | null {
  if (!isRecord(errorBody)) {
    return null;
  }

  const error = errorBody["error"];

  if (!isRecord(error)) {
    return null;
  }

  const code = error["code"];
  const type = error["type"];

  if (typeof code === "string" && code.trim()) {
    return code;
  }

  if (typeof type === "string" && type.trim()) {
    return type;
  }

  return null;
}

function readAssistantContent(responseBody: unknown): string | null {
  if (!isRecord(responseBody)) {
    return null;
  }

  const choices = responseBody["choices"];

  if (!Array.isArray(choices)) {
    return null;
  }

  for (const choice of choices) {
    if (!isRecord(choice)) {
      continue;
    }

    const message = choice["message"];

    if (!isRecord(message)) {
      continue;
    }

    const content = message["content"];

    if (typeof content === "string" && content.trim()) {
      return content.trim();
    }
  }

  return null;
}

export class OpenAiChatClient {
  private readonly apiKey: string | null;
  private readonly model: string;

  constructor(apiKey?: string, model: string = DEFAULT_CHAT_MODEL) {
    const normalizedApiKey = apiKey?.trim();
    const normalizedModel = model.trim();

    this.apiKey = normalizedApiKey ? normalizedApiKey : null;
    this.model = normalizedModel || DEFAULT_CHAT_MODEL;
  }

  async complete(input: OpenAiChatCompletionInput): Promise<string> {
    if (!this.apiKey) {
      throw new ApiError(
        500,
        "openai_api_key_missing",
        "Chave da API OpenAI ausente.",
      );
    }

    const requestBody: ChatCompletionsRequestBody = {
      model: this.model,
      messages: input.messages,
      temperature: CHAT_TEMPERATURE,
      max_tokens: CHAT_MAX_TOKENS,
    };

    let rawResponse: Response;

    try {
      rawResponse = await fetch(OPENAI_CHAT_COMPLETIONS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
      });
    } catch (error: unknown) {
      const isTimeout =
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError");

      throw new ApiError(
        502,
        "chat_ai_failed",
        isTimeout
          ? "Tempo limite da IA excedido. Tente novamente."
          : "Não foi possível conectar ao serviço de IA.",
      );
    }

    const responseBody: unknown = await rawResponse.json().catch(() => null);

    if (!rawResponse.ok) {
      const errorCode = readOpenAiErrorCode(responseBody);

      if (errorCode === "insufficient_quota") {
        throw new ApiError(
          503,
          "chat_ai_quota_exceeded",
          "O serviço de IA está temporariamente indisponível.",
        );
      }

      throw new ApiError(502, "chat_ai_failed", "O serviço de IA retornou um erro.");
    }

    const content = readAssistantContent(responseBody);

    if (!content) {
      throw new ApiError(
        502,
        "chat_ai_invalid_response",
        "O serviço de IA não retornou uma resposta válida.",
      );
    }

    return content;
  }
}
