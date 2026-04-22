import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { authorizeAdmin, authorizeUser } from '@/app/api/_lib/route-utils';

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const error = await authorizeUser();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, customer: true },
    });

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    return NextResponse.json(order);
  } catch (err) {
    console.error('[GET /api/orders/[id]] Error:', err);
    return NextResponse.json({ error: 'Unable to fetch Order' }, { status: 500 });
  }
}

export async function PATCH(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  const data = await _request.json();
  if (!data || Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  try {
    const payload: any = {};

    if (data.name !== undefined) payload.customerName = data.customerName;
    if (data.email !== undefined) payload.customerEmail = data.customerEmail;
    if (data.phone !== undefined) payload.customerPhone = data.customerPhone;
    if (data.address !== undefined) payload.customerAddress = data.customerAddress;
    if (data.cpfcnpj !== undefined) payload.customerDocument = data.customerDocument;
    if (data.city !== undefined) payload.city = data.city;
    if (data.status !== undefined) payload.status = data.status;
    if (data.productionStage !== undefined) payload.productionStage = data.productionStage;
    if (data.paymentCondition !== undefined) payload.paymentCondition = data.paymentCondition;
    if (data.seller !== undefined) payload.seller = data.seller;
    if (data.closedBy !== undefined) payload.closedBy = data.closedBy;
    if (data.priceTableId !== undefined) payload.priceTableId = data.priceTableId;
    if (data.totalValue !== undefined) payload.totalValue = data.totalValue;
    if (data.totalWeight !== undefined) payload.totalWeight = data.totalWeight;
    if (data.observations !== undefined) payload.observations = data.observations;
    if (data.assignedVehicleId !== undefined) payload.assignedVehicleId = data.assignedVehicleId;
    if (data.assignedDriverId !== undefined) payload.assignedDriverId = data.assignedDriverId;
    if (data.acceptedAt !== undefined) payload.acceptedAt = data.acceptedAt ? new Date(data.acceptedAt) : null;
    if (data.deliveryDate !== undefined) payload.deliveryDate = data.deliveryDate ? new Date(data.deliveryDate) : null;
    if (data.scheduledDeliveryDate !== undefined) payload.scheduledDeliveryDate = data.scheduledDeliveryDate ? new Date(data.scheduledDeliveryDate) : null;
    if (data.departureTime !== undefined) payload.departureTime = data.departureTime ? new Date(data.departureTime) : null;
    if (data.deliveredAt !== undefined) payload.deliveredAt = data.deliveredAt ? new Date(data.deliveredAt) : null;
    if (data.approvedAt !== undefined) payload.approvedAt = data.approvedAt ? new Date(data.approvedAt) : null;
    if (data.invoicedAt !== undefined) payload.invoicedAt = data.invoicedAt ? new Date(data.invoicedAt) : null;
    if (data.rejectedAt !== undefined) payload.rejectedAt = data.rejectedAt ? new Date(data.rejectedAt) : null;
    if (data.loteId !== undefined) payload.loteId = data.loteId;
    if (data.loteDate !== undefined) payload.loteDate = data.loteDate ? new Date(data.loteDate) : null;

    if (Array.isArray(data.items)) {
      payload.items = {
        deleteMany: {},
        create: data.items.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          finalPrice: item.finalPrice ?? 0,
          discount: item.discount ?? 0,
        })),
      };
    }

    const updated = await prisma.order.update({
      where: { id },
      data: payload,
      include: { items: true, customer: true },
    });

    // Baixa automática de estoque quando passa para PRODUCAO
    if (data.status === 'PRODUCAO') {
      const warnings: string[] = [];

      for (const item of updated.items) {
        const movements = await prisma.stockMovement.findMany({
          where: { productId: item.productId },
        });

        const saldo = movements.reduce((acc: number, m: { type: string; quantity: number; }) =>
          m.type === 'ENTRADA' ? acc + m.quantity : acc - m.quantity, 0
        );

        if (saldo < item.quantity) {
          warnings.push(`Produto ${item.productId}: saldo ${saldo}, necessário ${item.quantity}`);
        }

        const entradas = movements.filter((m: { type: string; }) => m.type === 'ENTRADA');
        const avgCost = entradas.length > 0
          ? entradas.reduce((acc: any, m: { unitCost: any; }) => acc + m.unitCost, 0) / entradas.length
          : 0;

        const existingSaida = await prisma.stockMovement.findFirst({
          where: { relatedOrderId: id, productId: item.productId, type: 'SAIDA' },
        });

        if (!existingSaida) {
          await prisma.stockMovement.create({
            data: {
              productId: item.productId,
              type: 'SAIDA',
              quantity: item.quantity,
              unitCost: avgCost,
              totalCost: avgCost * item.quantity,
              reason: `Pedido ${id}`,
              relatedOrderId: id,
            },
          });
        }
      }

      if (warnings.length > 0) {
        return NextResponse.json({ ...updated, stockWarnings: warnings });
      }
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[PATCH /api/orders/[id]] Error:', err);
    return NextResponse.json({ error: 'Unable to update Order', details: (err as Error).message }, { status: 400 });
  }
}
export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    await prisma.order.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('[DELETE /api/orders/[id]] Error:', err);
    return NextResponse.json({ error: 'Unable to delete Order' }, { status: 400 });
  }
}