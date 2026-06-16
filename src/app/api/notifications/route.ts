import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    const limit = req.nextUrl.searchParams.get('limit') ? parseInt(req.nextUrl.searchParams.get('limit')!) : 50;
    const skip = req.nextUrl.searchParams.get('skip') ? parseInt(req.nextUrl.searchParams.get('skip')!) : 0;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    });

    const total = await prisma.notification.count({ where: { userId } });

    return NextResponse.json({ notifications, total, limit, skip });
  } catch (error) {
    console.error('GET /api/notifications error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    const data = await req.json();

    const notification = await prisma.notification.create({
      data: {
        userId,
        orderId: data.orderId,
        type: data.type || 'ORDER_STATUS_CHANGED',
        title: data.title,
        message: data.message,
        data: data.data || {},
      },
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error('POST /api/notifications error:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}
