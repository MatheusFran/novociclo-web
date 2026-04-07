/**
 * Handlers para API de usuários
 * Organiza lógica de GET, POST, PUT, DELETE em um arquivo
 */

import { NextRequest } from 'next/server';
import { requireAuth, requireRole, apiSuccess, apiError, auditLog, validatePayload } from '@/server/auth/utils';
import { prisma } from '@/server/prisma';
import { UserRole } from '@/server/auth';
import { hashPassword, validatePassword } from '@/server/auth/password';
import { jsonResponse, errorResponse, getQueryParams, getBodyJson } from './handlers';

/**
 * GET /api/v1/users
 * Retorna lista de usuários (apenas admin)
 */
export async function GET(req: NextRequest) {
  const auth = await requireRole(UserRole.ADMIN, 'GET /api/v1/users');
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);

    return jsonResponse({
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return errorResponse('Erro ao buscar usuários', 500, error);
  }
}

/**
 * POST /api/v1/users
 * Cria novo usuário (apenas admin)
 */
export async function POST(req: NextRequest) {
  const auth = await requireRole(UserRole.ADMIN, 'POST /api/v1/users');
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  try {
    const body = await getBodyJson(req);

    // Validação de entrada
    if (!body.email || !body.name || !body.password || !body.role) {
      return errorResponse('Email, nome, senha e role são obrigatórios', 400);
    }

    // Valida senha
    const passwordValidation = validatePassword(body.password);
    if (!passwordValidation.valid) {
      return errorResponse('Senha fraca', 400, { errors: passwordValidation.errors });
    }

    // Verifica se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      return errorResponse('Email já cadastrado', 409);
    }

    // Hash da senha
    const hashedPassword = await hashPassword(body.password);

    // Cria usuário
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        password: hashedPassword,
        role: body.role || UserRole.COMERCIAL,
        active: body.active !== false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    // Auditoria
    auditLog('USER_CREATED', (auth.session?.user as any).id, { userId: user.id, email: user.email });

    return jsonResponse(user, 201);
  } catch (error) {
    return errorResponse('Erro ao criar usuário', 500, error);
  }
}

/**
 * PUT /api/v1/users/[id]
 * Atualiza usuário (apenas admin)
 */
export async function PUT(req: NextRequest, params?: { id: string }) {
  const auth = await requireRole(UserRole.ADMIN, `PUT /api/v1/users/${params?.id}`);
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  if (!params?.id) {
    return errorResponse('ID do usuário é obrigatório', 400);
  }

  try {
    const body = await getBodyJson(req);

    // Busca usuário
    const user = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!user) {
      return errorResponse('Usuário não encontrado', 404);
    }

    // Dados para atualizar
    const updateData: any = {};

    if (body.name) updateData.name = body.name;
    if (body.email && body.email !== user.email) {
      // Verifica se email já existe
      const existing = await prisma.user.findUnique({
        where: { email: body.email },
      });
      if (existing) {
        return errorResponse('Email já cadastrado', 409);
      }
      updateData.email = body.email;
    }
    if (body.role) updateData.role = body.role;
    if (body.active !== undefined) updateData.active = body.active;
    if (body.password) {
      const passwordValidation = validatePassword(body.password);
      if (!passwordValidation.valid) {
        return errorResponse('Senha fraca', 400, { errors: passwordValidation.errors });
      }
      updateData.password = await hashPassword(body.password);
    }

    // Atualiza usuário
    const updated = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        updatedAt: true,
      },
    });

    // Auditoria
    auditLog('USER_UPDATED', (auth.session?.user as any).id, { userId: params.id, changes: updateData });

    return jsonResponse(updated);
  } catch (error) {
    return errorResponse('Erro ao atualizar usuário', 500, error);
  }
}

/**
 * DELETE /api/v1/users/[id]
 * Deleta usuário (apenas admin)
 */
export async function DELETE(req: NextRequest, params?: { id: string }) {
  const auth = await requireRole(UserRole.ADMIN, `DELETE /api/v1/users/${params?.id}`);
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  if (!params?.id) {
    return errorResponse('ID do usuário é obrigatório', 400);
  }

  try {
    // Verifica se usuário existe
    const user = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!user) {
      return errorResponse('Usuário não encontrado', 404);
    }

    // Evita deletar o próprio usuário
    if (params.id === (auth.session?.user as any).id) {
      return errorResponse('Você não pode deletar sua própria conta', 403);
    }

    // Deleta usuário
    await prisma.user.delete({
      where: { id: params.id },
    });

    // Auditoria
    auditLog('USER_DELETED', (auth.session?.user as any).id, { userId: params.id, email: user.email });

    return jsonResponse({ message: 'Usuário deletado com sucesso' });
  } catch (error) {
    return errorResponse('Erro ao deletar usuário', 500, error);
  }
}
