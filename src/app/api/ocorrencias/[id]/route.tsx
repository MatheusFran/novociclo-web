import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { authorizeUser, logApiError } from '@/app/api/_lib/route-utils';

/**
 * GET /api/ocorrencias/[id]
 * Buscar ocorrência específica
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const error = await authorizeUser();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    const { id } = await context.params;

    const ocorrencia = await prisma.ocorrencia.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            customerName: true,
            city: true,
            status: true,
          },
        },
        carregamento: {
          select: {
            id: true,
            grupoCarga: true,
            tipoCarga: true,
          },
        },
      },
    });

    if (!ocorrencia) {
      return NextResponse.json(
        { error: 'Ocorrência não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(ocorrencia);
  } catch (err) {
    console.error('[GET /api/ocorrencias/:id] Error:', err);
    logApiError('/api/ocorrencias/:id', 'GET', err, {});
    return NextResponse.json(
      { error: 'Erro ao buscar ocorrência' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/ocorrencias/[id]
 * Atualizar ocorrência
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const error = await authorizeUser();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    const { id } = await context.params;
    const data = await request.json();

    // Verificar se existe
    const existing = await prisma.ocorrencia.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Ocorrência não encontrada' },
        { status: 404 }
      );
    }

    // Construir payload de atualização
    const updateData: any = {};

    if (data.status !== undefined) updateData.status = data.status;
    if (data.titulo !== undefined) updateData.titulo = String(data.titulo).trim();
    if (data.descricao !== undefined) updateData.descricao = String(data.descricao).trim();
    if (data.tipo !== undefined) updateData.tipo = data.tipo;
    if (data.clienteNome !== undefined) updateData.clienteNome = data.clienteNome ? String(data.clienteNome).trim() : null;
    if (data.motorista !== undefined) updateData.motorista = data.motorista ? String(data.motorista).trim() : null;
    if (data.veiculo !== undefined) updateData.veiculo = data.veiculo ? String(data.veiculo).trim() : null;
    if (data.resolucao !== undefined) updateData.resolucao = data.resolucao ? String(data.resolucao).trim() : null;
    if (data.resolvidoPor !== undefined) updateData.resolvidoPor = data.resolvidoPor ? String(data.resolvidoPor).trim() : null;
    if (data.prioridade !== undefined) updateData.prioridade = data.prioridade;
    if (data.observacoes !== undefined) updateData.observacoes = data.observacoes ? String(data.observacoes).trim() : null;

    // Se status for "RESOLVIDO" e não houver data de resolução, adicionar
    if (data.status === 'RESOLVIDO' && !data.dataResolucao) {
      updateData.dataResolucao = new Date();
    } else if (data.dataResolucao !== undefined) {
      updateData.dataResolucao = data.dataResolucao ? new Date(data.dataResolucao) : null;
    }

    const ocorrencia = await prisma.ocorrencia.update({
      where: { id },
      data: updateData,
      include: {
        order: {
          select: {
            id: true,
            customerName: true,
            city: true,
            status: true,
          },
        },
        carregamento: {
          select: {
            id: true,
            grupoCarga: true,
            tipoCarga: true,
          },
        },
      },
    });

    return NextResponse.json(ocorrencia);
  } catch (err) {
    console.error('[PATCH /api/ocorrencias/:id] Error:', err);
    logApiError('/api/ocorrencias/:id', 'PATCH', err, {});
    return NextResponse.json(
      { error: 'Erro ao atualizar ocorrência', details: (err as Error).message },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/ocorrencias/[id]
 * Deletar ocorrência
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const error = await authorizeUser();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    const { id } = await context.params;

    // Verificar se existe
    const existing = await prisma.ocorrencia.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Ocorrência não encontrada' },
        { status: 404 }
      );
    }

    await prisma.ocorrencia.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/ocorrencias/:id] Error:', err);
    logApiError('/api/ocorrencias/:id', 'DELETE', err, {});
    return NextResponse.json(
      { error: 'Erro ao deletar ocorrência' },
      { status: 500 }
    );
  }
}
