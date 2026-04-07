import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { authorizeAdmin } from '@/app/api/_lib/route-utils';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  const item = await prisma.orderItem.findUnique({ where: { id: params.id } });
  if (!item) return NextResponse.json({ error: 'OrderItem not found' }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  const data = await request.json();
  if (!data || Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  try {
    const updated = await prisma.orderItem.update({ where: { id: params.id }, data });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: 'Unable to update OrderItem' }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    await prisma.orderItem.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: 'Unable to delete OrderItem' }, { status: 400 });
  }
}
