import { prisma } from '@/server/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET - Buscar todas as movimentações de estoque
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');
    const type = searchParams.get('type');

    const where: any = {};
    if (productId) where.productId = productId;
    if (type) where.type = type;

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(movements);
  } catch (error) {
    console.error('Erro ao buscar movimentações:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar movimentações' },
      { status: 500 }
    );
  }
}

// POST - Criar nova movimentação de estoque
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, type, quantity, unitCost, reason, relatedOrderId } = body;

    // Validar campos obrigatórios
    if (!productId || !type || quantity === undefined) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando: productId, type, quantity' },
        { status: 400 }
      );
    }

    // Validar tipo
    if (!['ENTRADA', 'SAIDA'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo deve ser ENTRADA ou SAIDA' },
        { status: 400 }
      );
    }

    // Validar se produto existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    // Calcular custo total
    const totalCost = quantity * (unitCost || 0);

    // Criar movimentação
    const movement = await prisma.stockMovement.create({
      data: {
        productId,
        type,
        quantity: parseFloat(quantity),
        unitCost: parseFloat(unitCost || 0),
        totalCost,
        reason: reason || 'Manual',
        relatedOrderId: relatedOrderId || null,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(movement, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar movimentação:', error);
    return NextResponse.json(
      { error: 'Erro ao criar movimentação' },
      { status: 500 }
    );
  }
}