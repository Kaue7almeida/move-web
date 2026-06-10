import { ApiError } from "@/bff/core/errors/ApiError";
import { createSupabaseAuthClient } from "@/bff/core/supabase/server";

export type AuthContext = {
  userId: string;
  email?: string;
};

function getBearerToken(authorizationHeader: string | null) {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.trim().split(/\s+/, 2);

  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

function getAccessTokenFromRequest(request: Request) {
  const authorizationToken = getBearerToken(request.headers.get("authorization"));

  if (authorizationToken) {
    return authorizationToken;
  }

  const accessTokenHeader = request.headers.get("access-token")?.trim();

  return accessTokenHeader ? accessTokenHeader : null;
}

export async function ensureAuthenticated(request: Request): Promise<AuthContext> {
  const accessToken = getAccessTokenFromRequest(request);

  if (!accessToken) {
    throw new ApiError(401, "unauthorized", "Usuário não autenticado.");
  }

  const supabase = createSupabaseAuthClient();
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new ApiError(401, "unauthorized", "Usuário não autenticado.");
  }

  return {
    userId: data.user.id,
    email: data.user.email ?? undefined,
  };
}