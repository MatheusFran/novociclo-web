/**
 * Handlers de rotas para API de eventos
 */

type HandlerConfig = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  handler: (req: Request, params?: any) => Promise<Response>;
};

/**
 * Combina múltiplos handlers em um único handler de rota
 * Útil para consolidar GET, POST, etc em um único arquivo
 */
export function createRouteHandler(handlers: Record<string, (req: Request, params?: any) => Promise<Response>>) {
  return async (req: Request, context?: any) => {
    const method = req.method;
    const handler = handlers[method];

    if (!handler) {
      return new Response(
        JSON.stringify({ error: `Método ${method} não suportado` }),
        {
          status: 405,
          headers: { 'Content-Type': 'application/json', Allow: Object.keys(handlers).join(', ') },
        }
      );
    }

    try {
      return await handler(req, context?.params);
    } catch (error) {
      console.error(`[API] Erro em ${method} ${req.url}:`, error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };
}

/**
 * Wrapper para transformar handlers em Route Handlers do Next.js 13+
 */
export function apiRoute(handler: (req: Request, params?: any) => Promise<Response>) {
  return async (req: Request, context?: any) => {
    try {
      return await handler(req, context?.params);
    } catch (error) {
      console.error(`[API] Erro em ${req.method} ${req.url}:`, error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };
}

/**
 * Extrai parâmetros de query da requisição
 */
export function getQueryParams(request: Request): Record<string, string | string[]> {
  const url = new URL(request.url);
  const params: Record<string, string | string[]> = {};

  url.searchParams.forEach((value, key) => {
    if (params[key]) {
      if (Array.isArray(params[key])) {
        (params[key] as string[]).push(value);
      } else {
        params[key] = [params[key] as string, value];
      }
    } else {
      params[key] = value;
    }
  });

  return params;
}

/**
 * Extrai corpo JSON ou retorna null
 */
export async function getBodyJson(request: Request): Promise<any> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * Resposta JSON padronizada
 */
export function jsonResponse<T>(data: T, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Resposta de erro padronizada
 */
export function errorResponse(message: string, status: number = 400, details?: any): Response {
  return new Response(
    JSON.stringify({
      error: message,
      ...(details && { details }),
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
