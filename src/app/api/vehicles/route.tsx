import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { authorizeAdmin } from '@/app/api/_lib/route-utils';

export async function GET() {
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  const items = await prisma.vehicle.findMany();
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  const data = await request.json();
  try {
    const item = await prisma.vehicle.create({ data });
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Unable to create Vehicle' }, { status: 400 });
  }
}
