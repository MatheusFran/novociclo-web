import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { authorizeAdmin, logApiError } from '@/app/api/_lib/route-utils';

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const error = await authorizeAdmin('/api/products/:id', 'GET');
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    const item = await prisma.product.findFirst({
      where: { id }
    });
    if (!item) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    return NextResponse.json(item);
  } catch (err) {
    console.error('[GET /api/products/[id]] Error:', err);
    logApiError('/api/products/:id', 'GET', err, { id });
    return NextResponse.json({ error: 'Unable to fetch Product' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
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
      where: { id },
      data: updateData
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[PATCH /api/products/[id]] Error:', err);
    logApiError('/api/products/:id', 'PATCH', err, { id });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao atualizar produto' },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    // Verificar se há itens de pedido relacionados
    const orderItemsCount = await prisma.orderItem.count({
      where: { productId: id }
    });

    if (orderItemsCount > 0) {
      return NextResponse.json(
        {
          error: `Não é possível deletar este produto`,
          reason: `Existem ${orderItemsCount} item(ns) de pedido relacionado(s) a este produto`,
          relatedCount: orderItemsCount
        },
        { status: 409 }
      );
    }

    // Verificar se há itens em tabelas de preço
    const priceItemsCount = await prisma.priceTableItem.count({
      where: { productId: id }
    });

    if (priceItemsCount > 0) {
      return NextResponse.json(
        {
          error: `Não é possível deletar este produto`,
          reason: `Este produto está em ${priceItemsCount} tabela(s) de preço`,
          relatedCount: priceItemsCount
        },
        { status: 409 }
      );
    }

    await prisma.product.delete({
      where: { id }
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    logApiError('/api/products/:id', 'DELETE', err, { id });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 400 }
    );
  }
}