import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { authorizeUser, logApiError } from '@/app/api/_lib/route-utils';

/**
 * GET /api/ocorrencias/carregamentos-disponiveis
 * Lista carregamentos disponíveis para registrar ocorrências
 */
export async function GET(request: NextRequest) {
  const error = await authorizeUser();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    const carregamentos = await prisma.carregamento.findMany({
      where: {
        // Carregamentos que ainda não foram entregues
        status: {
          notIn: ['ENTREGUE', 'CANCELADO'],
        },
      },
      select: {
        id: true,
        grupoCarga: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            pedidos: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(carregamentos);
  } catch (err) {
    console.error('[GET /api/ocorrencias/carregamentos-disponiveis] Error:', err);
    logApiError('/api/ocorrencias/carregamentos-disponiveis', 'GET', err, {});
    return NextResponse.json(
      { error: 'Erro ao buscar carregamentos disponíveis' },
      { status: 500 }
    );
  }
}
