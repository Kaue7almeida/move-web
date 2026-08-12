import { z } from "zod";

import { parseJsonBody } from "@/bff/core/validation/parseJsonBody";

export const upsertPlanBodySchema = z
  .object({
    goal: z.enum(["lose", "maintain", "gain"]),
    tmbSource: z.enum(["scan", "body_fat", "manual"]),
    tmbKcal: z.number().positive().max(10000).optional(),
    leanMassKg: z.number().positive().max(300).optional(),
    bodyFatPercent: z.number().min(1).max(80).optional(),
    weightKg: z.number().positive().max(500).optional(),
    scanId: z.string().uuid().nullable().optional(),
    routineLevel: z.enum(["sedentary", "light", "moderate", "high"]),
    plannedBalanceKcal: z.number().int().min(-3000).max(3000).optional(),
    toleranceKcal: z.number().int().positive().max(2000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.tmbSource === "manual" && value.tmbKcal === undefined) {
      ctx.addIssue({ code: "custom", message: "Informe a TMB manual.", path: ["tmbKcal"] });
    }

    if (
      value.tmbSource === "body_fat" &&
      (value.weightKg === undefined || value.bodyFatPercent === undefined)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Informe peso e percentual de gordura.",
        path: ["bodyFatPercent"],
      });
    }
  });

export type UpsertPlanBody = z.infer<typeof upsertPlanBodySchema>;

export function parseUpsertPlanBody(request: Request): Promise<UpsertPlanBody> {
  return parseJsonBody(request, upsertPlanBodySchema);
}
