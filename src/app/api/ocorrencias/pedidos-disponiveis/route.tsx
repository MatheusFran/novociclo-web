import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { authorizeUser, logApiError } from '@/app/api/_lib/route-utils';

/**
 * GET /api/ocorrencias/pedidos-disponiveis
 * Lista pedidos disponíveis para registrar ocorrências
 * Filtra apenas pedidos em status PRONTO_LOGISTICA ou ENTREGA
 */
export async function GET(request: NextRequest) {
  const error = await authorizeUser();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    const pedidos = await prisma.order.findMany({
      where: {
        status: {
          in: ['PRONTO_LOGISTICA', 'ENTREGA'],
        },
      },
      select: {
        id: true,
        customerName: true,
        city: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(pedidos);
  } catch (err) {
    console.error('[GET /api/ocorrencias/pedidos-disponiveis] Error:', err);
    logApiError('/api/ocorrencias/pedidos-disponiveis', 'GET', err, {});
    return NextResponse.json(
      { error: 'Erro ao buscar pedidos disponíveis' },
      { status: 500 }
    );
  }
}
