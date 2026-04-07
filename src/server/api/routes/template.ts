/**
 * Template para criar novos endpoints de API
 * Copie este arquivo e adapte conforme necessário
 */

import { NextRequest } from 'next/server';
import { requireAuth, requireRole, UserRole } from '@/server/auth';
import { jsonResponse, errorResponse, getBodyJson } from '@/server/api/routes/handlers';
import { prisma } from '@/server/prisma';
import { validate, ValidationSchema } from '@/server/api/middleware/validation';
import { auditLog } from '@/server/auth/utils';

// ─── Validação de Entrada ──────────────────────────────────────
const createSchema: ValidationSchema = {
  // Exemplo: 
  // name: { required: true, type: 'string', minLength: 3, maxLength: 100 },
  // email: { required: true, type: 'email' },
  // price: { required: true, type: 'number', min: 0 },
};

// ─── GET: Listar Recursos ──────────────────────────────────────
export async function GET(req: NextRequest) {
  // Valida autenticação
  const auth = await requireAuth('GET /api/v1/seu-recurso');
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  try {
    // Para paginação:
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Exemplo com Prisma:
    // const [items, total] = await Promise.all([
    //   prisma.suaModel.findMany({
    //     skip,
    //     take: limit,
    //     orderBy: { createdAt: 'desc' },
    //   }),
    //   prisma.suaModel.count(),
    // ]);

    return jsonResponse({
      // data: items,
      // pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      data: [],
      pagination: { page, limit, total: 0, pages: 0 },
    });
  } catch (error) {
    return errorResponse('Erro ao buscar recursos', 500, error);
  }
}

// ─── POST: Criar Recurso ────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Valida autenticação (pode usar requireRole para limitar)
  const auth = await requireAuth('POST /api/v1/seu-recurso');
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  try {
    const body = await getBodyJson(req);

    // Valida entrada
    // const validation = validate(body, createSchema);
    // if (!validation.valid) {
    //   return errorResponse('Validação falhou', 400, validation.errors);
    // }

    // Lógica de criação:
    // const item = await prisma.suaModel.create({
    //   data: body,
    // });

    // Auditoria:
    auditLog('ITEM_CREATED', (auth.session?.user as any).id, {
      // itemId: item.id,
    });

    return jsonResponse(
      {
        // data: item,
        message: 'Recurso criado com sucesso',
      },
      201
    );
  } catch (error) {
    return errorResponse('Erro ao criar recurso', 500, error);
  }
}

// ─── PUT: Atualizar Recurso ────────────────────────────────────
export async function PUT(req: NextRequest, params?: { id: string }) {
  // Valida autenticação
  const auth = await requireAuth(`PUT /api/v1/seu-recurso/${params?.id}`);
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  if (!params?.id) {
    return errorResponse('ID é obrigatório', 400);
  }

  try {
    const body = await getBodyJson(req);

    // Valida entrada (opcional para PUT)
    // const validation = validate(body, createSchema);
    // if (!validation.valid) {
    //   return errorResponse('Validação falhou', 400, validation.errors);
    // }

    // Busca recurso existente:
    // const item = await prisma.suaModel.findUnique({
    //   where: { id: params.id },
    // });
    // if (!item) return errorResponse('Recurso não encontrado', 404);

    // Atualiza:
    // const updated = await prisma.suaModel.update({
    //   where: { id: params.id },
    //   data: body,
    // });

    // Auditoria:
    auditLog('ITEM_UPDATED', (auth.session?.user as any).id, {
      itemId: params.id,
      // changes: body,
    });

    return jsonResponse({
      // data: updated,
      message: 'Recurso atualizado com sucesso',
    });
  } catch (error) {
    return errorResponse('Erro ao atualizar recurso', 500, error);
  }
}

// ─── DELETE: Deletar Recurso ────────────────────────────────────
export async function DELETE(req: NextRequest, params?: { id: string }) {
  // Valida autenticação (geralmente requer admin)
  const auth = await requireAuth(`DELETE /api/v1/seu-recurso/${params?.id}`);
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  if (!params?.id) {
    return errorResponse('ID é obrigatório', 400);
  }

  try {
    // Busca recurso:
    // const item = await prisma.suaModel.findUnique({
    //   where: { id: params.id },
    // });
    // if (!item) return errorResponse('Recurso não encontrado', 404);

    // Deleta:
    // await prisma.suaModel.delete({
    //   where: { id: params.id },
    // });

    // Auditoria:
    auditLog('ITEM_DELETED', (auth.session?.user as any).id, {
      itemId: params.id,
    });

    return jsonResponse({
      message: 'Recurso deletado com sucesso',
    });
  } catch (error) {
    return errorResponse('Erro ao deletar recurso', 500, error);
  }
}
