import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';

import { fetchBalance, fetchProfile } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { UserRole } from '@/types';

type DemoSession = {
  id: string;
  name: string;
  email: string;
  balance: number;
  role: UserRole;
};

type DemoSessionContextValue = {
  session: DemoSession | null;
  isLoading: boolean;
  signOut: () => void;
  setBalance: (n: number) => void;
};

const DemoSessionContext = createContext<DemoSessionContextValue | null>(null);

export function DemoSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<DemoSession | null>(null);
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

  return <DemoSessionContext value={value}>{children}</DemoSessionContext>;
}

export function useDemoSession() {
  const context = use(DemoSessionContext);
  if (!context) {
    throw new Error('useDemoSession must be used inside DemoSessionProvider');
  }
  return context;
}
