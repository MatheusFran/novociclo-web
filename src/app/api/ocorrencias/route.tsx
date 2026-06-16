import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { authorizeUser, authorizeAdmin, logApiError } from '@/app/api/_lib/route-utils';

/**
 * GET /api/ocorrencias
 * Lista todas as ocorrências com filtros opcionais
 */
export async function GET(request: NextRequest) {
  const error = await authorizeUser();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('orderId');
    const carregamentoId = searchParams.get('carregamentoId');
    const status = searchParams.get('status');
    const tipo = searchParams.get('tipo');

    const where: any = {};
    if (orderId) where.orderId = orderId;
    if (carregamentoId) where.carregamentoId = carregamentoId;
    if (status) where.status = status;
    if (tipo) where.tipo = tipo;

    const ocorrencias = await prisma.ocorrencia.findMany({
      where,
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
      orderBy: {
        dataOcorrencia: 'desc',
      },
    });

    return NextResponse.json(ocorrencias);
  } catch (err) {
    console.error('[GET /api/ocorrencias] Error:', err);
    logApiError('/api/ocorrencias', 'GET', err, {});
    return NextResponse.json(
      { error: 'Erro ao buscar ocorrências' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ocorrencias
 * Criar nova ocorrência
 */
export async function POST(request: NextRequest) {
  const error = await authorizeUser();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    const data = await request.json();

    // Validações
    if (!data.titulo || !data.descricao) {
      return NextResponse.json(
        { error: 'Título e descrição são obrigatórios' },
        { status: 400 }
      );
    }

    // Se orderId foi fornecido, validar se existe
    if (data.orderId) {
      const order = await prisma.order.findUnique({
        where: { id: data.orderId },
        select: { id: true, customerName: true, city: true },
      });

      if (!order) {
        return NextResponse.json(
          { error: 'Pedido não encontrado' },
          { status: 404 }
        );
      }
    }

    // Se carregamentoId foi fornecido, validar se existe
    if (data.carregamentoId) {
      const carregamento = await prisma.carregamento.findUnique({
        where: { id: data.carregamentoId },
        select: { id: true, grupoCarga: true },
      });

      if (!carregamento) {
        return NextResponse.json(
          { error: 'Carregamento não encontrado' },
          { status: 404 }
        );
      }
    }

    // Ambos não podem ser vazios
    if (!data.orderId && !data.carregamentoId) {
      return NextResponse.json(
        { error: 'Informe um pedido ou um carregamento' },
        { status: 400 }
      );
    }

    const ocorrencia = await prisma.ocorrencia.create({
      data: {
        orderId: data.orderId || null,
        carregamentoId: data.carregamentoId || null,
        tipo: data.tipo || 'ENTREGA',
        titulo: String(data.titulo).trim(),
        descricao: String(data.descricao).trim(),
        status: data.status || 'PENDENTE',
        dataOcorrencia: data.dataOcorrencia ? new Date(data.dataOcorrencia) : new Date(),
        clienteNome: data.clienteNome ? String(data.clienteNome).trim() : null,
        motorista: data.motorista ? String(data.motorista).trim() : null,
        veiculo: data.veiculo ? String(data.veiculo).trim() : null,
        prioridade: data.prioridade || 'NORMAL',
        observacoes: data.observacoes ? String(data.observacoes).trim() : null,
      },
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

    return NextResponse.json(ocorrencia, { status: 201 });
  } catch (err) {
    console.error('[POST /api/ocorrencias] Error:', err);
    logApiError('/api/ocorrencias', 'POST', err, {});
    return NextResponse.json(
      { error: 'Erro ao criar ocorrência', details: (err as Error).message },
      { status: 400 }
    );
  }
}
