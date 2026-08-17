import assert from "node:assert/strict";
import { test } from "node:test";

import { isFoodDiaryEnabledForUser } from "@/bff/core/auth/foodDiaryBetaAccess";

const RESTRICT_KEY = "FOOD_DIARY_RESTRICT_EMAILS";
const LEGACY_KEY = "FOOD_DIARY_BETA_EMAILS";

function withEnv(key: string, value: string | undefined, run: () => void): void {
  const previous = process.env[key];

  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }

  try {
    run();
  } finally {
    if (previous === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = previous;
    }
  }
}

/* ─── GA: aberto a todos os usuários autenticados ─── */

test("GA: qualquer usuário AUTENTICADO tem acesso quando não há restrição", () => {
  withEnv(RESTRICT_KEY, undefined, () => {
    assert.equal(isFoodDiaryEnabledForUser("qualquer.pessoa@move.app"), true);
    assert.equal(isFoodDiaryEnabledForUser("outro.aluno@move.app"), true);
    assert.equal(isFoodDiaryEnabledForUser("trainer@move.app"), true);
  });
});

test("GA: sem e-mail (não autenticado) → sem acesso", () => {
  withEnv(RESTRICT_KEY, undefined, () => {
    assert.equal(isFoodDiaryEnabledForUser(null), false);
    assert.equal(isFoodDiaryEnabledForUser(undefined), false);
    assert.equal(isFoodDiaryEnabledForUser(""), false);
    assert.equal(isFoodDiaryEnabledForUser("   "), false);
  });
});

test("GA: role-agnostic — aluno e trainer têm exatamente a mesma resposta", () => {
  withEnv(RESTRICT_KEY, undefined, () => {
    assert.equal(isFoodDiaryEnabledForUser("student@move.app"), true);
    assert.equal(isFoodDiaryEnabledForUser("trainer@move.app"), true);
  });
});

test("a antiga env FOOD_DIARY_BETA_EMAILS não restringe mais (é inerte)", () => {
  withEnv(RESTRICT_KEY, undefined, () => {
    withEnv(LEGACY_KEY, "somente.este@move.app", () => {
      // Mesmo com a env legada setada a um único e-mail, outro usuário TEM acesso.
      assert.equal(isFoodDiaryEnabledForUser("qualquer.outro@move.app"), true);
    });
  });
});

/* ─── Kill-switch opcional: FOOD_DIARY_RESTRICT_EMAILS (rollback emergencial) ─── */

test("restrição opcional: quando setada, só os e-mails da lista têm acesso", () => {
  withEnv(RESTRICT_KEY, "a@b.com, kaue.cunha@warren.com.br ,c@d.com", () => {
    assert.equal(isFoodDiaryEnabledForUser("kaue.cunha@warren.com.br"), true);
    assert.equal(isFoodDiaryEnabledForUser("a@b.com"), true);
    assert.equal(isFoodDiaryEnabledForUser("c@d.com"), true);
    assert.equal(isFoodDiaryEnabledForUser("x@y.com"), false); // fora da restrição
  });
});

test("restrição opcional: normaliza caixa e espaços", () => {
  withEnv(RESTRICT_KEY, "kaue.cunha@warren.com.br", () => {
    assert.equal(isFoodDiaryEnabledForUser("  KAUE.CUNHA@Warren.Com.BR  "), true);
    assert.equal(isFoodDiaryEnabledForUser("outro@move.app"), false);
  });
});

test("restrição vazia/em branco = sem restrição (segue aberto a todos)", () => {
  withEnv(RESTRICT_KEY, "", () => {
    assert.equal(isFoodDiaryEnabledForUser("alguem@move.app"), true);
  });
  withEnv(RESTRICT_KEY, "   ", () => {
    assert.equal(isFoodDiaryEnabledForUser("alguem@move.app"), true);
  });
});
