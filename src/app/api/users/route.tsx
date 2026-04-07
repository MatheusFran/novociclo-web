import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { prisma } from '@/server/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if ((session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, name: true, role: true, active: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if ((session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { email, name, role, password } = await request.json();

  if (!email || !name || !role || !password) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const validRoles = ['ADMIN', 'COMERCIAL', 'PRODUCAO', 'LOGISTICA'];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email, name, role, password: hashed },
    select: { id: true, email: true, name: true, role: true, active: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json(user, { status: 201 });
}