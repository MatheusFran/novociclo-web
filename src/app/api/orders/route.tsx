import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { authorizeAdmin } from '@/app/api/_lib/route-utils';

export async function GET() {
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    const orders = await prisma.order.findMany({
      include: {
        items: true,
        customer: true,
      },
    });
    return NextResponse.json(orders);
  } catch (err) {
    console.error('[GET /api/orders] Error:', err);
    // Se houver erro, retorna array vazio
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  const data = await request.json();
  if (!data || Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid order data' }, { status: 400 });
  }

  try {
    let customerId: string;
    const existingCustomer = data.cpfcnpj
      ? await prisma.customer.findFirst({ where: { cpfcnpj: data.cpfcnpj } })
      : null;

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const newCustomer = await prisma.customer.create({
        data: {
          name: data.customerName || 'Sem Nome',
          cpfcnpj: data.cpfcnpj || null,
          phone: data.customerPhone || null,
          email: data.customerEmail || null,
          address: data.customerAddress || null,
          city: data.city || null,
        },
      });
      customerId = newCustomer.id;
    }

    // payload corrigido conforme schema
    const payload: any = {
      id: data.id ?? `OR-${Date.now()}`,
      customerId,
      customerName: data.customerName ?? 'Sem Nome',
      customerEmail: data.customerEmail ?? null,
      customerPhone: data.customerPhone ?? null,
      customerAddress: data.customerAddress ?? null,
      customerDocument: data.customerDocument ?? null,
      city: data.city ?? null,
      status: data.status ?? 'PENDENTE',
      paymentCondition: data.paymentCondition ?? 'A_VISTA_ENTREGA',
      seller: data.seller ?? 'Sistema',
      closedBy: data.closedBy ?? null,
      user: data.user ?? 'Admin',
      priceTableId: data.priceTableId ?? null,
      totalValue: data.totalValue ?? 0,
      totalWeight: data.totalWeight ?? 0,
      observations: data.observations ?? null,
      assignedVehicleId: null,
      assignedDriverId: null,
      departureTime: null,
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
      deliveredAt: null,
      scheduledDeliveryDate: null,
      loteId: null,
      loteDate: null,
      approvedAt: null,
      viewedAt: null,
      productionStage: null,
    };


    // nested write obrigatório para OrderItem[]
    if (Array.isArray(data.items) && data.items.length > 0) {
      // valida produtos existentes
      const productIds = data.items.map((i: any) => i.productId);
      const existingProducts = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true },
      });
      const validProductIds = existingProducts.map((p: { id: any; }) => p.id);

      const invalidItems = data.items.filter((i: any) => !validProductIds.includes(i.productId));
      if (invalidItems.length > 0) {
        return NextResponse.json({ error: `Invalid product IDs in items: ${invalidItems.map((i: any) => i.productId).join(', ')}` }, { status: 400 });
      }

      payload.items = {
        create: data.items.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity ?? 0,
          price: item.price ?? 0,
          finalPrice: item.finalPrice ?? 0,
          discount: item.discount ?? 0,
        })),
      };
    }

    const order = await prisma.order.create({
      data: payload,
      include: { items: true, customer: true },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    console.error('[POST /api/orders] Error:', err);
    return NextResponse.json({ error: 'Unable to create Order', details: (err as Error).message }, { status: 400 });
  }
}