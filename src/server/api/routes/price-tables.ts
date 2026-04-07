/**
 * Handlers para API de Tabelas de Preço
 */

import { NextRequest } from 'next/server';
import { requireRole, auditLog } from '@/server/auth/utils';
import { prisma } from '@/server/prisma';
import { UserRole } from '@/server/auth';
import { jsonResponse, errorResponse } from '@/server/api/routes/handlers';

export async function GET(req: NextRequest) {
  const auth = await requireRole(
    UserRole.COMERCIAL,
    'GET /api/v1/price-tables'
  );
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const [priceTables, total] = await Promise.all([
      prisma.priceTable.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: { take: 5, orderBy: { createdAt: 'desc' } },
        },
      }),
      prisma.priceTable.count(),
    ]);

    return jsonResponse({
      data: priceTables,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return errorResponse('Erro ao buscar tabelas de preço', 500, error);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(UserRole.COMERCIAL, 'POST /api/v1/price-tables');
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  try {
    const body = await req.json();

    if (!body.description || !body.items?.length) {
      return errorResponse('description e items são obrigatórios', 400);
    }

    // Valida itens
    const productIds = body.items.map((i: any) => i.productId);
    const existingProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });
    const validProductIds = existingProducts.map(p => p.id);
    const invalidItems = body.items.filter((i: any) => !validProductIds.includes(i.productId));
    if (invalidItems.length > 0) {
      return errorResponse(`Produtos inválidos: ${invalidItems.map((i: any) => i.productId).join(', ')}`, 400);
    }

    const priceTable = await prisma.priceTable.create({
      data: {
        id: body.id || `PT-${Date.now()}`,
        description: body.description,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        minOrder: body.minOrder || 0,
        maxDiscount: body.maxDiscount || 0,
        items: {
          create: body.items.map((item: any) => ({
            productId: item.productId,
            price: parseFloat(item.price),
            discount: parseFloat(item.discount) || 0,
            minQuantity: parseInt(item.minQuantity) || 1,
          })),
        },
      },
      include: { items: true },
    });

    auditLog('PRICE_TABLE_CREATED', (auth.session?.user as any).id, {
      priceTableId: priceTable.id,
      description: priceTable.description,
      itemsCount: priceTable.items.length,
    });

    return jsonResponse(priceTable, 201);
  } catch (error) {
    return errorResponse('Erro ao criar tabela de preço', 500, error);
  }
}

export async function PUT(req: NextRequest, params?: { id: string }) {
  const auth = await requireRole(
    UserRole.COMERCIAL,
    `PUT /api/v1/price-tables/${params?.id}`
  );
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  if (!params?.id) return errorResponse('ID é obrigatório', 400);

  try {
    const priceTable = await prisma.priceTable.findUnique({
      where: { id: params.id },
      include: { items: true },
    });
    if (!priceTable) return errorResponse('Tabela de preço não encontrada', 404);

    const body = await req.json();

    const updated = await prisma.priceTable.update({
      where: { id: params.id },
      data: {
        description: body.description || priceTable.description,
        startDate: body.startDate ? new Date(body.startDate) : priceTable.startDate,
        endDate: body.endDate ? new Date(body.endDate) : priceTable.endDate,
        minOrder: body.minOrder !== undefined ? body.minOrder : priceTable.minOrder,
        maxDiscount: body.maxDiscount !== undefined ? parseFloat(body.maxDiscount) : priceTable.maxDiscount,
      },
      include: { items: true },
    });

    auditLog('PRICE_TABLE_UPDATED', (auth.session?.user as any).id, {
      priceTableId: params.id,
      changes: body,
    });

    return jsonResponse(updated);
  } catch (error) {
    return errorResponse('Erro ao atualizar tabela de preço', 500, error);
  }
}

export async function DELETE(req: NextRequest, params?: { id: string }) {
  const auth = await requireRole(
    UserRole.ADMIN,
    `DELETE /api/v1/price-tables/${params?.id}`
  );
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  if (!params?.id) return errorResponse('ID é obrigatório', 400);

  try {
    const priceTable = await prisma.priceTable.findUnique({
      where: { id: params.id },
    });
    if (!priceTable) return errorResponse('Tabela de preço não encontrada', 404);

    await prisma.priceTable.delete({
      where: { id: params.id },
    });

    auditLog('PRICE_TABLE_DELETED', (auth.session?.user as any).id, {
      priceTableId: params.id,
    });

    return jsonResponse({ message: 'Tabela de preço deletada com sucesso' });
  } catch (error) {
    return errorResponse('Erro ao deletar tabela de preço', 500, error);
  }
}
