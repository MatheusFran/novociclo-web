import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { authorizeAdmin, authorizeUser } from '@/app/api/_lib/route-utils';

export async function GET() {
  const error = await authorizeUser();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    const items = await prisma.customer.findMany();
    return NextResponse.json(items);
  } catch (err) {
    console.error('[GET /api/customers] Error:', err);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  const data = await request.json();

  if (!data.name) {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
  }

  try {
    const item = await prisma.customer.create({
      data: {
        name: String(data.name).trim(),
        cpfcnpj: data.cpfcnpj ? String(data.cpfcnpj).trim() : null,
        IE: data.IE ? String(data.IE).trim() : null,
        phone: data.phone ? String(data.phone).trim() : null,
        email: data.email ? String(data.email).trim() : null,
        address: data.address ? String(data.address).trim() : null,
        city: data.city ? String(data.city).trim() : null,
      }
    });
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error('[POST /api/customers] Error:', err);
    return NextResponse.json({ error: 'Unable to create Customer', details: (err as Error).message }, { status: 400 });
  }
}