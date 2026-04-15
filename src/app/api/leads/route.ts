import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { authorizeAdmin, authorizeUser, logApiError } from '@/app/api/_lib/route-utils';

export async function GET() {
  const error = await authorizeUser();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    const items = await prisma.lead.findMany({
      include: { activities: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(items);
  } catch (err) {
    console.error('[GET /api/leads] Error:', err);
    logApiError('/api/leads', 'GET', err, {});
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  const data = await request.json();

  if (!data.name) {
    return NextResponse.json(
      { error: 'Nome é obrigatório' },
      { status: 400 }
    );
  }

  try {
    const item = await prisma.lead.create({
      data: {
        name: String(data.name).trim(),
        email: data.email ? String(data.email).trim() : null,
        phone: data.phone ? String(data.phone).trim() : null,
        company: data.company ? String(data.company).trim() : null,
        city: data.city ? String(data.city).trim() : null,
        status: data.status || 'NOVO',
        source: data.source || null,
        estimatedValue: data.estimatedValue ? Number(data.estimatedValue) : null,
        notes: data.notes ? String(data.notes).trim() : null,
      },
      include: { activities: true }
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error('[POST /api/leads] Error:', err);
    logApiError('/api/leads', 'POST', err, { data });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao criar lead' },
      { status: 400 }
    );
  }
}
