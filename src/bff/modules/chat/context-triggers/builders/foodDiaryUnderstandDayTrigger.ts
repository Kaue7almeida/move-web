import { ApiError } from "@/bff/core/errors/ApiError";
import { isFoodDiaryEnabledForUser } from "@/bff/core/auth/foodDiaryBetaAccess";
import { resolveTimeZone } from "@/bff/modules/foodDiary/diaryDay";
import {
  buildFoodDiaryContextBlock,
  buildFoodDiaryUnderstandPrompt,
} from "@/bff/modules/foodDiary/foodDiaryChatContext";
import type { FoodDiaryService } from "@/bff/modules/foodDiary/services/FoodDiaryService";

import type {
  ChatContextTriggerBuilder,
  ChatContextTriggerInput,
  ChatContextTriggerResult,
} from "../types";

/**
 * "Conversar com a IA sobre meu dia" — resolve o contexto real do Diário (HOJE +
 * últimos 7 dias) do USUÁRIO AUTENTICADO e monta o conteúdo enriquecido (oculto).
 *
 * Segurança:
 *  • Access gate SERVER-SIDE: mesma regra do ensureFoodDiaryAccess
 *    (isFoodDiaryEnabledForUser) — o endpoint genérico do Chat NÃO vira bypass do
 *    acesso do Diário.
 *  • Ownership sempre pelo userId/email autenticados (nunca do body). O front manda
 *    apenas o fuso (entityId) como locator; o BFF resolve os dados reais.
 */
export class FoodDiaryUnderstandDayTrigger implements ChatContextTriggerBuilder {
  readonly id = "food_diary_understand_day";

  constructor(private readonly foodDiaryService: FoodDiaryService) {}

  async build(input: ChatContextTriggerInput): Promise<ChatContextTriggerResult> {
    if (!isFoodDiaryEnabledForUser(input.email)) {
      throw new ApiError(
        403,
        "food_diary_access_required",
        "O Diário Alimentar ainda não está disponível no seu acesso.",
      );
    }

    // entityId carrega apenas o fuso do cliente (locator do dia local). Ownership
    // é do usuário autenticado — o serviço lê só os dados dele.
    const timeZone = resolveTimeZone(input.entityId);
    const identity = { userId: input.userId, email: input.email ?? "" };

    const [today, history] = await Promise.all([
      this.foodDiaryService.getToday(identity, { timeZone }),
      this.foodDiaryService.getHistory(identity, { timeZone }),
    ]);

    return {
      visibleMessage: input.visibleMessage,
      aiUserContent: buildFoodDiaryUnderstandPrompt(today, history, input.visibleMessage),
      persistentContext: buildFoodDiaryContextBlock(today, history),
      contextLabel: "Diário de hoje",
    };
  }
}
