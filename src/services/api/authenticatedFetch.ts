import { getAccessToken } from "@/services/auth/supabaseClient";

type AuthenticatedFetchOptions = RequestInit & {
  accessToken?: string;
};

type ApiErrorPayload = {
  error?: {
    message?: string;
  };
};

export class UnauthenticatedRequestError extends Error {
  constructor() {
    super("Usuário não autenticado.");
    this.name = "UnauthenticatedRequestError";
  }
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: AuthenticatedFetchOptions = {},
) {
  const accessToken = init.accessToken ?? (await getAccessToken());

  if (!accessToken) {
    throw new UnauthenticatedRequestError();
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  return fetch(input, {
    ...init,
    headers,
  });
}

export async function readApiErrorMessage(response: Response, fallbackMessage: string) {
  try {
    const payload = (await response.json()) as ApiErrorPayload;

    return payload.error?.message ?? fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}