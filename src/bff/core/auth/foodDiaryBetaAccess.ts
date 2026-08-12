/**
 * Food Diary beta access is gated by the FOOD_DIARY_BETA_EMAILS environment
 * variable: a comma-separated allowlist of e-mails. Parsing is done at call time
 * (not at module load) so it stays correct regardless of env load ordering.
 *
 * Fail closed: when the env var is absent or empty, the allowlist is empty and
 * nobody can access the Food Diary. Mirrors the adminAccess.ts convention.
 */
function parseBetaEmails(raw: string | undefined): Set<string> {
  if (!raw) {
    return new Set();
  }

  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0),
  );
}

export function isFoodDiaryBetaEmail(email: string | null | undefined): boolean {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) {
    return false;
  }

  return parseBetaEmails(process.env.FOOD_DIARY_BETA_EMAILS).has(normalizedEmail);
}

/**
 * Whether the Food Diary is enabled for a Move user. The Diary is a PERSONAL
 * feature and is role-agnostic — it works for students, trainers and admins
 * alike. The only boundary is the beta allowlist (fail-closed).
 *
 * This function intentionally takes NO role argument, so the decision can never
 * regress to being student-only: role is not part of the contract. Ownership of
 * diary data is always the authenticated user (public.profiles.id), enforced by
 * ensureFoodDiaryAccess and the per-user query filters — not by this flag.
 */
export function isFoodDiaryEnabledForUser(email: string | null | undefined): boolean {
  return isFoodDiaryBetaEmail(email);
}
