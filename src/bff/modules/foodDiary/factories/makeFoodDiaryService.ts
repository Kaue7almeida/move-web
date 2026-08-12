import { createSupabaseAdminClient } from "@/bff/core/supabase/server";
import { FoodDiaryRepository } from "@/bff/modules/foodDiary/infra/FoodDiaryRepository";
import { makeOpenAiFoodDiaryClient } from "@/bff/modules/foodDiary/factories/makeOpenAiFoodDiaryClient";
import { FoodDiaryService } from "@/bff/modules/foodDiary/services/FoodDiaryService";

// Product rule (P1): max concluded analyses per student per local day. Configurable
// in the BFF via env — never a fixed DB constraint. Falls back to 6.
const DEFAULT_DAILY_ANALYSIS_LIMIT = 6;

function readDailyAnalysisLimit(): number {
  const raw = process.env.FOOD_DIARY_DAILY_ANALYSIS_LIMIT;

  if (!raw) {
    return DEFAULT_DAILY_ANALYSIS_LIMIT;
  }

  const parsed = Number(raw);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_DAILY_ANALYSIS_LIMIT;
}

export function makeFoodDiaryService(): FoodDiaryService {
  const supabase = createSupabaseAdminClient();
  const foodDiaryRepository = new FoodDiaryRepository(supabase);

  return new FoodDiaryService(foodDiaryRepository, {
    // Lazy: OPENAI_API_KEY is only required when an endpoint actually calls the AI,
    // so non-AI endpoints (today, history, target…) stay usable without it.
    aiClientFactory: makeOpenAiFoodDiaryClient,
    dailyAnalysisLimit: readDailyAnalysisLimit(),
  });
}
