/**
 * Admin access is gated by the MOVE_ADMIN_EMAILS environment variable: a
 * comma-separated allowlist of e-mails. Parsing is done at call time (not at
 * module load) so it stays correct regardless of env load ordering.
 *
 * Fail closed: when the env var is absent or empty, the allowlist is empty and
 * nobody is an admin.
 */
function parseAdminEmails(raw: string | undefined): Set<string> {
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

export function isAdminEmail(email: string | null | undefined): boolean {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) {
    return false;
  }

  return parseAdminEmails(process.env.MOVE_ADMIN_EMAILS).has(normalizedEmail);
}
