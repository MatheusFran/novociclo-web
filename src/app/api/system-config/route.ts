import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';

export async function GET() {
  try {
    const configs = await prisma.systemConfig.findMany();
    
    const result: Record<string, any> = {};
    configs.forEach((config:any) => {
      try {
        result[config.key] = JSON.parse(config.value);
      } catch {
        result[config.key] = config.value;
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar configurações' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!prisma || !prisma.systemConfig) {
      console.error('Prisma não está inicializado corretamente');
      return NextResponse.json(
        { error: 'Erro de configuração do servidor' },
        { status: 500 }
      );
    }

    // Salvar ou atualizar cada configuração
    for (const [key, value] of Object.entries(body)) {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      await prisma.systemConfig.upsert({
        where: { key },
        update: { value: stringValue },
        create: {
          key,
          value: stringValue,
          type: typeof value === 'boolean' ? 'boolean' : 
                typeof value === 'number' ? 'number' : 'string',
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar configurações: ' + String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { key, value, type, description } = await request.json();

    if (!key) {
      return NextResponse.json(
        { error: 'Chave é obrigatória' },
        { status: 400 }
      );
    }

    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    const config = await prisma.systemConfig.upsert({
      where: { key },
      update: {
        value: stringValue,
        type: type || undefined,
        description: description || undefined,
      },
      create: {
        key,
        value: stringValue,
        type: type || 'string',
        description,
      },
    });

    try {
      const parsedValue = JSON.parse(config.value);
      return NextResponse.json({ ...config, value: parsedValue });
    } catch {
      return NextResponse.json(config);
    }
  } catch (error) {
    console.error('Erro ao atualizar configuração:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar configuração' },
      { status: 500 }
    );
  }
}
