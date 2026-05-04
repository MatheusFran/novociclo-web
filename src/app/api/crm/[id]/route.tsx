import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { authorizeUser } from '@/app/api/_lib/route-utils';
// import { CrmColuna } from '@prisma/client';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const error = await authorizeUser();
    if (error) return NextResponse.json(error.body, { status: error.status });

    try {
        const data = await request.json();

        const current = await prisma.crmPipeline.findUnique({ where: { id } });
        if (!current) return NextResponse.json({ error: 'Pipeline não encontrado' }, { status: 404 });

        const novaColuna = data.coluna; // as CrmColuna;

        const updated = await prisma.crmPipeline.update({
            where: { id },
            data: {
                coluna: novaColuna,
                movimentos: {
                    create: {
                        colunaAnterior: current.coluna,
                        colunaAtual: novaColuna,
                    },
                },
            },
            include: { customer: true, movimentos: true },
        });

        return NextResponse.json(updated);
    } catch (err) {
        console.error('[PATCH /api/crm/[id]] Error:', err);
        return NextResponse.json({ error: 'Erro ao atualizar pipeline', details: (err as Error).message }, { status: 400 });
    }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const error = await authorizeUser();
    if (error) return NextResponse.json(error.body, { status: error.status });

    try {
        await prisma.crmPipeline.delete({ where: { id } });
        return new NextResponse(null, { status: 204 });
    } catch (err) {
        console.error('[DELETE /api/crm/[id]] Error:', err);
        return NextResponse.json({ error: 'Erro ao deletar pipeline' }, { status: 400 });
    }
}