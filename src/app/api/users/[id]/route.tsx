import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { prisma } from '@/server/prisma';
import bcrypt from 'bcryptjs';

const validRoles = ['ADMIN', 'COMERCIAL', 'PRODUCAO', 'LOGISTICA'];

function authorizeAdmin(session: any) {
  if (!session) return { status: 401, body: { error: 'Unauthorized' } };
  if ((session.user as any).role !== 'ADMIN') return { status: 403, body: { error: 'Forbidden' } };
  return null;
}

export async function GET(
  _request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  const error = authorizeAdmin(session);
  if (error) return NextResponse.json(error.body, { status: error.status });

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, active: true, createdAt: true, updatedAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  const error = authorizeAdmin(session);
  if (error) return NextResponse.json(error.body, { status: error.status });

  const { name, email, role, active, password } = await _request.json();
  const data: any = {};

  if (name) data.name = name;
  if (email) data.email = email;
  if (role) {
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    data.role = role;
  }
  if (active !== undefined) data.active = active;
  if (password) data.password = await bcrypt.hash(password, 12);

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, active: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    return NextResponse.json({ error: 'Unable to update user' }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  const error = authorizeAdmin(session);
  if (error) return NextResponse.json(error.body, { status: error.status });

  await prisma.user.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
