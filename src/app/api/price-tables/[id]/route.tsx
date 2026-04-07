import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { authorizeAdmin } from '@/app/api/_lib/route-utils';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  const item = await prisma.priceTable.findUnique({
    where: { id: params.id },
    include: { prices: true },
  });

  if (!item) return NextResponse.json({ error: 'PriceTable not found' }, { status: 404 });

  return NextResponse.json({
    ...item,
    prices: Object.fromEntries(item.prices.map((p: any) => [p.productId, p.price])),
  });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const data = await request.json();

  try {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.prices !== undefined) {
      updateData.prices = {
        deleteMany: {},
        create: Object.entries(data.prices).map(([productId, price]) => ({
          productId,
          price,
        })),
      };
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await prisma.priceTable.update({
      where: { id: params.id },
      data: updateData,
      include: { prices: true },
    });

    return NextResponse.json({
      ...updated,
      prices: Object.fromEntries(updated.prices.map((p: any) => [p.productId, p.price])),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to update PriceTable' },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    await prisma.priceTable.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: 'Unable to delete PriceTable' }, { status: 400 });
  }
}
