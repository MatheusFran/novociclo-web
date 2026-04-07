/**
 * Middleware de autenticação para API
 * Valida se o usuário está autenticado
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, AUTH_ERRORS } from '../auth';

export async function withAuth(handler: (req: NextRequest, session: any) => Promise<Response>) {
  return async (req: NextRequest) => {
    try {
      const session = await getServerSession(authOptions);

      if (!session?.user) {
        return new Response(JSON.stringify({ error: AUTH_ERRORS.UNAUTHORIZED }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return handler(req, session);
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };
}

/**
 * Middleware que requer um role específico
 */
export function withRole(requiredRole: string, handler: (req: NextRequest, session: any) => Promise<Response>) {
  return async (req: NextRequest) => {
    try {
      const session = await getServerSession(authOptions);

      if (!session?.user) {
        return new Response(JSON.stringify({ error: AUTH_ERRORS.UNAUTHORIZED }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const userRole = (session.user as any).role;
      if (userRole !== requiredRole) {
        return new Response(JSON.stringify({ error: AUTH_ERRORS.FORBIDDEN }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return handler(req, session);
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };
}

/**
 * Middleware que requer qualquer um dos roles especificados
 */
export function withRoles(requiredRoles: string[], handler: (req: NextRequest, session: any) => Promise<Response>) {
  return async (req: NextRequest) => {
    try {
      const session = await getServerSession(authOptions);

      if (!session?.user) {
        return new Response(JSON.stringify({ error: AUTH_ERRORS.UNAUTHORIZED }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const userRole = (session.user as any).role;
      if (!requiredRoles.includes(userRole)) {
        return new Response(JSON.stringify({ error: AUTH_ERRORS.FORBIDDEN }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return handler(req, session);
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };
}
