import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';

import { fetchBalance, fetchProfile } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { UserRole } from '@/types';

type Session = {
  id: string;
  name: string;
  email: string;
  balance: number;
  role: UserRole;
};

type SessionContextValue = {
  session: Session | null;
  isLoading: boolean;
  signOut: () => void;
  setBalance: (n: number) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hydrateSession = useCallback(async (user: { id: string; email?: string | null }) => {
    try {
      const [profile, balance] = await Promise.all([
        fetchProfile(user.id, user.email ?? null),
        fetchBalance(user.id),
      ]);

      setSession({
        id: user.id,
        name: profile.username ?? profile.email ?? 'UNSW Student',
        email: profile.email ?? user.email ?? 'student@unsw.edu.au',
        balance,
        role: profile.role.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER',
      });
    } catch {
      setSession({
        id: user.id,
        name: user.email?.split('@')[0] ?? 'UNSW Student',
        email: user.email ?? 'student@unsw.edu.au',
        balance: 0,
        role: 'USER',
      });
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    void supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        await hydrateSession(data.session.user);
      }

      if (isMounted) {
        setIsLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, supabaseSession) => {
      if (!supabaseSession) {
        setSession(null);
        setIsLoading(false);
        return;
      }

      void hydrateSession(supabaseSession.user);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [hydrateSession]);

  const value = useMemo(
    () => ({
      session,
      isLoading,
      signOut: () => setSession(null),
      setBalance: (n: number) => {
        setSession((current) => (current ? { ...current, balance: n } : current));
      },
    }),
    [isLoading, session],
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
