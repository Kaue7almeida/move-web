import assert from "node:assert/strict";
import { test } from "node:test";

import { isFoodDiaryBetaEmail, isFoodDiaryEnabledForUser } from "@/bff/core/auth/foodDiaryBetaAccess";

const ENV_KEY = "FOOD_DIARY_BETA_EMAILS";

function withEnv(value: string | undefined, run: () => void): void {
  const previous = process.env[ENV_KEY];

  if (value === undefined) {
    delete process.env[ENV_KEY];
  } else {
    process.env[ENV_KEY] = value;
  }

  try {
    run();
  } finally {
    if (previous === undefined) {
      delete process.env[ENV_KEY];
    } else {
      process.env[ENV_KEY] = previous;
    }
  }
}

test("blocks everyone when FOOD_DIARY_BETA_EMAILS is absent (fail closed)", () => {
  withEnv(undefined, () => {
    assert.equal(isFoodDiaryBetaEmail("kaue.cunha@warren.com.br"), false);
  });
});

test("blocks everyone when FOOD_DIARY_BETA_EMAILS is empty or blank", () => {
  withEnv("", () => {
    assert.equal(isFoodDiaryBetaEmail("kaue.cunha@warren.com.br"), false);
  });

  withEnv("   ", () => {
    assert.equal(isFoodDiaryBetaEmail("kaue.cunha@warren.com.br"), false);
  });
});

test("allows an allowlisted e-mail regardless of case and surrounding whitespace", () => {
  withEnv("kaue.cunha@warren.com.br", () => {
    assert.equal(isFoodDiaryBetaEmail("kaue.cunha@warren.com.br"), true);
    assert.equal(isFoodDiaryBetaEmail("KAUE.CUNHA@Warren.Com.BR"), true);
    assert.equal(isFoodDiaryBetaEmail("  kaue.cunha@warren.com.br  "), true);
  });
});

test("rejects e-mails that are not on the allowlist, and empty identities", () => {
  withEnv("kaue.cunha@warren.com.br", () => {
    assert.equal(isFoodDiaryBetaEmail("someone.else@warren.com.br"), false);
    assert.equal(isFoodDiaryBetaEmail(undefined), false);
    assert.equal(isFoodDiaryBetaEmail(null), false);
    assert.equal(isFoodDiaryBetaEmail(""), false);
  });
});

test("supports a comma-separated multi-email allowlist", () => {
  withEnv("a@b.com, kaue.cunha@warren.com.br ,c@d.com", () => {
    assert.equal(isFoodDiaryBetaEmail("kaue.cunha@warren.com.br"), true);
    assert.equal(isFoodDiaryBetaEmail("a@b.com"), true);
    assert.equal(isFoodDiaryBetaEmail("c@d.com"), true);
    assert.equal(isFoodDiaryBetaEmail("x@y.com"), false);
  });
});

/*
 * Role-agnostic contract (hotfix): the Food Diary flag depends ONLY on the beta
 * allowlist, never on the user's role. isFoodDiaryEnabledForUser deliberately
 * takes no role argument, so these cases model the (email-only) decision for any
 * role — a trainer-only account gets the exact same answer as a student.
 */
test("role-agnostic (A): an allowlisted STUDENT is enabled", () => {
  withEnv("kaue.cunha@warren.com.br", () => {
    assert.equal(isFoodDiaryEnabledForUser("kaue.cunha@warren.com.br"), true);
  });
});

test("role-agnostic (B/C): an allowlisted TRAINER-only account is enabled (same decision as a student)", () => {
  // Same e-mail, no role input — a trainer/personal in the allowlist is enabled,
  // so the API guard (which now checks only the e-mail) authorizes it too.
  withEnv("kaue.cunha@warren.com.br", () => {
    assert.equal(isFoodDiaryEnabledForUser("kaue.cunha@warren.com.br"), true);
  });
});

test("role-agnostic: a multi-role allowlist enables both a student and a trainer e-mail", () => {
  withEnv("student.beta@move.app, trainer.beta@move.app", () => {
    assert.equal(isFoodDiaryEnabledForUser("student.beta@move.app"), true);
    assert.equal(isFoodDiaryEnabledForUser("trainer.beta@move.app"), true);
  });
});

test("role-agnostic (D/E): a non-allowlisted user is disabled regardless of role", () => {
  withEnv("kaue.cunha@warren.com.br", () => {
    assert.equal(isFoodDiaryEnabledForUser("random.student@move.app"), false);
    assert.equal(isFoodDiaryEnabledForUser("random.trainer@move.app"), false);
  });
});

test("role-agnostic (F): fail-closed — nobody enabled when the env is absent", () => {
  withEnv(undefined, () => {
    assert.equal(isFoodDiaryEnabledForUser("kaue.cunha@warren.com.br"), false);
  });
});

test("role-agnostic (G): normalizes case and whitespace like the base check", () => {
  withEnv("kaue.cunha@warren.com.br", () => {
    assert.equal(isFoodDiaryEnabledForUser("  KAUE.CUNHA@Warren.Com.BR  "), true);
  });
});

test("isFoodDiaryEnabledForUser matches isFoodDiaryBetaEmail exactly (email-only contract)", () => {
  withEnv("kaue.cunha@warren.com.br", () => {
    const cases: Array<string | null | undefined> = [
      "kaue.cunha@warren.com.br",
      "nope@move.app",
      "",
      null,
      undefined,
    ];

    for (const email of cases) {
      assert.equal(isFoodDiaryEnabledForUser(email), isFoodDiaryBetaEmail(email));
    }
  });
});
