import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';

export async function authorizeUser(route = 'unknown route', method = 'unknown method') {
  const session = await getServerSession(authOptions);
  if (!session) {
    console.warn(`[API AUTH] ${method} ${route} - unauthorized`);
    return { status: 401, body: { error: 'Unauthorized' } };
  }
  return null;
}

export async function authorizeAdmin(route = 'unknown route', method = 'unknown method') {
  const session = await getServerSession(authOptions);
  if (!session) {
    console.warn(`[API AUTH] ${method} ${route} - unauthorized`);
    return { status: 401, body: { error: 'Unauthorized' } };
  }

  if ((session.user as any).role !== 'ADMIN') {
    console.warn(`[API AUTH] ${method} ${route} - forbidden for role ${(session.user as any).role}`);
    return { status: 403, body: { error: 'Forbidden' } };
  }

  return null;
}

export function logApiError(route: string, method: string, error: unknown, details?: any) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[API ERROR] ${method} ${route} - ${message}`, details);
}
