/**
 * Acesso ao Diário Alimentar.
 *
 * GA (disponível para todos): o Diário é uma feature PESSOAL e role-agnostic —
 * funciona para alunos, trainers e admins. Todo usuário AUTENTICADO tem acesso.
 * A antiga allowlist de beta (FOOD_DIARY_BETA_EMAILS) NÃO restringe mais.
 *
 * Kill-switch opcional e reversível: se `FOOD_DIARY_RESTRICT_EMAILS` estiver setado
 * (lista de e-mails separada por vírgula), o acesso volta a ser restrito APENAS a
 * esses e-mails — útil para um rollback emergencial sem redeploy de código. Ausente
 * ou vazio (padrão) = aberto a todos os autenticados.
 *
 * Ownership dos dados continua sempre o usuário autenticado (public.profiles.id),
 * garantido por ensureFoodDiaryAccess e pelos filtros por-usuário — não por aqui.
 */
function parseEmails(raw: string | undefined): Set<string> {
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

/**
 * Whether the Food Diary is available for a Move user. Takes NO role argument, so
 * the decision can never regress to being student-only. Aberto a todos os usuários
 * autenticados; só restringe se FOOD_DIARY_RESTRICT_EMAILS estiver configurado.
 */
export function isFoodDiaryEnabledForUser(email: string | null | undefined): boolean {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) {
    // Precisa de um usuário autenticado com e-mail resolvido no servidor.
    return false;
  }

  const restrictedTo = parseEmails(process.env.FOOD_DIARY_RESTRICT_EMAILS);

  if (restrictedTo.size > 0) {
    // Restrição emergencial ativa (opt-in via env) — só estes e-mails.
    return restrictedTo.has(normalizedEmail);
  }

  // Disponível para todos os usuários autenticados (GA).
  return true;
}
