import { isAdminEmail } from "@/bff/core/auth/adminAccess";
import { ensureAuthenticated, type AuthContext } from "@/bff/core/auth/ensureAuthenticated";
import { ApiError } from "@/bff/core/errors/ApiError";
import { createSupabaseAdminClient } from "@/bff/core/supabase/server";

/**
 * Server-side admin guard. Authenticates the request, then requires BOTH:
 *  - the authenticated e-mail is in the MOVE_ADMIN_EMAILS allowlist, and
 *  - the user has a trainer_profile (admins are normal trainer accounts).
 *
 * This is the real security boundary for admin endpoints: every BFF service
 * uses the service-role client (which bypasses RLS), so admin routes MUST call
 * this guard. Throws 403 when not authorized; returns the AuthContext otherwise.
 */
export async function ensureAdmin(request: Request): Promise<AuthContext> {
  const authContext = await ensureAuthenticated(request);

  if (!isAdminEmail(authContext.email)) {
    throw new ApiError(403, "admin_access_required", "Acesso restrito ao administrador do Move.");
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("trainer_profiles")
    .select("user_id")
    .eq("user_id", authContext.userId)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, "admin_access_check_failed", "Não foi possível validar o acesso admin.");
  }

  if (!data) {
    throw new ApiError(403, "admin_access_required", "Acesso restrito ao administrador do Move.");
  }

  return authContext;
}
