import { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { authSignOut } from '../lib/supabase-auth';
import type { IAuthUser, IAuthSession } from '../types/auth';

export interface IAuthContextType {
  user: IAuthUser | null;
  session: IAuthSession | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<IAuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<IAuthUser | null>(null);
  const [session, setSession] = useState<IAuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession(data.session as unknown as IAuthSession);
        setUser({
          id: data.session.user.id,
          email: data.session.user.email!,
        });
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (newSession) {
          setSession(newSession as unknown as IAuthSession);
          setUser({
            id: newSession.user.id,
            email: newSession.user.email!,
          });
        } else {
          setSession(null);
          setUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async (): Promise<void> => {
    await authSignOut();
  };

  const value: IAuthContextType = {
    user,
    session,
    loading,
    signOut: handleSignOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
