import { z } from "zod";

import { ACTIVITY_KEYS } from "@/bff/modules/foodDiary/activityEstimation";

/**
 * Contrato de INTERPRETAÇÃO de atividade (Structured Output). A IA só interpreta a
 * descrição — mapeia para uma atividade CURADA e extrai duração/distância/passos/
 * intensidade. NÃO devolve kcal nem MET (isso é do módulo determinístico).
 */

/** Input do cliente de IA para interpretar a atividade descrita. */
export type ActivityAiInput = {
  description: string;
};

export const activityAiResponseSchema = z.object({
  interpretation: z.object({
    /** Chave curada (ou "unknown" quando não reconhece). */
    activityKey: z.enum([...ACTIVITY_KEYS, "unknown"] as unknown as [string, ...string[]]),
    /** Rótulo humano em pt-BR (ex.: "Caminhada"). */
    label: z.string(),
    durationMinutes: z.number().nullable(),
    distanceKm: z.number().nullable(),
    steps: z.number().nullable(),
    intensity: z.enum(["leve", "moderada", "intensa"]).nullable(),
    /**
     * True quando a descrição soa como MOVIMENTO COTIDIANO (rotina) e não um treino
     * — ex.: "9 mil passos trabalhando". Evita dupla contagem com o fatorRotina.
     */
    isEverydayMovement: z.boolean(),
    /** Falta um dado decisivo (ex.: passos/distância sem duração) → UMA pergunta. */
    needsClarification: z.boolean(),
    clarificationQuestion: z.string().nullable(),
    confidence: z.number(),
    notes: z.string().nullable(),
  }),
});

export type ActivityAiResponse = z.infer<typeof activityAiResponseSchema>;
export type ActivityAiInterpretation = ActivityAiResponse["interpretation"];
