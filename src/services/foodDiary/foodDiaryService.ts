import type {
  ActivityEnergyResponse,
  CalorieTargetResponse,
  CreateActivityInput,
  CreateEntryDraftInput,
  FoodDiaryDeleteResponse,
  FoodDiaryEntryResponse,
  FoodDiaryHistoryResponse,
  FoodDiaryPhotoResponse,
  FoodDiaryTodayResponse,
  ReviewEntryInput,
  UpsertCalorieTargetInput,
} from "@/bff/modules/foodDiary/types";
import type { FoodDiaryPlanResponse, UpsertPlanInput } from "@/bff/modules/foodDiary/types/plan";
import { authenticatedFetch } from "@/services/api/authenticatedFetch";

/* ─── Error carrying the backend error.code ─────────────────────────────────── */

export class FoodDiaryApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "FoodDiaryApiError";
    this.code = code;
    this.status = status;
  }
}

async function throwFoodDiaryApiError(response: Response, fallback: string): Promise<never> {
  let code = "unknown_error";
  let message = fallback;

  try {
    const payload = (await response.json()) as { error?: { code?: string; message?: string } };

    if (payload.error?.code) {
      code = payload.error.code;
    }
    if (payload.error?.message) {
      message = payload.error.message;
    }
  } catch {
    // keep fallback values
  }

  throw new FoodDiaryApiError(response.status, code, message);
}

/** The viewer's IANA time zone, used so the diary day matches the local calendar day. */
export function clientTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/* ─── Reads ─────────────────────────────────────────────────────────────────── */

export async function getToday(date?: string): Promise<FoodDiaryTodayResponse> {
  const params = new URLSearchParams({ tz: clientTimeZone() });

  if (date) {
    params.set("date", date);
  }

  const response = await authenticatedFetch(`/api/v1/food-diary/today?${params.toString()}`, {
    method: "GET",
  });

  if (!response.ok) {
    await throwFoodDiaryApiError(response, "Não foi possível carregar o diário de hoje.");
  }

  return (await response.json()) as FoodDiaryTodayResponse;
}

export async function getHistory(date?: string): Promise<FoodDiaryHistoryResponse> {
  const params = new URLSearchParams({ tz: clientTimeZone() });

  if (date) {
    params.set("date", date);
  }

  const response = await authenticatedFetch(`/api/v1/food-diary/history?${params.toString()}`, {
    method: "GET",
  });

  if (!response.ok) {
    await throwFoodDiaryApiError(response, "Não foi possível carregar o histórico.");
  }

  return (await response.json()) as FoodDiaryHistoryResponse;
}

export async function getEntry(entryId: string): Promise<FoodDiaryEntryResponse> {
  const response = await authenticatedFetch(`/api/v1/food-diary/entries/${entryId}`, {
    method: "GET",
  });

  if (!response.ok) {
    await throwFoodDiaryApiError(response, "Não foi possível carregar o registro.");
  }

  return (await response.json()) as FoodDiaryEntryResponse;
}

/* ─── Energy plan (Diário 2.0) ──────────────────────────────────────────────── */

export async function getPlan(): Promise<FoodDiaryPlanResponse> {
  const response = await authenticatedFetch("/api/v1/food-diary/plan", { method: "GET" });

  if (!response.ok) {
    await throwFoodDiaryApiError(response, "Não foi possível carregar seu plano.");
  }

  return (await response.json()) as FoodDiaryPlanResponse;
}

export async function upsertPlan(input: UpsertPlanInput): Promise<FoodDiaryPlanResponse> {
  const response = await authenticatedFetch("/api/v1/food-diary/plan", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ timeZone: clientTimeZone(), ...input }),
  });

  if (!response.ok) {
    await throwFoodDiaryApiError(response, "Não foi possível salvar seu plano.");
  }

  return (await response.json()) as FoodDiaryPlanResponse;
}

/* ─── Target & activities ───────────────────────────────────────────────────── */

export async function upsertTarget(
  input: UpsertCalorieTargetInput,
): Promise<CalorieTargetResponse> {
  const response = await authenticatedFetch("/api/v1/food-diary/target", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ timeZone: clientTimeZone(), ...input }),
  });

  if (!response.ok) {
    await throwFoodDiaryApiError(response, "Não foi possível salvar a meta.");
  }

  return (await response.json()) as CalorieTargetResponse;
}

export async function addActivity(input: CreateActivityInput): Promise<ActivityEnergyResponse> {
  const response = await authenticatedFetch("/api/v1/food-diary/activities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    await throwFoodDiaryApiError(response, "Não foi possível salvar a atividade.");
  }

  return (await response.json()) as ActivityEnergyResponse;
}

export async function removeActivity(activityId: string): Promise<FoodDiaryDeleteResponse> {
  const response = await authenticatedFetch(`/api/v1/food-diary/activities/${activityId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    await throwFoodDiaryApiError(response, "Não foi possível excluir a atividade.");
  }

  return (await response.json()) as FoodDiaryDeleteResponse;
}

/* ─── Meal lifecycle (draft → photo → analyze → review → confirm) ────────────── */

export async function createEntry(input: CreateEntryDraftInput): Promise<FoodDiaryEntryResponse> {
  const response = await authenticatedFetch("/api/v1/food-diary/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    await throwFoodDiaryApiError(response, "Não foi possível iniciar o registro da refeição.");
  }

  return (await response.json()) as FoodDiaryEntryResponse;
}

export async function uploadEntryPhoto(
  entryId: string,
  file: File,
): Promise<FoodDiaryPhotoResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await authenticatedFetch(`/api/v1/food-diary/entries/${entryId}/photo`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    await throwFoodDiaryApiError(response, "Não foi possível enviar a foto.");
  }

  return (await response.json()) as FoodDiaryPhotoResponse;
}

export async function analyzeEntry(entryId: string): Promise<FoodDiaryEntryResponse> {
  const response = await authenticatedFetch(`/api/v1/food-diary/entries/${entryId}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ timeZone: clientTimeZone() }),
  });

  if (!response.ok) {
    await throwFoodDiaryApiError(response, "Não foi possível analisar a refeição.");
  }

  return (await response.json()) as FoodDiaryEntryResponse;
}

export async function reviewEntry(
  entryId: string,
  input: ReviewEntryInput,
): Promise<FoodDiaryEntryResponse> {
  const response = await authenticatedFetch(`/api/v1/food-diary/entries/${entryId}/review`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    await throwFoodDiaryApiError(response, "Não foi possível salvar a revisão.");
  }

  return (await response.json()) as FoodDiaryEntryResponse;
}

export async function confirmEntry(entryId: string): Promise<FoodDiaryEntryResponse> {
  const response = await authenticatedFetch(`/api/v1/food-diary/entries/${entryId}/confirm`, {
    method: "POST",
  });

  if (!response.ok) {
    await throwFoodDiaryApiError(response, "Não foi possível confirmar a refeição.");
  }

  return (await response.json()) as FoodDiaryEntryResponse;
}

export async function deleteEntry(entryId: string): Promise<FoodDiaryDeleteResponse> {
  const response = await authenticatedFetch(`/api/v1/food-diary/entries/${entryId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    await throwFoodDiaryApiError(response, "Não foi possível excluir o registro.");
  }

  return (await response.json()) as FoodDiaryDeleteResponse;
}
