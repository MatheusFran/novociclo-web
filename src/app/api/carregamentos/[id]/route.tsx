import { prisma } from '@/server/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/app/api/_lib/route-utils';

// ─────────────────────────────────────────────
// PATCH - ATUALIZAR
// ─────────────────────────────────────────────
export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;

    const error = await authorizeUser();
    if (error) return NextResponse.json(error.body, { status: error.status });

    try {
        const data = await request.json();

        const current = await prisma.carregamento.findUnique({
            where: { id },
        });

        if (!current) {
            return NextResponse.json(
                { error: 'Carregamento não encontrado' },
                { status: 404 }
            );
        }

        const updated = await prisma.carregamento.update({
            where: { id },
            data: {
                cityGroups: data.cityGroups ?? current.cityGroups,
                routes: data.routes ?? current.routes,
                observations: data.observations ?? current.observations,

                totalWeightKg: data.totalWeightKg ?? current.totalWeightKg,
                totalPalets: data.totalPalets ?? current.totalPalets,
                totalRoutes: data.totalRoutes ?? current.totalRoutes,
            },
        });

        return NextResponse.json(updated);

    } catch (err) {
        console.error('[PATCH /api/carregamentos/[id]]', err);
        return NextResponse.json(
            { error: 'Erro ao atualizar carregamento' },
            { status: 400 }
        );
    }
}

// ─────────────────────────────────────────────
// DELETE - REMOVER
// ─────────────────────────────────────────────
export async function DELETE(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;

    const error = await authorizeUser();
    if (error) return NextResponse.json(error.body, { status: error.status });

    try {
        await prisma.carregamento.delete({
            where: { id },
        });

        return new NextResponse(null, { status: 204 });

    } catch (err) {
        console.error('[DELETE /api/carregamentos/[id]]', err);
        return NextResponse.json(
            { error: 'Erro ao deletar carregamento' },
            { status: 400 }
        );
    }
}