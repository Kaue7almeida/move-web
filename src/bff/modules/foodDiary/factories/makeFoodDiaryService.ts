import { createSupabaseAdminClient } from "@/bff/core/supabase/server";
import { FoodDiaryRepository } from "@/bff/modules/foodDiary/infra/FoodDiaryRepository";
import { FoodDiaryService } from "@/bff/modules/foodDiary/services/FoodDiaryService";

export function makeFoodDiaryService(): FoodDiaryService {
  const supabase = createSupabaseAdminClient();
  const foodDiaryRepository = new FoodDiaryRepository(supabase);

  return new FoodDiaryService(foodDiaryRepository);
}
