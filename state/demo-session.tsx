import { createContext, use, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { UserRole } from '@/types';

type DemoSession = {
  name: string;
  email: string;
  balance: number;
  role: UserRole;
};

type DemoSessionContextValue = {
  session: DemoSession | null;
  signIn: (identifier: string, password: string) => void;
  signOut: () => void;
};

const DemoSessionContext = createContext<DemoSessionContextValue | null>(null);

export function DemoSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<DemoSession | null>(null);

  // On startup
  useEffect(() => {
    // Check for pre-existing session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession((current) =>
          current ?? {
            name: 'UNSW Student',
            email: data.session.user.email ?? 'student@unsw.edu.au',
            balance: 1000,
            role: 'USER',
          }
        );
      }
    });
    
    // Subscribe to supabase auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, supabaseSession) => {
      if (!supabaseSession) {
        setSession(null);
        return;
      }
      setSession((current) =>
        current ?? {
          name: 'UNSW Student',
          email: supabaseSession.user.email ?? 'student@unsw.edu.au',
          balance: 1000,
          role: 'USER',
        }
      );
    });
    
    // Reset subscription on unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      signIn: (identifier: string, password: string) => {
        const isAdmin = identifier.trim().toLowerCase() === 'test' && password === 'test';
        setSession({
          name: isAdmin ? 'Test Admin' : 'UNSW Student',
          email: isAdmin ? 'test@unswager.app' : identifier.trim() || 'student@unsw.edu.au',
          balance: isAdmin ? 2500 : 1000,
          role: isAdmin ? 'ADMIN' : 'USER',
        });
      },
      signOut: () => setSession(null),
    }),
    [session]
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
