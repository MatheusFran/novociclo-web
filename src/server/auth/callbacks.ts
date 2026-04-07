/**
 * Callbacks de NextAuth (JWT e Session)
 */

import { JWT } from 'next-auth/jwt';
import { Session } from 'next-auth';
import type { User } from 'next-auth';
import { JWTToken, AuthSession } from './types';
import { UserRole } from './constants';

/**
 * Callback JWT - Adiciona dados do usuário ao token
 */
export async function jwtCallback({ token, user }: { token: JWT; user?: User | any }): Promise<JWT> {
  if (user) {
    // Primeiro login - adiciona dados do usuário ao token
    token.sub = user.id;
    (token as any).id = user.id;
    (token as any).role = user.role as UserRole;
    (token as any).active = user.active;
    (token as any).name = user.name;
    (token as any).email = user.email;
  }
  return token;
}

/**
 * Callback Session - Injeta dados do token na sessão
 */
export async function sessionCallback({
  session,
  token,
}: {
  session: Session;
  token: JWT;
}): Promise<AuthSession> {
  if (session.user) {
    (session.user as any).id = token.sub || (token as any).id;
    (session.user as any).role = (token as any).role as UserRole;
    (session.user as any).active = (token as any).active;
  }
  return session as AuthSession;
}

/**
 * Callback Sign In - Hook para lógica adicional de login
 */
export async function signInCallback({
  user,
  account,
  profile,
  email,
  credentials,
}: {
  user?: any;
  account?: any;
  profile?: any;
  email?: any;
  credentials?: any;
}): Promise<boolean | string> {
  // Aqui você pode adicionar lógica adicional como:
  // - Atualizar lastLogin
  // - Verificar 2FA
  // - Registrar tentativas de login
  // - Validar IP
  
  if (user?.active === false) {
    return '/login?error=USER_INACTIVE';
  }

  return true;
}

/**
 * Callback Sign Out - Hook para lógica de logout
 */
export async function signOutCallback(): Promise<boolean | string> {
  // Aqui você pode adicionar lógica adicional como:
  // - Registrar logout
  // - Invalidar tokens
  // - Limpar cache
  
  return true;
}

/**
 * Callback Redirect - Redireciona após login/logout
 */
export async function redirectCallback({
  url,
  baseUrl,
}: {
  url: string;
  baseUrl: string;
}): Promise<string> {
  // Permite callbacks relativos ou absolutos do mesmo domínio
  if (url.startsWith('/')) return `${baseUrl}${url}`;
  
  // Permite callbacks do mesmo domínio
  if (new URL(url).origin === baseUrl) return url;
  
  return baseUrl;
}
