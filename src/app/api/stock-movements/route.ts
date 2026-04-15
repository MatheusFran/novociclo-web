import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { authorizeAdmin, authorizeUser, logApiError } from '@/app/api/_lib/route-utils';

export async function GET() {
  const error = await authorizeUser();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    const items = await prisma.stockMovement.findMany({
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(items);
  } catch (err) {
    console.error('[GET /api/stock-movements] Error:', err);
    logApiError('/api/stock-movements', 'GET', err, {});
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  const data = await request.json();

  if (!data.productId || !data.type || data.quantity === undefined) {
    return NextResponse.json(
      { error: 'productId, type e quantity são obrigatórios' },
      { status: 400 }
    );
  }

  try {
    // Validar produto existe
    const product = await prisma.product.findUnique({
      where: { id: data.productId }
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    const item = await prisma.stockMovement.create({
      data: {
        productId: String(data.productId).trim(),
        orderId: data.orderId ? String(data.orderId).trim() : null,
        type: String(data.type).trim(),
        reason: String(data.reason || 'AJUSTE').trim(),
        quantity: Number(data.quantity),
        unitCost: Number(data.unitCost || 0),
        totalCost: Number(data.totalCost || 0),
        lot: data.lot ? String(data.lot).trim() : null,
        city: data.city ? String(data.city).trim() : null,
        notes: data.notes ? String(data.notes).trim() : null,
      },
      include: { product: true }
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error('[POST /api/stock-movements] Error:', err);
    logApiError('/api/stock-movements', 'POST', err, { data });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao criar movimentação' },
      { status: 400 }
    );
  }
}
