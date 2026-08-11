import { ApiError } from "@/bff/core/errors/ApiError";
import { OpenAiFoodDiaryClient } from "@/bff/modules/foodDiary/infra/OpenAiFoodDiaryClient";

// Vision-capable and economical — the Food Diary is used many times a day, so it
// defaults to a cheaper model than the Scan (see docs/diario-alimentar/08 §15).
// Reuses the project-wide OPENAI_API_KEY; the model is overridable per env.
const DEFAULT_FOOD_DIARY_MODEL = "gpt-4o-mini";

export function makeOpenAiFoodDiaryClient(): OpenAiFoodDiaryClient {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new ApiError(
      500,
      "openai_api_key_missing",
      "Chave da API OpenAI não configurada no servidor.",
    );
  }

  const model = process.env.OPENAI_FOOD_DIARY_MODEL || DEFAULT_FOOD_DIARY_MODEL;

  return new OpenAiFoodDiaryClient(apiKey, model);
}
