import { ensureAuthenticated, type AuthContext } from "@/bff/core/auth/ensureAuthenticated";
import { ensureStudentProfile } from "@/bff/core/auth/ensureStudentProfile";
import { isFoodDiaryBetaEmail } from "@/bff/core/auth/foodDiaryBetaAccess";
import { ApiError } from "@/bff/core/errors/ApiError";

/**
 * Server-side guard for the Food Diary domain. This is the real security boundary
 * for every /api/v1/food-diary/* route (and the future AI routes): the BFF reaches
 * the food-diary tables via the service-role client, which bypasses RLS, so these
 * routes MUST call this guard.
 *
 * Requires ALL of:
 *  - an authenticated request (userId comes from the verified session, never the body);
 *  - the authenticated e-mail is in the FOOD_DIARY_BETA_EMAILS allowlist (beta gate);
 *  - the user has a student_profile (P1 is student-only).
 *
 * Throws 403 when not authorized; returns the AuthContext otherwise.
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

  await ensureStudentProfile(authContext);

  return authContext;
}
