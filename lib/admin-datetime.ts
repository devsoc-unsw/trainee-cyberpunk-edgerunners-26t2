/**
 * Admins type closing times as `DD/MM/YYYY HH:MM` in their own timezone.
 *
 * These are hand-rolled rather than handed to `Date.parse`, for two reasons.
 * `Date.parse` reads `03/04/2026` as 4 March on US-locale engines and 3 April
 * elsewhere, so day-first input cannot be passed to it safely. And a bare date
 * string is parsed as UTC midnight by both `Date.parse` and Postgres, which
 * silently shifted every market by the local UTC offset.
 *
 * Parsing builds a local Date from the parts, so what the admin typed is what
 * they meant; callers then serialise with `toISOString()` to hand the server an
 * unambiguous instant.
 */

// Lenient on input width (9/3/2026 9:05 is fine), strict on the separators.
const ADMIN_DATE_TIME = /^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T]+(\d{1,2}):(\d{2})$/;

export const ADMIN_DATE_TIME_PLACEHOLDER = 'DD/MM/YYYY HH:MM';

function pad(value: number, length = 2) {
  return String(value).padStart(length, '0');
}

/**
 * Parses `DD/MM/YYYY HH:MM` as local time. Returns null if the text does not
 * match the format or does not describe a real instant.
 */
export function parseAdminDateTime(input: string): Date | null {
  const match = ADMIN_DATE_TIME.exec(input.trim());

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const hours = Number(match[4]);
  const minutes = Number(match[5]);

  const parsed = new Date(year, month - 1, day, hours, minutes, 0, 0);

  // The Date constructor silently rolls overflow forward, so 31/02/2026 becomes
  // 3 March and 25:00 becomes the next day. Reading the fields back rejects both,
  // along with times erased by a daylight-saving jump.
  const isRealInstant =
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day &&
    parsed.getHours() === hours &&
    parsed.getMinutes() === minutes;

  return isRealInstant ? parsed : null;
}

/** Renders a Date back into the `DD/MM/YYYY HH:MM` form admins type. */
export function formatAdminDateTime(value: Date): string {
  if (Number.isNaN(value.getTime())) {
    return '';
  }

  const date = `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${pad(value.getFullYear(), 4)}`;
  const time = `${pad(value.getHours())}:${pad(value.getMinutes())}`;

  return `${date} ${time}`;
}

/** Convenience for the screens: text in, ISO instant out. */
export function toIsoInstant(input: string): string | null {
  return parseAdminDateTime(input)?.toISOString() ?? null;
}
