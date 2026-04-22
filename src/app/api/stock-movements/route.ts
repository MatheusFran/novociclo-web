import { prisma } from '@/server/prisma';
import { NextRequest, NextResponse } from 'next/server';

// API de stock-movements desativada
const SERVICE_UNAVAILABLE = NextResponse.json(
  { error: 'API de movimentações de estoque desativada temporariamente' },
  { status: 503 }
);

export async function GET() {
  return SERVICE_UNAVAILABLE;
}

export async function POST(request: NextRequest) {
  return SERVICE_UNAVAILABLE;
}