import type { AuthContext } from "@/bff/core/auth/ensureAuthenticated";
import { ApiError } from "@/bff/core/errors/ApiError";
import { createSupabaseAdminClient } from "@/bff/core/supabase/server";

/**
 * Verifies that the authenticated user has a student_profile.
 * Throws 403 if the profile does not exist (trainer-only or unconfigured account).
 * Mirrors the pattern used by ensureAdmin — call after ensureAuthenticated.
 */
export async function ensureStudentProfile(authContext: AuthContext): Promise<void> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("student_profiles")
    .select("user_id")
    .eq("user_id", authContext.userId)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, "student_profile_check_failed", "Não foi possível verificar o perfil de aluno.");
  }

  if (!data) {
    throw new ApiError(403, "student_access_required", "Esta funcionalidade está disponível apenas para alunos.");
  }
}
