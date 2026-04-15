import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { authorizeAdmin, authorizeUser, logApiError } from '@/app/api/_lib/route-utils';

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const error = await authorizeUser();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    const item = await prisma.activity.findUnique({
      where: { id },
      include: { lead: true }
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Atividade não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (err) {
    console.error('[GET /api/activities/:id] Error:', err);
    logApiError('/api/activities/:id', 'GET', err, { id });
    return NextResponse.json(
      { error: 'Erro ao buscar atividade' },
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

    const existingActivity = await prisma.activity.findUnique({
      where: { id }
    });

    if (!existingActivity) {
      return NextResponse.json(
        { error: 'Atividade não encontrada' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (data.description !== undefined) updateData.description = data.description ? String(data.description).trim() : null;
    if (data.completed !== undefined) updateData.completed = Boolean(data.completed);
    if (data.priority !== undefined) updateData.priority = String(data.priority).trim();
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.completed && !existingActivity.completedAt) updateData.completedAt = new Date();
    if (!data.completed && existingActivity.completedAt) updateData.completedAt = null;

    const updated = await prisma.activity.update({
      where: { id },
      data: updateData,
      include: { lead: true }
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[PATCH /api/activities/:id] Error:', err);
    logApiError('/api/activities/:id', 'PATCH', err, { id });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao atualizar atividade' },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    const existingActivity = await prisma.activity.findUnique({
      where: { id }
    });

    if (!existingActivity) {
      return NextResponse.json(
        { error: 'Atividade não encontrada' },
        { status: 404 }
      );
    }

    await prisma.activity.delete({
      where: { id }
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('[DELETE /api/activities/:id] Error:', err);
    logApiError('/api/activities/:id', 'DELETE', err, { id });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao deletar atividade' },
      { status: 400 }
    );
  }
}
