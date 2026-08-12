/**
 * Local-day math for the Food Diary, using only the native Intl runtime (no
 * timezone library). A "diary day" is a calendar day in the student's IANA time
 * zone: a meal logged at 22:30 in America/Sao_Paulo (01:30 UTC next day) belongs
 * to the local day, not the UTC day. The DB keeps storing timestamptz/ISO; these
 * helpers only translate between a local calendar day and the UTC window that
 * bounds it.
 *
 * This module is intentionally dependency-free (no ApiError, no imports) so the
 * pure day/timezone logic can be unit-tested directly.
 */

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

/** Returns the tz if it is a valid IANA zone, otherwise "UTC" (safe default). */
export function resolveTimeZone(timeZone: string | undefined | null): string {
  if (!timeZone) {
    return "UTC";
  }

  try {
    // Constructing with an invalid timeZone throws a RangeError.
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return "UTC";
  }
}

/** True when `value` is a real YYYY-MM-DD calendar date (rejects e.g. 2026-02-30). */
export function isValidDateString(value: string): boolean {
  if (!DATE_ONLY_REGEX.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Offset (local wall-clock − UTC) in ms for `instant` observed in `timeZone`. */
function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts: Record<string, number> = {};

  for (const part of formatter.formatToParts(instant)) {
    if (part.type !== "literal") {
      parts[part.type] = Number(part.value);
    }
  }

  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return asUtc - instant.getTime();
}

/** UTC instant of the start (local midnight) of `dayString` in `timeZone`. */
function zonedDayStartUtc(dayString: string, timeZone: string): Date {
  // Treat the wall-clock midnight as if it were UTC, then correct by the zone's
  // offset. A second pass handles the rare DST boundary near midnight.
  const guessUtcMs = Date.parse(`${dayString}T00:00:00Z`);
  const firstOffset = timeZoneOffsetMs(new Date(guessUtcMs), timeZone);
  let utcMs = guessUtcMs - firstOffset;

  const secondOffset = timeZoneOffsetMs(new Date(utcMs), timeZone);

  if (secondOffset !== firstOffset) {
    utcMs = guessUtcMs - secondOffset;
  }

  return new Date(utcMs);
}

/** The local calendar day (YYYY-MM-DD) of `instant` in `timeZone`. */
export function localDayOf(instant: Date | string, timeZone: string): string {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts: Record<string, string> = {};

  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") {
      parts[part.type] = part.value;
    }
  }

  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** The UTC window [startIso, endIso) that bounds the local calendar day. */
export function localDayWindow(
  dayString: string,
  timeZone: string,
): { startIso: string; endIso: string } {
  const nextDay = new Date(Date.parse(`${dayString}T00:00:00Z`) + DAY_MS)
    .toISOString()
    .slice(0, 10);

  return {
    startIso: zonedDayStartUtc(dayString, timeZone).toISOString(),
    endIso: zonedDayStartUtc(nextDay, timeZone).toISOString(),
  };
}

/** `count` calendar-day strings ending at `endDay` (chronological, oldest first). */
export function buildLocalDayStrings(endDay: string, count: number): string[] {
  const endMs = Date.parse(`${endDay}T00:00:00Z`);
  const days: string[] = [];

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    days.push(new Date(endMs - offset * DAY_MS).toISOString().slice(0, 10));
  }

  return days;
}
