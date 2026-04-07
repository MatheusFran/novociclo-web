'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { SessionProvider, useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';
import { User, AuthState } from '@/lib/types';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthStateProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const user = useMemo<User | null>(() => {
    if (!session?.user) return null;

    return {
      id: (session.user as any).id,
      email: session.user.email ?? '',
      name: session.user.name ?? '',
      role: (session.user as any).role,
      active: (session.user as any).active ?? true,
      createdAt: (session.user as any).createdAt ?? new Date().toISOString(),
      updatedAt: (session.user as any).updatedAt ?? new Date().toISOString(),
    } as User;
  }, [session]);

  const value: AuthContextType = useMemo(
    () => ({
      user,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'loading',
      signIn: async (email: string, password: string) => {
        const result = await nextAuthSignIn('credentials', {
          redirect: false,
          email,
          password,
        });

        if (!result || !result.ok) {
          throw new Error((result as any)?.error ?? 'Erro ao autenticar');
        }
      },
      signOut: async () => {
        await nextAuthSignOut({ redirect: false });
      },
      hasRole: (role: string) => {
        return user?.role === role;
      },
      hasAnyRole: (roles: string[]) => {
        return user ? roles.includes(user.role) : false;
      },
    }),
    [status, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthStateProvider>{children}</AuthStateProvider>
    </SessionProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
