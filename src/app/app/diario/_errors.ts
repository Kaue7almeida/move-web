import { FoodDiaryApiError } from "@/services/foodDiary/foodDiaryService";

/**
 * Traduz erros do Diário (código estável do backend) em mensagens de UX. Nunca
 * expõe código bruto, stack, provedor, chave de API nem URL assinada. Fora dos
 * códigos conhecidos, cai numa mensagem genérica e segura.
 *
 *  - `retake`   → a foto precisa ser refeita (voltar para a captura).
 *  - `retryable`→ vale tentar de novo o mesmo passo (falha transitória).
 */
export type FoodDiaryErrorInfo = {
  title: string;
  message: string;
  retake: boolean;
  retryable: boolean;
};

const GENERIC: FoodDiaryErrorInfo = {
  title: "Algo deu errado",
  message: "Não foi possível concluir agora. Tente novamente em instantes.",
  retake: false,
  retryable: true,
};

const BY_CODE: Record<string, FoodDiaryErrorInfo> = {
  /* Cota diária */
  food_diary_daily_limit_reached: {
    title: "Limite de hoje atingido",
    message: "Você já registrou o máximo de análises por foto de hoje. O limite volta amanhã.",
    retake: false,
    retryable: false,
  },

  /* Foto rejeitada / sem alimentos reconhecidos → refazer a foto */
  food_diary_image_rejected: {
    title: "Não consegui usar essa foto",
    message: "Verifique o enquadramento e a iluminação e tente outra foto do prato inteiro, de cima.",
    retake: true,
    retryable: false,
  },
  food_diary_analysis_empty: {
    title: "Nenhum alimento identificado",
    message: "Não reconheci alimentos nessa foto. Tente novamente com o prato bem visível e boa luz.",
    retake: true,
    retryable: false,
  },
  food_diary_analysis_invalid: {
    title: "Não consegui estimar a refeição",
    message: "A estimativa saiu inconsistente. Tente outra foto, mais nítida e de cima.",
    retake: true,
    retryable: false,
  },

  /* Falhas transitórias do serviço de IA → tentar de novo */
  food_diary_ai_failed: {
    title: "Análise indisponível",
    message: "Não foi possível analisar agora. Tente novamente em instantes.",
    retake: false,
    retryable: true,
  },
  food_diary_ai_invalid_response: {
    title: "Análise indisponível",
    message: "A análise não retornou um resultado válido. Tente novamente.",
    retake: false,
    retryable: true,
  },
  food_diary_ai_quota_exceeded: {
    title: "Serviço sobrecarregado",
    message: "O serviço de análise está temporariamente indisponível. Tente novamente mais tarde.",
    retake: false,
    retryable: true,
  },

  /* Texto/descrição não interpretável */
  food_diary_text_rejected: {
    title: "Não entendi a descrição",
    message: "Tente detalhar melhor o que você comeu (itens e quantidades).",
    retake: false,
    retryable: true,
  },
  food_diary_text_required: {
    title: "Descrição necessária",
    message: "Descreva o que você comeu para continuar.",
    retake: false,
    retryable: false,
  },

  /* Foto inválida no upload */
  food_diary_photo_too_large: {
    title: "Foto muito grande",
    message: "A imagem ultrapassa 15 MB. Use uma foto menor ou reduza a qualidade da câmera.",
    retake: true,
    retryable: false,
  },
  food_diary_photo_invalid_type: {
    title: "Formato não suportado",
    message: "Use uma foto em JPG, PNG ou WebP.",
    retake: true,
    retryable: false,
  },
  food_diary_photo_required: {
    title: "Foto necessária",
    message: "Envie a foto do prato para continuar.",
    retake: true,
    retryable: false,
  },

  /* Revisão: identidade ambígua não resolvida (o front normalmente já bloqueia) */
  food_diary_items_unresolved: {
    title: "Escolha o tipo dos itens",
    message: "Alguns itens ficaram com identidade incerta. Escolha um candidato (ou remova o item) antes de confirmar.",
    retake: false,
    retryable: false,
  },
  food_diary_item_resolution_invalid: {
    title: "Não consegui aplicar a escolha",
    message: "A escolha do item ficou inconsistente. Selecione um candidato novamente.",
    retake: false,
    retryable: false,
  },

  /* Beta / acesso */
  food_diary_access_required: {
    title: "Diário indisponível",
    message: "O Diário Alimentar não está disponível no seu acesso no momento.",
    retake: false,
    retryable: false,
  },
};

export function describeFoodDiaryError(error: unknown): FoodDiaryErrorInfo {
  if (error instanceof FoodDiaryApiError) {
    const known = BY_CODE[error.code];

    if (known) {
      return known;
    }

    // openai_api_key_missing e quaisquer 5xx desconhecidos: mensagem genérica,
    // sem vazar a causa real (config/infra) para o usuário.
    if (error.status >= 500) {
      return { ...GENERIC, message: "O serviço está indisponível no momento. Tente novamente em breve." };
    }
  }

  return GENERIC;
}
