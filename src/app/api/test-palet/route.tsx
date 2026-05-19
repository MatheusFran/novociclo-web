import { prisma } from '@/server/prisma';
import { NextResponse } from 'next/server';

/**
 * Endpoint de teste para verificar se Palet e PaletHistory foram criados
 * GET /api/test-palet
 */
export async function GET() {
    try {
        // 1. Verificar se consegue listar Carregamentos
        const carregamentos = await prisma.carregamento.findMany({ take: 1 });
        
        // 2. Verificar se consegue listar Palets
        const palets = await prisma.palet.findMany({ take: 1 });
        
        // 3. Verificar se consegue listar PaletHistories
        const histories = await prisma.paletHistory.findMany({ take: 1 });

        return NextResponse.json({
            status: 'SUCCESS',
            message: 'Tabelas criadas com sucesso!',
            data: {
                carregamentosCount: (await prisma.carregamento.count()),
                paletsCount: (await prisma.palet.count()),
                paletHistoriesCount: (await prisma.paletHistory.count()),
                carregamentoSample: carregamentos[0] || null,
                paletSample: palets[0] || null,
                historySample: histories[0] || null,
            }
        });
    } catch (error: any) {
        return NextResponse.json({
            status: 'ERROR',
            message: 'Erro ao testar tabelas',
            error: error.message,
            code: error.code,
        }, { status: 500 });
    }
}
