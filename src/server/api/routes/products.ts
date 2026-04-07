/**
 * Handlers para API de Produtos
 */

import { NextRequest } from 'next/server';
import { requireAuth, requireRole, apiSuccess, apiError, auditLog, validatePayload } from '@/server/auth/utils';
import { prisma } from '@/server/prisma';
import { UserRole } from '@/server/auth';
import { jsonResponse, errorResponse } from '@/server/api/routes/handlers';

/**
 * GET /api/v1/products
 * Retorna lista de produtos ativos
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth('GET /api/v1/products');
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    const category = url.searchParams.get('category');

    const where: any = { isActive: true };
    if (category) where.category = category;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          priceItems: { include: { priceTable: true } },
          stockMovements: { take: 5, orderBy: { date: 'desc' } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return jsonResponse({
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return errorResponse('Erro ao buscar produtos', 500, error);
  }
}

/**
 * POST /api/v1/products
 * Cria novo produto (apenas admin e comercial)
 */
export async function POST(req: NextRequest) {
  const auth = await requireRole(UserRole.COMERCIAL, 'POST /api/v1/products');
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  try {
    const body = await req.json();

    // Validação
    if (!body.id || !body.name || !body.category) {
      return errorResponse('ID, name e category são obrigatórios', 400);
    }

    // Verifica se já existe
    const existing = await prisma.product.findUnique({
      where: { id: body.id },
    });
    if (existing) {
      return errorResponse('Produto com este ID já existe', 409);
    }

    const product = await prisma.product.create({
      data: {
        id: body.id,
        name: body.name,
        descricao: body.descricao,
        category: body.category,
        uom: body.uom || 'un',
        price: parseFloat(body.price) || 0,
        avgCost: parseFloat(body.avgCost) || 0,
        weight: parseFloat(body.weight) || 0,
        minStock: parseInt(body.minStock) || 0,
        stock: parseInt(body.stock) || 0,
        isRawMaterial: body.isRawMaterial || false,
        isActive: body.isActive !== false,
      },
      include: { priceItems: true },
    });

    auditLog('PRODUCT_CREATED', (auth.session?.user as any).id, {
      productId: product.id,
      name: product.name,
    });

    return jsonResponse(product, 201);
  } catch (error) {
    return errorResponse('Erro ao criar produto', 500, error);
  }
}

/**
 * PUT /api/v1/products/[id]
 */
export async function PUT(req: NextRequest, params?: { id: string }) {
  const auth = await requireRole(UserRole.COMERCIAL, `PUT /api/v1/products/${params?.id}`);
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  if (!params?.id) return errorResponse('ID é obrigatório', 400);

  try {
    const body = await req.json();

    const product = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!product) return errorResponse('Produto não encontrado', 404);

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: {
        name: body.name || product.name,
        descricao: body.descricao !== undefined ? body.descricao : product.descricao,
        category: body.category || product.category,
        uom: body.uom || product.uom,
        price: body.price !== undefined ? parseFloat(body.price) : product.price,
        avgCost: body.avgCost !== undefined ? parseFloat(body.avgCost) : product.avgCost,
        weight: body.weight !== undefined ? parseFloat(body.weight) : product.weight,
        minStock: body.minStock !== undefined ? parseInt(body.minStock) : product.minStock,
        stock: body.stock !== undefined ? parseInt(body.stock) : product.stock,
        isRawMaterial: body.isRawMaterial !== undefined ? body.isRawMaterial : product.isRawMaterial,
        isActive: body.isActive !== undefined ? body.isActive : product.isActive,
      },
      include: { priceItems: true },
    });

    auditLog('PRODUCT_UPDATED', (auth.session?.user as any).id, {
      productId: params.id,
      changes: body,
    });

    return jsonResponse(updated);
  } catch (error) {
    return errorResponse('Erro ao atualizar produto', 500, error);
  }
}

/**
 * DELETE /api/v1/products/[id]
 */
export async function DELETE(req: NextRequest, params?: { id: string }) {
  const auth = await requireRole(UserRole.ADMIN, `DELETE /api/v1/products/${params?.id}`);
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  if (!params?.id) return errorResponse('ID é obrigatório', 400);

  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!product) return errorResponse('Produto não encontrado', 404);

    // Soft delete (marcar como inativo)
    const updated = await prisma.product.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    auditLog('PRODUCT_DELETED', (auth.session?.user as any).id, {
      productId: params.id,
      name: product.name,
    });

    return jsonResponse({ message: 'Produto deletado com sucesso' });
  } catch (error) {
    return errorResponse('Erro ao deletar produto', 500, error);
  }
}
