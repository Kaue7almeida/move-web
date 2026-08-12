import { ensureAuthenticated, type AuthContext } from "@/bff/core/auth/ensureAuthenticated";
import { isFoodDiaryBetaEmail } from "@/bff/core/auth/foodDiaryBetaAccess";
import { ApiError } from "@/bff/core/errors/ApiError";

/**
 * Server-side guard for the Food Diary domain. This is the real security boundary
 * for every /api/v1/food-diary/* route (and the AI routes): the BFF reaches the
 * food-diary tables via the service-role client, which bypasses RLS, so these
 * routes MUST call this guard.
 *
 * The Food Diary is a PERSONAL feature of the Move user and is role-agnostic — it
 * works for students, trainers and admins alike. Access requires ONLY:
 *  - an authenticated request (the owner id comes from the verified session,
 *    never from the request body);
 *  - the authenticated e-mail is in the FOOD_DIARY_BETA_EMAILS allowlist (the
 *    closed-beta boundary; fail-closed).
 *
 * Ownership is always `authContext.userId` (= public.profiles.id). Throws 403 when
 * not authorized; returns the AuthContext otherwise.
 */
export async function ensureFoodDiaryAccess(request: Request): Promise<AuthContext> {
  const authContext = await ensureAuthenticated(request);

  if (!isFoodDiaryBetaEmail(authContext.email)) {
    throw new ApiError(
      403,
      "food_diary_access_required",
      "O Diário Alimentar ainda não está disponível no seu acesso.",
    );
  }

  return authContext;
}
