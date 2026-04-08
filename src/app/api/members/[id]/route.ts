import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { authorizeAdmin, logApiError } from '@/app/api/_lib/route-utils';

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const error = await authorizeAdmin();
    if (error) return NextResponse.json(error.body, { status: error.status });

    try {
        const item = await prisma.member.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                funcao: true,
                active: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!item) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });
        return NextResponse.json(item);
    } catch (err) {
        console.error('[GET /api/members/:id] Error:', err);
        logApiError('/api/members/:id', 'GET', err, { id });
        return NextResponse.json({ error: 'Erro ao buscar membro' }, { status: 500 });
    }
}

export async function PATCH(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const error = await authorizeAdmin();
    if (error) return NextResponse.json(error.body, { status: error.status });

    try {
        const data = await _request.json();
        if (!data || Object.keys(data).length === 0) {
            return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 });
        }

        // Validar se o membro existe
        const existingMember = await prisma.member.findUnique({
            where: { id }
        });

        if (!existingMember) {
            return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });
        }


        const updateData: any = {};
        if (data.name !== undefined) updateData.name = String(data.name).trim();
        if (data.funcao !== undefined) updateData.funcao = data.funcao ? String(data.funcao).trim() : null;
        if (data.active !== undefined) updateData.active = Boolean(data.active);

        const updated = await prisma.member.update({
            where: { id },
            data: updateData,
            select: { id: true, name: true, funcao: true, active: true, createdAt: true, updatedAt: true }
        });
        return NextResponse.json(updated);
    } catch (err) {
        console.error('[PATCH /api/members/:id] Error:', err);
        logApiError('/api/members/:id', 'PATCH', err, { id });
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Erro ao atualizar membro' },
            { status: 400 }
        );
    }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const error = await authorizeAdmin();
    if (error) return NextResponse.json(error.body, { status: error.status });

    try {
        // Validar se o membro existe antes de deletar
        const existingMember = await prisma.member.findUnique({
            where: { id }
        });

        if (!existingMember) {
            return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });
        }

        await prisma.member.update({
            where: { id },
            data: { active: false }
        });
        return new NextResponse(null, { status: 204 });
    } catch (err) {
        console.error('[DELETE /api/members/:id] Error:', err);
        logApiError('/api/members/:id', 'DELETE', err, { id });
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Erro ao deletar membro' },
            { status: 400 }
        );
    }
}