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

export async function GET() {
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  try {
    const items = await prisma.deliverySchedule.findMany();
    return NextResponse.json(
      items.map((item: any) => ({
        ...item,
        orders: parseJsonArray(item.orderIds || item.orders || '[]'),
        cities: parseJsonArray(item.cities || '[]'),
      }))
    );
  } catch (err) {
    console.error('[GET /api/delivery-schedules] Error:', err);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  const data = await request.json();

  try {
    const item = await prisma.deliverySchedule.create({
      data: {
        scheduledDate: data.scheduledDate,
        vehicleId: data.vehicleId,
        driverId: data.driverId,
        orderIds: normalizeJsonArray(data.orderIds || data.orders),
        status: data.status || 'AGENDADO',
        notes: data.notes,
      },
    });

    return NextResponse.json(
      {
        ...item,
        orders: parseJsonArray(item.orderIds || '[]'),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[POST /api/delivery-schedules] Error:', err);
    return NextResponse.json({ error: 'Unable to create DeliverySchedule', details: (err as Error).message }, { status: 400 });
  }
}
