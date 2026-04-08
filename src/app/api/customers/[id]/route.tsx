import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { authorizeAdmin } from '@/app/api/_lib/route-utils';

export async function GET(
  _request: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = context.params;

  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    const item = await prisma.customer.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    return NextResponse.json(item);
  } catch (err) {
    console.error('[GET /api/customers/[id]] Error:', err);
    return NextResponse.json({ error: 'Unable to fetch Customer' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  const data = await request.json();
  if (!data || Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  try {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = String(data.name).trim();
    if (data.cpfcnpj !== undefined) updateData.cpfcnpj = data.cpfcnpj ? String(data.cpfcnpj).trim() : null;
    if (data.IE !== undefined) updateData.IE = data.IE ? String(data.IE).trim() : null;
    if (data.phone !== undefined) updateData.phone = data.phone ? String(data.phone).trim() : null;
    if (data.email !== undefined) updateData.email = data.email ? String(data.email).trim() : null;
    if (data.address !== undefined) updateData.address = data.address ? String(data.address).trim() : null;
    if (data.city !== undefined) updateData.city = data.city ? String(data.city).trim() : null;

    const updated = await prisma.customer.update({ where: { id: params.id }, data: updateData });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('[PATCH /api/customers/[id]] Error:', err);
    return NextResponse.json({ error: 'Unable to update Customer', details: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    await prisma.customer.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('[DELETE /api/customers/[id]] Error:', err);
    return NextResponse.json({ error: 'Unable to delete Customer', details: (err as Error).message }, { status: 400 });
  }
}