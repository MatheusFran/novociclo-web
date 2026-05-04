import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';

// GET - Buscar uma movimentação específica
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const movement = await prisma.stockMovement.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!movement) {
      return NextResponse.json(
        { error: 'Movimentação não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(movement);
  } catch (error) {
    console.error('Erro ao buscar movimentação:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar movimentação' },
      { status: 500 }
    );
  }
}

// DELETE - Deletar uma movimentação (com aviso de auditoria)
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const movement = await prisma.stockMovement.findUnique({
      where: { id },
    });

    if (!movement) {
      return NextResponse.json(
        { error: 'Movimentação não encontrada' },
        { status: 404 }
      );
    }

    // Deletar movimentação
    await prisma.stockMovement.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Movimentação deletada com sucesso' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao deletar movimentação:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar movimentação' },
      { status: 500 }
    );
  }
}
