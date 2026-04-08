import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { authorizeAdmin } from '@/app/api/_lib/route-utils';

function parseJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeJsonArray(value: unknown) {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'string') return value;
  return JSON.stringify([]);
}

export async function GET(_request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    const item = await prisma.deliverySchedule.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: 'DeliverySchedule not found' }, { status: 404 });

    return NextResponse.json({
      ...item,
      orders: parseJsonArray(item.orderIds || item.orders || '[]'),
      cities: parseJsonArray(item.cities || '[]'),
    });
  } catch (err) {
    console.error('[GET /api/delivery-schedules/[id]] Error:', err);
    return NextResponse.json({ error: 'Unable to fetch DeliverySchedule' }, { status: 500 });
  }
}

export async function PATCH(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  const data = await _request.json();
  if (!data || Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  try {
    const updateData: any = { ...data };
    if (data.orderIds !== undefined) updateData.orderIds = normalizeJsonArray(data.orderIds);
    if (data.orders !== undefined) updateData.orderIds = normalizeJsonArray(data.orders);
    if (data.cities !== undefined) updateData.cities = normalizeJsonArray(data.cities);

    const updated = await prisma.deliverySchedule.update({ where: { id }, data: updateData });
    return NextResponse.json({
      ...updated,
      orders: parseJsonArray(updated.orderIds || updated.orders || '[]'),
      cities: parseJsonArray(updated.cities || '[]'),
    });
  } catch (err) {
    console.error('[PATCH /api/delivery-schedules/[id]] Error:', err);
    return NextResponse.json({ error: 'Unable to update DeliverySchedule', details: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    await prisma.deliverySchedule.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('[DELETE /api/delivery-schedules/[id]] Error:', err);
    return NextResponse.json({ error: 'Unable to delete DeliverySchedule', details: (err as Error).message }, { status: 400 });
  }
}
