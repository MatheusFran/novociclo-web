import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { authorizeAdmin, authorizeUser, logApiError } from '@/app/api/_lib/route-utils';

export async function GET() {
  const error = await authorizeUser();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    const items = await prisma.product.findMany();
    return NextResponse.json(items);
  } catch (err) {
    console.error('[GET /api/products] Error:', err);
    logApiError('/api/products', 'GET', err, {});
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  const data = await request.json();

  if (!data.id || !data.name || !data.category) {
    return NextResponse.json(
      { error: 'ID, Nome e Categoria são campos obrigatórios' },
      { status: 400 }
    );
  }

  try {
    const item = await prisma.product.create({
      data: {
        id: String(data.id).trim(),
        name: String(data.name).trim(),
        category: String(data.category).trim(),
        uom: String(data.uom || 'sc').trim(),
        weight: isNaN(Number(data.weight)) ? 0 : Number(data.weight),
      }
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error('[POST /api/products] Error:', err);
    logApiError('/api/products', 'POST', err, { data });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao criar produto' },
      { status: 400 }
    );
  }
}