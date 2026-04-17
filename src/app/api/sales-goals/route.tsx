import { prisma } from '@/server/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET - Listar todas as metas ou mês específico
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (month && year) {
      const goal = await prisma.salesGoal.findUnique({
        where: {
          year_month: {
            year: parseInt(year),
            month: parseInt(month),
          },
        },
      });
      return NextResponse.json(goal || null, { status: 200 });
    }

    const goals = await prisma.salesGoal.findMany({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    return NextResponse.json(goals, { status: 200 });
  } catch (error) {
    console.error('Erro ao buscar metas:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar metas' },
      { status: 500 }
    );
  }
}

// POST - Criar nova meta
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { month, year, revenue, tons, notes } = body;

    if (!month || !year) {
      return NextResponse.json(
        { error: 'Mês e ano são obrigatórios' },
        { status: 400 }
      );
    }

    const existingGoal = await prisma.salesGoal.findUnique({
      where: {
        year_month: {
          year: parseInt(year),
          month: parseInt(month),
        },
      },
    });

    if (existingGoal) {
      return NextResponse.json(
        { error: 'Meta para este mês já existe' },
        { status: 409 }
      );
    }

    const goal = await prisma.salesGoal.create({
      data: {
        month: parseInt(month),
        year: parseInt(year),
        revenue: parseFloat(revenue) || 0,
        tons: parseFloat(tons) || 0,
        notes: notes || null,
      },
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar meta:', error);
    return NextResponse.json(
      { error: 'Erro ao criar meta' },
      { status: 500 }
    );
  }
}
