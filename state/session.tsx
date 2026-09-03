import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthRetryableFetchError, type User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { UserRole } from '@/types';

export type Profile = {
  id: string;
  email: string;
  username: string | null;
  role: UserRole;
  balance: number;
  createdAt: string;
};

type SessionContextValue = {
  user: User | null;
  profile: Profile | null;
  /** True until the stored auth session and the matching profile have settled. */
  isLoading: boolean;
  /** A signed-in user who has not picked a username yet. */
  needsUsername: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  saveUsername: (username: string) => Promise<void>;
  setBalance: (balance: number) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

/** Postgres unique violation: the username is already taken. */
const UNIQUE_VIOLATION = '23505';
/** Postgres check violation: the username breaks the format rule. */
const CHECK_VIOLATION = '23514';

export class UsernameTakenError extends Error {
  constructor() {
    super('That username is already taken.');
    this.name = 'UsernameTakenError';
  }
}

/**
 * The profile fetched for a specific user. Keying it by id rather than storing
 * a bare profile means a signed-out or swapped user can never briefly see the
 * previous account's details, and it doubles as the "have we loaded yet" flag.
 */
type LoadedProfile = {
  userId: string;
  profile: Profile | null;
};

async function fetchProfile(user: User): Promise<Profile> {
  const [profileResult, balanceResult] = await Promise.all([
    supabase.from('profiles').select('id, username, role, created_at').eq('id', user.id).maybeSingle(),
    supabase.from('profile_balances').select('balance').eq('profile_id', user.id).maybeSingle(),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (balanceResult.error) throw balanceResult.error;

  let profile = profileResult.data;

  // Accounts created before the provisioning trigger existed have no row. The
  // migration backfills them, but self-healing here keeps a stale account
  // usable against a database that has not been migrated yet.
  if (!profile) {
    const { data, error } = await supabase
      .from('profiles')
      .insert({ id: user.id })
      .select('id, username, role, created_at')
      .single();
    if (error) throw error;
    profile = data;
  }

  return {
    id: profile.id,
    email: user.email ?? '',
    username: profile.username,
    role: profile.role === 'ADMIN' ? 'ADMIN' : 'USER',
    balance: balanceResult.data?.balance ?? 0,
    createdAt: profile.created_at,
  };
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [loaded, setLoaded] = useState<LoadedProfile | null>(null);

  // Auth events can outrun a profile fetch. Only the newest request wins.
  const loadId = useRef(0);

  useEffect(() => {
    let isMounted = true;

    // getUser, not getSession: getSession only reads the token out of local
    // storage and never asks the server whether it is still good. A token that
    // outlives its account -- the database was reset, the user deleted, the
    // session revoked -- still looks valid, so the app booted straight into the
    // signed-in UI instead of the login screen.
    supabase.auth.getUser().then(async ({ data, error }) => {
      if (!isMounted) {
        return;
      }

      if (!error) {
        setUser(data.user);
        setIsLoadingUser(false);
        return;
      }

      // Being offline is not evidence the session is bad. Fall back to the
      // stored one rather than signing someone out for losing signal.
      if (error instanceof AuthRetryableFetchError) {
        const { data: stored } = await supabase.auth.getSession();
        if (isMounted) {
          setUser(stored.session?.user ?? null);
          setIsLoadingUser(false);
        }
        return;
      }

      // The server rejected the token, so drop it locally. Without this the
      // stale token stays in storage and every launch repeats this dance.
      await supabase.auth.signOut({ scope: 'local' });
      if (isMounted) {
        setUser(null);
        setIsLoadingUser(false);
      }
    });

    // Supabase warns against awaiting other Supabase calls inside this
    // callback, so it only records the user; the effect below does the I/O.
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoadingUser(false);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Written as a promise chain rather than async/await so the state updates
  // live in callbacks, which is what makes it safe to call from an effect.
  const loadProfile = useCallback((currentUser: User) => {
    const requestId = ++loadId.current;

    return fetchProfile(currentUser)
      .then((profile) => {
        if (requestId === loadId.current) {
          setLoaded({ userId: currentUser.id, profile });
        }
      })
      .catch(() => {
        // Keep whatever was already on screen for this user -- the profile
        // screen offers a retry through pull-to-refresh rather than dropping
        // them out of the app over one failed request.
        if (requestId === loadId.current) {
          setLoaded((current) =>
            current?.userId === currentUser.id ? current : { userId: currentUser.id, profile: null }
          );
        }
      });
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }
    loadProfile(user);
  }, [user, loadProfile]);

  // Derived rather than stored, so signing out cannot leave a stale profile
  // behind for a render.
  const profile = user && loaded?.userId === user.id ? loaded.profile : null;

  const updateProfile = useCallback((change: (profile: Profile) => Profile) => {
    setLoaded((current) =>
      current?.profile ? { ...current, profile: change(current.profile) } : current
    );
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      profile,
      isLoading: isLoadingUser || (user !== null && loaded?.userId !== user.id),
      needsUsername: profile !== null && !profile.username,
      refresh: async () => {
        if (user) {
          await loadProfile(user);
        }
      },
      signOut: async () => {
        // Local scope: clearing this device's session always succeeds, even
        // offline or with an already-expired refresh token.
        await supabase.auth.signOut({ scope: 'local' });
        setUser(null);
        setLoaded(null);
      },
      saveUsername: async (username: string) => {
        if (!user) {
          throw new Error('You must be signed in to set a username.');
        }

        const { data, error } = await supabase
          .from('profiles')
          .update({ username })
          .eq('id', user.id)
          .select('username')
          .single();

        if (error) {
          if (error.code === UNIQUE_VIOLATION) {
            throw new UsernameTakenError();
          }
          if (error.code === CHECK_VIOLATION) {
            throw new Error('Usernames use 3-20 letters, numbers or underscores.');
          }
          throw error;
        }

        updateProfile((current) => ({ ...current, username: data.username }));
      },
      setBalance: (balance: number) => {
        updateProfile((current) => ({ ...current, balance }));
      },
    }),
    [user, profile, isLoadingUser, loaded, loadProfile, updateProfile]
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession() {
  const context = use(SessionContext);
  if (!context) {
    throw new Error('useSession must be used inside SessionProvider');
  }
  return context;
}
