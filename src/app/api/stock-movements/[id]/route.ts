import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { authorizeAdmin, authorizeUser, logApiError } from '@/app/api/_lib/route-utils';

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const error = await authorizeUser();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    const item = await prisma.stockMovement.findUnique({
      where: { id },
      include: { product: true }
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Movimentação não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (err) {
    console.error('[GET /api/stock-movements/:id] Error:', err);
    logApiError('/api/stock-movements/:id', 'GET', err, { id });
    return NextResponse.json(
      { error: 'Erro ao buscar movimentação' },
      { status: 500 }
    );
  }
}

export async function PATCH(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    const data = await _request.json();

    const existingMovement = await prisma.stockMovement.findUnique({
      where: { id }
    });

    if (!existingMovement) {
      return NextResponse.json(
        { error: 'Movimentação não encontrada' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (data.notes !== undefined) updateData.notes = data.notes ? String(data.notes).trim() : null;
    if (data.quantity !== undefined) updateData.quantity = Number(data.quantity);
    if (data.unitCost !== undefined) updateData.unitCost = Number(data.unitCost);
    if (data.totalCost !== undefined) updateData.totalCost = Number(data.totalCost);

    const updated = await prisma.stockMovement.update({
      where: { id },
      data: updateData,
      include: { product: true }
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[PATCH /api/stock-movements/:id] Error:', err);
    logApiError('/api/stock-movements/:id', 'PATCH', err, { id });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao atualizar movimentação' },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    const existingMovement = await prisma.stockMovement.findUnique({
      where: { id }
    });

    if (!existingMovement) {
      return NextResponse.json(
        { error: 'Movimentação não encontrada' },
        { status: 404 }
      );
    }

    await prisma.stockMovement.delete({
      where: { id }
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('[DELETE /api/stock-movements/:id] Error:', err);
    logApiError('/api/stock-movements/:id', 'DELETE', err, { id });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao deletar movimentação' },
      { status: 400 }
    );
  }
}
