import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { authorizeAdmin } from '@/app/api/_lib/route-utils';

export async function GET() {
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  const tables = await prisma.priceTable.findMany({
    include: { prices: true },
  });

  return NextResponse.json(
    tables.map((t: any) => ({
      ...t,
      prices: Object.fromEntries(
        t.prices.map((p: any) => [p.productId, p.price])
      ),
    }))
  );
}

export async function POST(request: NextRequest) {
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  const data = await request.json();

  if (!data || !data.name || typeof data.prices !== 'object') {
    return NextResponse.json({ error: 'Invalid price table data' }, { status: 400 });
  }

  try {
    const created = await prisma.priceTable.create({
      data: {
        id: data.id ?? `PT-${Date.now()}`,
        name: data.name,
        prices: {
          create: Object.entries(data.prices).map(([productId, price]) => ({
            productId,
            price,
          })),
        },
      },
      include: {
        prices: true,
      },
    });

    return NextResponse.json(
      {
        ...created,
        prices: Object.fromEntries(created.prices.map((p: any) => [p.productId, p.price])),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to create PriceTable' },
      { status: 400 }
    );
  }
}
