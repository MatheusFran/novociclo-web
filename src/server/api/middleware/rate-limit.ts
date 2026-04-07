/**
 * Middleware de rate limiting para proteção contra abuso
 */

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const store: RateLimitStore = {};

export interface RateLimitConfig {
  interval: number; // em segundos
  maxRequests: number;
}

export const DEFAULT_LIMIT: RateLimitConfig = {
  interval: 60, // 1 minuto
  maxRequests: 100,
};

/**
 * Cria um identificador único para rate limiting
 */
function getIdentifier(ip: string, userId?: string): string {
  return `${ip}:${userId || 'anonymous'}`;
}

/**
 * Limpa entradas expiradas do store
 */
function cleanup() {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}

/**
 * Verifica e atualiza rate limit
 */
export function checkRateLimit(
  ip: string,
  config: RateLimitConfig = DEFAULT_LIMIT,
  userId?: string
): {
  limited: boolean;
  remaining: number;
  resetTime: number;
} {
  cleanup();

  const identifier = getIdentifier(ip, userId);
  const now = Date.now();
  const entry = store[identifier];

  if (!entry || entry.resetTime < now) {
    // Novo período
    store[identifier] = {
      count: 1,
      resetTime: now + config.interval * 1000,
    };
    return {
      limited: false,
      remaining: config.maxRequests - 1,
      resetTime: store[identifier].resetTime,
    };
  }

  // Período existente
  entry.count++;

  const remaining = Math.max(0, config.maxRequests - entry.count);
  const limited = entry.count > config.maxRequests;

  return {
    limited,
    remaining,
    resetTime: entry.resetTime,
  };
}

/**
 * Middleware de rate limiting para NextJS
 */
export async function withRateLimit(
  request: Request,
  config: RateLimitConfig = DEFAULT_LIMIT,
  userId?: string
) {
  // Extrai IP do request
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const limit = checkRateLimit(ip, config, userId);

  const headers = {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': limit.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(limit.resetTime / 1000).toString(),
  };

  if (limit.limited) {
    return {
      limited: true,
      headers,
      response: new Response(
        JSON.stringify({
          error: 'Too many requests',
          retryAfter: Math.ceil((limit.resetTime - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((limit.resetTime - Date.now()) / 1000).toString(),
            ...headers,
          },
        }
      ),
    };
  }

  return {
    limited: false,
    headers,
    response: null,
  };
}
