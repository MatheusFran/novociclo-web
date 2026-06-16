import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { authorizeAdmin } from '@/app/api/_lib/route-utils';

export async function GET(req: NextRequest) {
  try {
    const error = await authorizeAdmin();
    if (error) return NextResponse.json(error.body, { status: error.status });

    const userId = req.nextUrl.searchParams.get('userId');
    const action = req.nextUrl.searchParams.get('action');
    const resource = req.nextUrl.searchParams.get('resource');
    const startDate = req.nextUrl.searchParams.get('startDate');
    const endDate = req.nextUrl.searchParams.get('endDate');
    const limit = req.nextUrl.searchParams.get('limit') ? parseInt(req.nextUrl.searchParams.get('limit')!) : 100;
    const skip = req.nextUrl.searchParams.get('skip') ? parseInt(req.nextUrl.searchParams.get('skip')!) : 0;

    const where: any = {};

    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (resource) where.resource = resource;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    });

    const total = await prisma.auditLog.count({ where });

    return NextResponse.json({
      logs,
      total,
      limit,
      skip,
    });
  } catch (error) {
    console.error('GET /api/audit-logs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
