import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { authorizeUser, authorizeAdmin } from '@/app/api/_lib/route-utils';

export async function GET() {
    const error = await authorizeUser();
    if (error) return NextResponse.json(error.body, { status: error.status });

    try {
        const pipelines = await prisma.crmPipeline.findMany({
            include: {
                customer: true,
                movimentos: { orderBy: { createdAt: 'asc' } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(pipelines);
    } catch (err) {
        console.error('[GET /api/crm] Error:', err);
        return NextResponse.json([]);
    }
}

export async function POST(request: NextRequest) {
    const error = await authorizeUser();
    if (error) return NextResponse.json(error.body, { status: error.status });

    try {
        const data = await request.json();

        if (!data.customerId || !data.objetivo) {
            return NextResponse.json({ error: 'customerId e objetivo são obrigatórios' }, { status: 400 });
        }

        const pipeline = await prisma.crmPipeline.create({
            data: {
                customerId: data.customerId,
                objetivo: data.objetivo,
                coluna: 'ENTRADA',
                movimentos: {
                    create: { colunaAnterior: null, colunaAtual: 'ENTRADA' },
                },
            },
            include: { customer: true, movimentos: true },
        });

        return NextResponse.json(pipeline, { status: 201 });
    } catch (err) {
        console.error('[POST /api/crm] Error:', err);
        return NextResponse.json({ error: 'Erro ao criar pipeline', details: (err as Error).message }, { status: 400 });
    }
}