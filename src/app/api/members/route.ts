import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { authorizeAdmin, logApiError } from '@/app/api/_lib/route-utils';

export async function GET() {
    const error = await authorizeAdmin();
    if (error) return NextResponse.json(error.body, { status: error.status });

    try {
        const items = await prisma.member.findMany({
            where: { active: true },
            select: {
                id: true,
                name: true,
                funcao: true,
                active: true,
                createdAt: true,
                updatedAt: true
            }
        });
        return NextResponse.json(items);
    } catch (err) {
        console.error('[GET /api/members] Error:', err);
        logApiError('/api/members', 'GET', err, {});
        return NextResponse.json({ error: 'Erro ao buscar membros' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const error = await authorizeAdmin();
    if (error) return NextResponse.json(error.body, { status: error.status });

    try {
        const data = await request.json();

        if (!data.name) {
            return NextResponse.json(
                { error: 'Nome é obrigatório' },
                { status: 400 }
            );
        }


        const item = await prisma.member.create({
            data: {
                name: String(data.name).trim(),
                funcao: data.funcao ? String(data.funcao).trim() : null,
                active: true,
            },
            select: { id: true, name: true, funcao: true, active: true, createdAt: true, updatedAt: true }
        });
        return NextResponse.json(item, { status: 201 });
    } catch (err) {
        console.error('[POST /api/members] Error:', err);
        logApiError('/api/members', 'POST', err, { body: 'JSON body' });
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Erro ao criar membro' },
            { status: 400 }
        );
    }
}