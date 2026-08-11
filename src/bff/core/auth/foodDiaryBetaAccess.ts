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
