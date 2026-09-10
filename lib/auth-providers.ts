import type { User } from '@supabase/supabase-js';

/**
 * Whether this account can sign in with a password at all. Apple-only
 * accounts have no password, so any flow that re-authenticates via
 * `signInWithPassword` (changing a password, deleting the account) is a
 * dead end for them unless it branches on this first.
 */
export function hasPasswordAuth(user: User | null | undefined): boolean {
  return Boolean(user?.app_metadata?.providers?.includes('email'));
}

/** Whether Apple is already linked as a sign-in method for this account. */
export function hasAppleAuth(user: User | null | undefined): boolean {
  return Boolean(user?.app_metadata?.providers?.includes('apple'));
}
