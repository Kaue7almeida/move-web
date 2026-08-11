import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildLocalDayStrings,
  isValidDateString,
  localDayOf,
  localDayWindow,
  resolveTimeZone,
} from "@/bff/modules/foodDiary/diaryDay";

test("resolveTimeZone falls back to UTC for absent/invalid zones", () => {
  assert.equal(resolveTimeZone(undefined), "UTC");
  assert.equal(resolveTimeZone(""), "UTC");
  assert.equal(resolveTimeZone("Not/AZone"), "UTC");
  assert.equal(resolveTimeZone("America/Sao_Paulo"), "America/Sao_Paulo");
});

test("a late-night São Paulo meal belongs to the local day, not the UTC day", () => {
  // 2026-08-11 22:30 in America/Sao_Paulo (UTC-3) is 2026-08-12T01:30Z.
  const instant = "2026-08-12T01:30:00.000Z";
  assert.equal(localDayOf(instant, "America/Sao_Paulo"), "2026-08-11");
  assert.equal(localDayOf(instant, "UTC"), "2026-08-12");
});

test("localDayWindow bounds the São Paulo local day in UTC", () => {
  const { startIso, endIso } = localDayWindow("2026-08-11", "America/Sao_Paulo");
  assert.equal(startIso, "2026-08-11T03:00:00.000Z"); // 00:00 local = 03:00Z
  assert.equal(endIso, "2026-08-12T03:00:00.000Z");
  // The 01:30Z instant falls inside this window.
  assert.ok(startIso <= "2026-08-12T01:30:00.000Z");
  assert.ok("2026-08-12T01:30:00.000Z" < endIso);
});

test("localDayWindow handles a UTC+ zone (Asia/Tokyo, UTC+9)", () => {
  const { startIso, endIso } = localDayWindow("2026-08-11", "Asia/Tokyo");
  assert.equal(startIso, "2026-08-10T15:00:00.000Z"); // 00:00 JST = 15:00Z previous day
  assert.equal(endIso, "2026-08-11T15:00:00.000Z");
});

test("buildLocalDayStrings returns 7 chronological days ending at the given day", () => {
  const days = buildLocalDayStrings("2026-08-11", 7);
  assert.equal(days.length, 7);
  assert.equal(days[0], "2026-08-05");
  assert.equal(days[6], "2026-08-11");
});

test("isValidDateString rejects malformed and impossible dates", () => {
  assert.equal(isValidDateString("2026-08-11"), true);
  assert.equal(isValidDateString("2026-02-30"), false);
  assert.equal(isValidDateString("2026-8-1"), false);
  assert.equal(isValidDateString("not-a-date"), false);
});
