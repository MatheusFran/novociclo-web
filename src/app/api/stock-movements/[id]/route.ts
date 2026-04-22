import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { authorizeAdmin, authorizeUser, logApiError } from '@/app/api/_lib/route-utils';

// API de stock-movements desativada
const SERVICE_UNAVAILABLE = NextResponse.json(
  { error: 'API de movimentações de estoque desativada temporariamente' },
  { status: 503 }
);

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return SERVICE_UNAVAILABLE;
}

export async function PATCH(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return SERVICE_UNAVAILABLE;
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return SERVICE_UNAVAILABLE;
}
