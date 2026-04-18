import { prisma } from '@/server/prisma';
import { NextRequest, NextResponse } from 'next/server';

// PATCH - Atualizar meta
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { revenue, tons, notes } = body;
    const goalId = (await params).id;

    const goal = await prisma.salesGoal.update({
      where: { id: goalId },
      data: {
        ...(revenue !== undefined && { revenue: parseFloat(revenue) }),
        ...(tons !== undefined && { tons: parseFloat(tons) }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json(goal, { status: 200 });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Meta não encontrada' },
        { status: 404 }
      );
    }
    console.error('Erro ao atualizar meta:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar meta' },
      { status: 500 }
    );
  }
}

// DELETE - Deletar meta
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const goalId = (await params).id;

    await prisma.salesGoal.delete({
      where: { id: goalId },
    });

    return NextResponse.json(
      { message: 'Meta deletada com sucesso' },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Meta não encontrada' },
        { status: 404 }
      );
    }
    console.error('Erro ao deletar meta:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar meta' },
      { status: 500 }
    );
  }
}
