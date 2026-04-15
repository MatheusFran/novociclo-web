import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { authorizeAdmin, authorizeUser, logApiError } from '@/app/api/_lib/route-utils';

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const error = await authorizeUser();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    const item = await prisma.lead.findUnique({
      where: { id },
      include: { activities: true }
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Lead não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (err) {
    console.error('[GET /api/leads/:id] Error:', err);
    logApiError('/api/leads/:id', 'GET', err, { id });
    return NextResponse.json(
      { error: 'Erro ao buscar lead' },
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

    const existingLead = await prisma.lead.findUnique({
      where: { id }
    });

    if (!existingLead) {
      return NextResponse.json(
        { error: 'Lead não encontrado' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = String(data.name).trim();
    if (data.email !== undefined) updateData.email = data.email ? String(data.email).trim() : null;
    if (data.phone !== undefined) updateData.phone = data.phone ? String(data.phone).trim() : null;
    if (data.company !== undefined) updateData.company = data.company ? String(data.company).trim() : null;
    if (data.city !== undefined) updateData.city = data.city ? String(data.city).trim() : null;
    if (data.status !== undefined) updateData.status = String(data.status).trim();
    if (data.source !== undefined) updateData.source = data.source ? String(data.source).trim() : null;
    if (data.estimatedValue !== undefined) updateData.estimatedValue = data.estimatedValue ? Number(data.estimatedValue) : null;
    if (data.notes !== undefined) updateData.notes = data.notes ? String(data.notes).trim() : null;

    const updated = await prisma.lead.update({
      where: { id },
      data: updateData,
      include: { activities: true }
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[PATCH /api/leads/:id] Error:', err);
    logApiError('/api/leads/:id', 'PATCH', err, { id });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao atualizar lead' },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    const existingLead = await prisma.lead.findUnique({
      where: { id }
    });

    if (!existingLead) {
      return NextResponse.json(
        { error: 'Lead não encontrado' },
        { status: 404 }
      );
    }

    await prisma.lead.delete({
      where: { id }
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('[DELETE /api/leads/:id] Error:', err);
    logApiError('/api/leads/:id', 'DELETE', err, { id });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao deletar lead' },
      { status: 400 }
    );
  }
}
