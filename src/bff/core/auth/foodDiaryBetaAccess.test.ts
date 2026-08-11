import assert from "node:assert/strict";
import { test } from "node:test";

import { isFoodDiaryBetaEmail } from "@/bff/core/auth/foodDiaryBetaAccess";

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
