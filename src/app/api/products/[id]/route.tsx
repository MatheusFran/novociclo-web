import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { authorizeAdmin, logApiError } from '@/app/api/_lib/route-utils';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const error = await authorizeAdmin('/api/products/:id', 'GET');
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    const item = await prisma.product.findFirst({
      where: { id: params.id }
    });
    if (!item) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    return NextResponse.json(item);
  } catch (err) {
    console.error('[GET /api/products/[id]] Error:', err);
    logApiError('/api/products/:id', 'GET', err, { params });
    return NextResponse.json({ error: 'Unable to fetch Product' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const error = await authorizeAdmin('/api/products/:id', 'PATCH');
  if (error) return NextResponse.json(error.body, { status: error.status });

  const data = await request.json();

  if (!data || Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  try {
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = String(data.name).trim();
    if (data.category !== undefined) updateData.category = String(data.category).trim();
    if (data.uom !== undefined) updateData.uom = String(data.uom).trim();
    if (data.weight !== undefined) updateData.weight = isNaN(Number(data.weight)) ? undefined : Number(data.weight);

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: updateData
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[PATCH /api/products/[id]] Error:', err);
    logApiError('/api/products/:id', 'PATCH', err, { params });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao atualizar produto' },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    await prisma.product.delete({
      where: { id: params.id }
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    logApiError('/api/products/:id', 'DELETE', err, { params });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 400 }
    );
  }
}