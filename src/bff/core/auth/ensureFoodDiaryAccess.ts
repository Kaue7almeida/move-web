import { ensureAuthenticated, type AuthContext } from "@/bff/core/auth/ensureAuthenticated";
import { isFoodDiaryEnabledForUser } from "@/bff/core/auth/foodDiaryBetaAccess";
import { ApiError } from "@/bff/core/errors/ApiError";

/**
 * Server-side guard for the Food Diary domain. This is the real security boundary
 * for every /api/v1/food-diary/* route (and the AI routes): the BFF reaches the
 * food-diary tables via the service-role client, which bypasses RLS, so these
 * routes MUST call this guard.
 *
 * The Food Diary is a PERSONAL feature of the Move user and is role-agnostic — it
 * works for students, trainers and admins alike. It is now GENERALLY AVAILABLE, so
 * access requires only an authenticated request (the owner id comes from the
 * verified session, never from the request body). An optional emergency restriction
 * lives in isFoodDiaryEnabledForUser (FOOD_DIARY_RESTRICT_EMAILS).
 *
 * Ownership is always `authContext.userId` (= public.profiles.id). Throws 403 when
 * not authorized; returns the AuthContext otherwise.
 */
export async function ensureFoodDiaryAccess(request: Request): Promise<AuthContext> {
  const authContext = await ensureAuthenticated(request);

  if (!isFoodDiaryEnabledForUser(authContext.email)) {
    throw new ApiError(
      403,
      "food_diary_access_required",
      "O Diário Alimentar não está disponível no seu acesso.",
    );
  }

  return authContext;
}
