import { prisma } from '@/server/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '../_lib/route-utils';

// GET - Listar todos os carregamentos
export async function GET() {
    const error = await authorizeUser();
    if (error) return NextResponse.json(error.body, { status: error.status });

    try {
        const carregamentos = await prisma.carregamento.findMany({
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(carregamentos);
    } catch (err) {
        console.error('[GET /api/carregamento] Error:', err);
        return NextResponse.json([]);
    }
}

// POST - Criar novo carregamento
export async function POST(request: NextRequest) {
    const error = await authorizeUser();
    if (error) return NextResponse.json(error.body, { status: error.status });

    try {
        const data = await request.json();

        if (!data.grupoCarga) {
            return NextResponse.json(
                { error: 'grupoCarga são obrigatórios' },
                { status: 400 }
            );
        }

        const carregamento = await prisma.carregamento.create({
            data: {
                id: data.id,
                grupoCarga: data.grupoCarga,
                tipoCarga: data.tipoCarga,
                dataCarregamento: new Date(data.dataCarregamento),
                orderIds: data.orderIds || [],

                totalSacos: data.totalSacos || 0,
                totalPeso: data.totalPeso || 0,
                totalValor: data.totalValor || 0,
            }
        });

        return NextResponse.json(carregamento, { status: 201 });
    } catch (err) {
        console.error('[POST /api/carregamento] Error:', err);
        return NextResponse.json(
            { error: 'Erro ao criar carregamento', details: (err as Error).message },
            { status: 400 }
        );
    }
}
