// Mirrors the `profiles_username_format` check constraint in the database so
// the user gets a useful message before a round trip. The database remains the
// authority -- see 20260901085548_profile_identity_and_provisioning.sql.
export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

export const USERNAME_HINT = '3-20 characters. Letters, numbers and underscores only.';

export function validateUsername(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return 'Pick a username to continue.';
  }
  if (trimmed.length < 3) {
    return 'Usernames need at least 3 characters.';
  }
  if (trimmed.length > 20) {
    return 'Usernames can be at most 20 characters.';
  }
  if (!USERNAME_PATTERN.test(trimmed)) {
    return 'Use letters, numbers and underscores only.';
  }
  return null;
}
