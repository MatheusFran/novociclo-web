/**
 * Handlers para API de Pedidos
 */

import { NextRequest } from 'next/server';
import { requireAuth, requireAnyRole, auditLog } from '@/server/auth/utils';
import { prisma } from '@/server/prisma';
import { UserRole } from '@/server/auth';
import { jsonResponse, errorResponse } from '@/server/api/routes/handlers';

export async function GET(req: NextRequest) {
  const auth = await requireAuth('GET /api/v1/orders');
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    const status = url.searchParams.get('status');
    const city = url.searchParams.get('city');
    const seller = url.searchParams.get('seller');

    const where: any = {};
    if (status && status !== 'ALL') where.status = status;
    if (city) where.city = city;
    if (seller) where.seller = seller;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: { include: { product: true } },
          customer: true,
          priceTable: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    return jsonResponse({
      data: orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return errorResponse('Erro ao buscar pedidos', 500, error);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(UserRole.COMERCIAL, 'POST /api/v1/orders');
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  try {
    const body = await req.json();

    if (!body.customerId || !body.city || !body.items?.length) {
      return errorResponse('customerId, city e items são obrigatórios', 400);
    }

    // Verifica se cliente existe
    const customer = await prisma.customer.findUnique({
      where: { id: body.customerId },
    });
    if (!customer) {
      return errorResponse('Cliente não encontrado', 404);
    }

    // Valida produtos
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

    const order = await prisma.order.create({
      data: {
        id: body.id || `OR-${Date.now()}`,
        customerId: body.customerId,
        customerName: customer.name,
        customerDocument: customer.document,
        customerEmail: body.customerEmail || customer.email,
        customerPhone: body.customerPhone || customer.phone,
        customerAddress: body.customerAddress || customer.address,
        city: body.city,
        status: body.status || 'PENDENTE',
        paymentCondition: body.paymentCondition || 'A_VISTA_ENTREGA',
        seller: body.seller,
        user: (auth.session?.user as any).name,
        totalValue: body.totalValue || 0,
        totalWeight: body.totalWeight || 0,
        priceTableId: body.priceTableId,
        deliveryDate: new Date(body.deliveryDate),
        items: {
          create: body.items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            finalPrice: item.finalPrice || item.price,
            discount: item.discount || 0,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });

    auditLog('ORDER_CREATED', (auth.session?.user as any).id, {
      orderId: order.id,
      customerId: body.customerId,
      totalValue: order.totalValue,
    });

    return jsonResponse(order, 201);
  } catch (error) {
    return errorResponse('Erro ao criar pedido', 500, error);
  }
}

export async function PUT(req: NextRequest, params?: { id: string }) {
  const auth = await requireAuth(`PUT /api/v1/orders/${params?.id}`);
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  if (!params?.id) return errorResponse('ID é obrigatório', 400);

  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
    });
    if (!order) return errorResponse('Pedido não encontrado', 404);

    const body = await req.json();

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: {
        status: body.status || order.status,
        productionStage: body.productionStage || order.productionStage,
        deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : order.deliveryDate,
        totalValue: body.totalValue !== undefined ? body.totalValue : order.totalValue,
        totalWeight: body.totalWeight !== undefined ? body.totalWeight : order.totalWeight,
        assignedVehicleId: body.assignedVehicleId !== undefined ? body.assignedVehicleId : order.assignedVehicleId,
        assignedDriverId: body.assignedDriverId !== undefined ? body.assignedDriverId : order.assignedDriverId,
        approvedAt: body.approvedAt ? new Date(body.approvedAt) : order.approvedAt,
        deliveredAt: body.deliveredAt ? new Date(body.deliveredAt) : order.deliveredAt,
      },
      include: { items: { include: { product: true } } },
    });

    auditLog('ORDER_UPDATED', (auth.session?.user as any).id, {
      orderId: params.id,
      changes: body,
    });

    return jsonResponse(updated);
  } catch (error) {
    return errorResponse('Erro ao atualizar pedido', 500, error);
  }
}

export async function DELETE(req: NextRequest, params?: { id: string }) {
  const auth = await requireRole(UserRole.ADMIN, `DELETE /api/v1/orders/${params?.id}`);
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  if (!params?.id) return errorResponse('ID é obrigatório', 400);

  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
    });
    if (!order) return errorResponse('Pedido não encontrado', 404);

    await prisma.order.delete({
      where: { id: params.id },
    });

    auditLog('ORDER_DELETED', (auth.session?.user as any).id, {
      orderId: params.id,
    });

    return jsonResponse({ message: 'Pedido deletado com sucesso' });
  } catch (error) {
    return errorResponse('Erro ao deletar pedido', 500, error);
  }
}
