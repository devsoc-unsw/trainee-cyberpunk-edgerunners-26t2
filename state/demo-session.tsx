import { createContext, use, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { fetchCurrentUser } from '@/lib/supabase-data';
import { User } from '@/types';

type DemoSession = User;

type DemoSessionContextValue = {
  session: DemoSession | null;
  isReady: boolean;
  signOut: () => void;
  setBalance: (n: number) => void;
  refreshUser: () => Promise<void>;
};

const DemoSessionContext = createContext<DemoSessionContextValue | null>(null);

export function DemoSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<DemoSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const refreshUser = async () => {
      try {
        const user = await fetchCurrentUser();
        if (isMounted) setSession(user);
      } catch (error) {
        console.warn('Unable to load the current Supabase profile', error);
      }
    };

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.warn('Unable to restore the Supabase session', error);
      } else if (data.session) {
        setSession({
          id: data.session.user.id,
          name: 'UNSW Student',
          email: data.session.user.email ?? 'student@unsw.edu.au',
          balance: 0,
          role: 'USER',
        });
        void refreshUser();
      }
    }).finally(() => {
      if (isMounted) setIsReady(true);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, supabaseSession) => {
      if (!supabaseSession) {
        setSession(null);
        return;
      }

      setSession((current) =>
        current ?? {
          id: supabaseSession.user.id,
          name: 'UNSW Student',
          email: supabaseSession.user.email ?? 'student@unsw.edu.au',
          balance: 0,
          role: 'USER',
        }
      );

      setTimeout(() => void refreshUser(), 0);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      isReady,
      signOut: () => setSession(null),
      setBalance: (n: number) => setSession((current) => (current ? { ...current, balance: n } : current)),
      refreshUser: async () => {
        const user = await fetchCurrentUser();
        setSession(user);
      },
    }),
    [isReady, session],
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
