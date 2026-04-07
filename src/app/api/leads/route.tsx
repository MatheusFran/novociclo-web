import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin } from '@/app/api/_lib/route-utils';

export async function GET() {
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  // Retorna array vazio - modelo Lead não implementado ainda
  return NextResponse.json([]);
}

export async function POST(request: NextRequest) {
  const error = await authorizeAdmin();
  if (error) return NextResponse.json(error.body, { status: error.status });

  const data = await request.json();
  // Retorna error - modelo não implementado
  return NextResponse.json({ error: 'Lead model not implemented yet' }, { status: 501 });
}
