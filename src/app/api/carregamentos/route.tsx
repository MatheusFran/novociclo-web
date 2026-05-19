import { prisma } from '@/server/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '../_lib/route-utils';

// GET - Listar todos os carregamentos
export async function GET() {
    const error = await authorizeUser();
    if (error) return NextResponse.json(error.body, { status: error.status });

    try {
        const carregamentos = await prisma.carregamento.findMany({
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(carregamentos);
    } catch (err) {
        console.error('[GET /api/carregamento] Error:', err);
        return NextResponse.json([]);
    }
}

// POST - Criar novo carregamento
export async function POST(request: NextRequest) {
    const error = await authorizeUser();
    if (error) return NextResponse.json(error.body, { status: error.status });

    try {
        const data = await request.json();

        if (!data.grupoCarga) {
            return NextResponse.json(
                { error: 'grupoCarga são obrigatórios' },
                { status: 400 }
            );
        }

        // Validar se já existe carregamento com este grupoCarga
        const existente = await prisma.carregamento.findUnique({
            where: { grupoCarga: data.grupoCarga },
        });

        if (existente) {
            return NextResponse.json(
                { error: 'Carregamento com este grupoCarga já existe', reason: 'DUPLICATE_GRUPO_CARGA' },
                { status: 409 }
            );
        }

        // Criar o carregamento com todos os dados
        const carregamento = await prisma.carregamento.create({
            data: {
                id: data.id || undefined,
                grupoCarga: data.grupoCarga,
                tipoCarga: data.tipoCarga,
                dataCarregamento: new Date(data.dataCarregamento),
                orderIds: data.orderIds || [],
                totalSacos: data.totalSacos || 0,
                totalPeso: data.totalPeso || 0,
                totalValor: data.totalValor || 0,
                observations: data.observations || null,
                cityGroups: data.cityGroups || [],
                romaneio: null, // Será gerado quando necessário
            }
        });

        // Criar registros de Palet e histórico
        if (data.cityGroups && Array.isArray(data.cityGroups)) {
            const paletRecords = [];
            const historyRecords = [];

            for (const cityGroup of data.cityGroups) {
                if (cityGroup.palets && Array.isArray(cityGroup.palets)) {
                    for (const palet of cityGroup.palets) {
                        const paletRecord = await prisma.palet.create({
                            data: {
                                id: palet.id,
                                carregamentoId: carregamento.id,
                                number: palet.number,
                                city: cityGroup.city,
                                items: palet.items || [],
                                totalWeight: calcularPesoTotal(palet, data.products || []),
                                totalUnits: calcularUnidadesTotal(palet),
                            }
                        });
                        paletRecords.push(paletRecord);

                        // Criar histórico de criação do palete
                        await prisma.paletHistory.create({
                            data: {
                                carregamentoId: carregamento.id,
                                paletId: paletRecord.id,
                                action: 'CRIADO',
                                details: {
                                    paletNumber: palet.number,
                                    city: cityGroup.city,
                                    itemsCount: (palet.items || []).length,
                                    units: calcularUnidadesTotal(palet),
                                    weight: calcularPesoTotal(palet, data.products || []),
                                }
                            }
                        });
                    }
                }
            }

            // Criar histórico geral do carregamento
            await prisma.paletHistory.create({
                data: {
                    carregamentoId: carregamento.id,
                    action: 'CRIADO',
                    details: {
                        grupoCarga: data.grupoCarga,
                        paletCount: paletRecords.length,
                        totalWeight: data.totalPeso,
                        totalUnits: data.totalSacos,
                        observations: data.observations,
                    }
                }
            });
        }

        return NextResponse.json(carregamento, { status: 201 });
    } catch (err) {
        console.error('[POST /api/carregamentos] Error:', err);
        return NextResponse.json(
            { error: 'Erro ao criar carregamento', details: (err as Error).message },
            { status: 400 }
        );
    }
}

// Helpers para calcular peso e unidades
function calcularPesoTotal(palet: any, products: any[]): number {
    if (!palet.items || !Array.isArray(palet.items)) return 0;
    return palet.items.reduce((total: number, item: any) => {
        const produto = products.find((p: any) => p.id === item.productId);
        const weight = produto?.weight || 0;
        const qty = item.clients?.reduce((s: number, c: any) => s + c.quantity, 0) || 0;
        return total + (weight * qty);
    }, 0);
}

function calcularUnidadesTotal(palet: any): number {
    if (!palet.items || !Array.isArray(palet.items)) return 0;
    return palet.items.reduce((total: number, item: any) => {
        const qty = item.clients?.reduce((s: number, c: any) => s + c.quantity, 0) || 0;
        return total + qty;
    }, 0);
}
