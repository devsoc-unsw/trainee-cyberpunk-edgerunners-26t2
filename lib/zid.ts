// Mirrors the `profiles_zid_format` check constraint in the database so the
// user gets a useful message before a round trip. The database remains the
// authority -- see 20260910120000_apple_signin_zid_linking.sql.
export const ZID_PATTERN = /^z[0-9]{7}$/;

export const ZID_HINT = 'Your zID, e.g. z5555555.';

export function normalizeZid(value: string): string {
  return value.trim().toLowerCase();
}

export function validateZid(value: string): string | null {
  const normalized = normalizeZid(value);

  if (!normalized) {
    return 'Enter your zID to continue.';
  }
  if (!ZID_PATTERN.test(normalized)) {
    return 'zIDs look like z followed by 7 digits, e.g. z5555555.';
  }
  return null;
}
