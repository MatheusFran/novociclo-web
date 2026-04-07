/**
 * Configuração centralizada de autenticação
 * Esta é a estrutura principal do NextAuth
 */

import { NextAuthOptions } from 'next-auth';
import { credentialsProvider } from './providers';
import { jwtCallback, sessionCallback, signInCallback, redirectCallback } from './callbacks';

export const authOptions: NextAuthOptions = {
  providers: [credentialsProvider],
  callbacks: {
    jwt: jwtCallback,
    session: sessionCallback,
    signIn: signInCallback,
    redirect: redirectCallback,
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 dias
    updateAge: 24 * 60 * 60, // atualiza a cada dia
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  pages: {
    signIn: '/login',
    error: '/login',
    signOut: '/login',
  },
  debug: process.env.NODE_ENV === 'development',
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log(`[AUTH EVENT] Novo login: ${user?.email}`);
    },
    async signOut({ token }) {
      console.log(`[AUTH EVENT] Logout: ${token?.email}`);
    },
    async session({ session, token }) {
      console.log(`[AUTH EVENT] Session ativa: ${session?.user?.email}`);
    },
  },
};

// Exporta tudo relacionado a autenticação
export * from './constants';
export * from './types';
export * from './password';
export { credentialsProvider } from './providers';
export { jwtCallback, sessionCallback, signInCallback, redirectCallback } from './callbacks';
