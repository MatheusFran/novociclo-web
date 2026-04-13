import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { authorizeAdmin, authorizeUser } from '@/app/api/_lib/route-utils';

export async function GET() {
  const error = await authorizeUser();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    const items = await prisma.driver.findMany();
    return NextResponse.json(items);
  } catch (err) {
    console.error('[GET /api/drivers] Error:', err);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  const data = await request.json();
  try {
    const item = await prisma.driver.create({ data });
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error('[POST /api/drivers] Error:', err);
    return NextResponse.json({ error: 'Unable to create Driver', details: (err as Error).message }, { status: 400 });
  }
}
