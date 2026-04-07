/**
 * Handlers para API de Movimentações de Estoque
 */

import { NextRequest } from 'next/server';
import { requireAuth, requireRole, auditLog } from '@/server/auth/utils';
import { prisma } from '@/server/prisma';
import { UserRole } from '@/server/auth';
import { jsonResponse, errorResponse } from '@/server/api/routes/handlers';

export async function GET(req: NextRequest) {
  const auth = await requireAuth('GET /api/v1/stock-movements');
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    const type = url.searchParams.get('type');
    const productId = url.searchParams.get('productId');

    const where: any = {};
    if (type && type !== 'ALL') where.type = type;
    if (productId) where.productId = productId;

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: { product: true },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return jsonResponse({
      data: movements,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return errorResponse('Erro ao buscar movimentações de estoque', 500, error);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(UserRole.PRODUCAO, 'POST /api/v1/stock-movements');
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  try {
    const body = await req.json();

    if (!body.productId || !body.quantity || !body.type) {
      return errorResponse('productId, quantity e type são obrigatórios', 400);
    }

    // Verifica produto
    const product = await prisma.product.findUnique({
      where: { id: body.productId },
    });
    if (!product) {
      return errorResponse('Produto não encontrado', 404);
    }

    // Validação de quantidade
    if (body.type === 'SAIDA' && product.stock < body.quantity) {
      return errorResponse('Estoque insuficiente', 400);
    }

    // Atualiza estoque do produto
    const newStock = body.type === 'ENTRADA'
      ? product.stock + body.quantity
      : product.stock - body.quantity;

    const movement = await prisma.stockMovement.create({
      data: {
        id: body.id || `SM-${Date.now()}`,
        productId: body.productId,
        type: body.type,
        quantity: body.quantity,
        reason: body.reason || '',
        reference: body.reference || null,
        date: new Date(),
        relatedMovementId: body.relatedMovementId || null,
      },
      include: { product: true },
    });

    // Atualiza produto
    await prisma.product.update({
      where: { id: body.productId },
      data: { stock: newStock },
    });

    auditLog('STOCK_MOVEMENT_CREATED', (auth.session?.user as any).id, {
      movementId: movement.id,
      productId: body.productId,
      type: body.type,
      quantity: body.quantity,
    });

    return jsonResponse(movement, 201);
  } catch (error) {
    return errorResponse('Erro ao criar movimentação de estoque', 500, error);
  }
}

export async function PUT(req: NextRequest, params?: { id: string }) {
  const auth = await requireRole(
    UserRole.ADMIN,
    `PUT /api/v1/stock-movements/${params?.id}`
  );
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  if (!params?.id) return errorResponse('ID é obrigatório', 400);

  try {
    const movement = await prisma.stockMovement.findUnique({
      where: { id: params.id },
      include: { product: true },
    });
    if (!movement) return errorResponse('Movimentação não encontrada', 404);

    const body = await req.json();

    const updated = await prisma.stockMovement.update({
      where: { id: params.id },
      data: {
        reason: body.reason || movement.reason,
        reference: body.reference !== undefined ? body.reference : movement.reference,
      },
      include: { product: true },
    });

    auditLog('STOCK_MOVEMENT_UPDATED', (auth.session?.user as any).id, {
      movementId: params.id,
      changes: body,
    });

    return jsonResponse(updated);
  } catch (error) {
    return errorResponse('Erro ao atualizar movimentação de estoque', 500, error);
  }
}

export async function DELETE(req: NextRequest, params?: { id: string }) {
  const auth = await requireRole(UserRole.ADMIN, `DELETE /api/v1/stock-movements/${params?.id}`);
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  if (!params?.id) return errorResponse('ID é obrigatório', 400);

  try {
    const movement = await prisma.stockMovement.findUnique({
      where: { id: params.id },
      include: { product: true },
    });
    if (!movement) return errorResponse('Movimentação não encontrada', 404);

    // Reverte estoque
    const revertedQuantity = movement.type === 'ENTRADA'
      ? movement.product.stock - movement.quantity
      : movement.product.stock + movement.quantity;

    await prisma.product.update({
      where: { id: movement.productId },
      data: { stock: revertedQuantity },
    });

    await prisma.stockMovement.delete({
      where: { id: params.id },
    });

    auditLog('STOCK_MOVEMENT_DELETED', (auth.session?.user as any).id, {
      movementId: params.id,
    });

    return jsonResponse({ message: 'Movimentação deletada com sucesso' });
  } catch (error) {
    return errorResponse('Erro ao deletar movimentação de estoque', 500, error);
  }
}
