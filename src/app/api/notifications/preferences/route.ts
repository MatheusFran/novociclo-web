import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    // Se não existir, criar com valores padrão
    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: {
          userId,
          orderStatusChanged: true,
          orderApprovedFinance: true,
          orderRejected: true,
          orderDelivered: true,
          orderInProduction: true,
          orderInDelivery: true,
        },
      });
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('GET /api/notifications/preferences error:', error);
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    const data = await req.json();

    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    // Se não existir, criar primeiro
    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: {
          userId,
          ...data,
        },
      });
    } else {
      preferences = await prisma.notificationPreference.update({
        where: { userId },
        data,
      });
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('PATCH /api/notifications/preferences error:', error);
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
}
