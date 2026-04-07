/**
 * Utilitários de autenticação no servidor
 * Usados para validações nas rotas da API
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, UserRole, ROLE_PERMISSIONS, AUTH_ERRORS } from './index';
import type { AuthResponse } from './types';

/**
 * Valida se a sessão existe
 */
export async function validateSession() {
  const session = await getServerSession(authOptions);
  return session;
}

/**
 * Valida se o usuário está autenticado
 * Retorna erro 401 se não estiver
 */
export async function requireAuth(route: string = 'unknown') {
  const session = await validateSession();

  if (!session?.user) {
    console.warn(`[API AUTH] ${route} - Não autenticado`);
    return {
      success: false,
      status: 401,
      body: { error: AUTH_ERRORS.UNAUTHORIZED },
    };
  }

  return { success: true, session };
}

/**
 * Valida se o usuário tem um role específico
 * Retorna erro 403 se não tiver
 */
export async function requireRole(role: UserRole, route: string = 'unknown') {
  const auth = await requireAuth(route);

  if (!auth.success) {
    return auth;
  }

  const session = auth.session!;
  const userRole = (session.user as any).role as UserRole;

  if (userRole !== role) {
    console.warn(`[API AUTH] ${route} - Role ${userRole} não permitido. Requerido: ${role}`);
    return {
      success: false,
      status: 403,
      body: { error: AUTH_ERRORS.FORBIDDEN },
    };
  }

  return { success: true, session };
}

/**
 * Valida se o usuário tem algum dos roles especificados
 * Retorna erro 403 se não tiver
 */
export async function requireAnyRole(roles: UserRole[], route: string = 'unknown') {
  const auth = await requireAuth(route);

  if (!auth.success) {
    return auth;
  }

  const session = auth.session!;
  const userRole = (session.user as any).role as UserRole;

  if (!roles.includes(userRole)) {
    console.warn(
      `[API AUTH] ${route} - Role ${userRole} não permitido. Requerido um de: ${roles.join(', ')}`
    );
    return {
      success: false,
      status: 403,
      body: { error: AUTH_ERRORS.FORBIDDEN },
    };
  }

  return { success: true, session };
}

/**
 * Valida se o usuário tem uma permissão específica
 */
export async function requirePermission(permission: string, route: string = 'unknown') {
  const auth = await requireAuth(route);

  if (!auth.success) {
    return auth;
  }

  const session = auth.session!;
  const userRole = (session.user as any).role as UserRole;
  const userPermissions = ROLE_PERMISSIONS[userRole] || [];

  if (!userPermissions.includes(permission)) {
    console.warn(`[API AUTH] ${route} - Permissão ${permission} negada para ${userRole}`);
    return {
      success: false,
      status: 403,
      body: { error: AUTH_ERRORS.FORBIDDEN },
    };
  }

  return { success: true, session };
}

/**
 * Formata resposta de sucesso da API
 */
export function apiSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Formata resposta de erro da API
 */
export function apiError(message: string, status: number = 400, details?: any) {
  console.error(`[API ERROR] ${message}`, details);
  return NextResponse.json(
    {
      error: message,
      ...(details && { details }),
    },
    { status }
  );
}

/**
 * Log de auditoria para ações sensíveis
 */
export function auditLog(action: string, userId: string, details?: any) {
  console.log(`[AUDIT] ${action} - User: ${userId}`, details);
  // Aqui você pode integrar com um serviço de logging centralizado
  // como LogRocket, Sentry, ou um banco de dados de auditoria
}

/**
 * Valida payload da requisição
 */
export function validatePayload<T>(payload: any, validator: (data: any) => T | null): { valid: true; data: T } | { valid: false; error: string } {
  try {
    const data = validator(payload);
    if (!data) {
      return { valid: false, error: 'Payload inválido' };
    }
    return { valid: true, data };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Erro na validação' };
  }
}
