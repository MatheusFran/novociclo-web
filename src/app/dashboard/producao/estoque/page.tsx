'use client';

import { useSystemData } from '@/server/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
    BarChart3, History, Plus, Search, Download, AlertTriangle, TrendingUp, TrendingDown, Loader2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────
interface StockMovement {
    id: string;
    productId: string;
    productName?: string;
    type: 'ENTRADA' | 'SAIDA';
    quantity: number;
    unitCost: number;
    totalCost: number;
    reason: string;
    relatedOrderId?: string;
    date: string;
    createdAt?: string;
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function EstoqueLogisticaPage() {
    const { products, orders, isReady } = useSystemData();
    const [isEntradaOpen, setIsEntradaOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'TODAS' | 'ENTRADA' | 'SAIDA'>('TODAS');
    const [historicoDe, setHistoricoDe] = useState('');
    const [historicoAte, setHistoricoAte] = useState('');

    // Estados do formulário de entrada
    const [formProductId, setFormProductId] = useState('');
    const [formQuantity, setFormQuantity] = useState('');
    const [formUnitCost, setFormUnitCost] = useState('');
    const [formReason, setFormReason] = useState<'COMPRA' | 'DEVOLUCAO' | 'AJUSTE'>('COMPRA');
    const [isLoadingEntrada, setIsLoadingEntrada] = useState(false);

    // Estados do formulário de saída
    const [isSaidaOpen, setIsSaidaOpen] = useState(false);
    const [saidaProductId, setSaidaProductId] = useState('');
    const [saidaQuantity, setSaidaQuantity] = useState('');
    const [saidaReason, setSaidaReason] = useState('VENDA');
    const [isLoadingSaida, setIsLoadingSaida] = useState(false);

    // Estados das movimentações
    const [movimentacoesAPI, setMovimentacoesAPI] = useState<StockMovement[]>([]);
    const [isLoadingMovimentacoes, setIsLoadingMovimentacoes] = useState(true);

    // ── Buscar movimentações da API ──
    useEffect(() => {
        const fetchMovimentacoes = async () => {
            try {
                setIsLoadingMovimentacoes(true);
                const res = await fetch('/api/stock-movements');
                if (!res.ok) throw new Error('Erro ao buscar movimentações');
                const data = await res.json();

                // Mapear dados da API para o formato esperado
                const mapped = data.map((mov: any) => ({
                    id: mov.id,
                    productId: mov.productId,
                    productName: mov.product?.name || mov.productId,
                    type: mov.type,
                    quantity: mov.quantity,
                    unitCost: mov.unitCost,
                    totalCost: mov.totalCost,
                    reason: mov.reason,
                    relatedOrderId: mov.relatedOrderId,
                    date: mov.createdAt,
                }));
                setMovimentacoesAPI(mapped);
            } catch (error) {
                console.error('Erro ao buscar movimentações:', error);
                toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar as movimentações' });
            } finally {
                setIsLoadingMovimentacoes(false);
            }
        };

        if (isReady) {
            fetchMovimentacoes();
        }
    }, [isReady]);

    // ── Calcular movimentações de estoque ──
    // Combina API com saídas automáticas de pedidos aprovados
    const movimentacoes = useMemo(() => {
        let movs: StockMovement[] = [...movimentacoesAPI];

        // Adicionar saídas automáticas de pedidos aprovados em PRONTO_LOGISTICA (se não existirem)
        const apiIds = new Set(movimentacoesAPI.map(m => m.id));

        orders.forEach(order => {
            if (order.status === 'PRONTO_LOGISTICA' && order.productionStage === 'CONCLUIDO') {
                order.items.forEach((item: any) => {
                    const autoId = `${order.id}-${item.productId}`;
                    if (!apiIds.has(autoId)) {
                        const prod = products.find(p => p.id === item.productId);
                        movs.push({
                            id: autoId,
                            productId: item.productId,
                            productName: prod?.name || item.productId,
                            type: 'SAIDA',
                            quantity: item.quantity,
                            unitCost: item.price,
                            totalCost: item.price * item.quantity,
                            reason: `Produção - Pedido ${order.id}`,
                            relatedOrderId: order.id,
                            date: (order as any).approvedAt,
                        });
                    }
                });
            }
        });

        return movs.sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());
    }, [movimentacoesAPI, orders, products]);

    // ── Calcular saldo atual (baseado em movimentações) ──
    const saldoEstoque = useMemo(() => {
        const saldos: Record<string, number> = {};

        // Inicializar com saldo inicial (0) para cada produto
        products.forEach(prod => {
            saldos[prod.id] = 0;
        });

        // Adicionar/subtrair movimentações
        movimentacoes.forEach(mov => {
            if (mov.type === 'ENTRADA') {
                saldos[mov.productId] = (saldos[mov.productId] || 0) + mov.quantity;
            } else if (mov.type === 'SAIDA') {
                saldos[mov.productId] = (saldos[mov.productId] || 0) - mov.quantity;
            }
        });

        return saldos;
    }, [products, movimentacoes]);

    // ── Produtos com saldo e estoque baixo ──
    const produtosComSaldo = useMemo(() => {
        return products.map(prod => ({
            ...prod,
            saldoAtual: saldoEstoque[prod.id] || 0,
        }));
    }, [products, saldoEstoque]);

    const produtosBaixoEstoque = useMemo(() => {
        const MIN_STOCK = 10;
        return produtosComSaldo.filter(p => p.saldoAtual < MIN_STOCK);
    }, [produtosComSaldo]);


    // ── Filtrar movimentações ──
    const movimentacoesFiltered = useMemo(() => {
        return movimentacoes.filter(mov => {
            const matchSearch = !searchTerm ||
                mov.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                mov.reason?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchType = filterType === 'TODAS' || mov.type === filterType;
            const movDate = new Date(mov.date);
            const matchDe = !historicoDe || movDate >= new Date(historicoDe);
            const matchAte = !historicoAte || movDate <= new Date(historicoAte);
            return matchSearch && matchType && matchDe && matchAte;
        });
    }, [movimentacoes, searchTerm, filterType, historicoDe, historicoAte]);

    // ── Handler para entrada manual ──
    const handleAddStockEntry = async () => {
        if (!formProductId || !formQuantity || !formUnitCost) {
            toast({ variant: "destructive", title: "Erro", description: "Preencha todos os campos." });
            return;
        }

        const quantity = parseFloat(formQuantity);
        const unitCost = parseFloat(formUnitCost);

        if (quantity <= 0 || unitCost < 0) {
            toast({ variant: "destructive", title: "Erro", description: "Quantidade deve ser maior que zero." });
            return;
        }

        try {
            setIsLoadingEntrada(true);
            const res = await fetch('/api/stock-movements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: formProductId,
                    type: 'ENTRADA',
                    quantity,
                    unitCost,
                    reason: formReason,
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Erro ao registrar entrada');
            }

            const newMovement = await res.json();

            // Atualizar lista local
            setMovimentacoesAPI([newMovement, ...movimentacoesAPI]);

            toast({ title: "Sucesso", description: `${quantity} unidades adicionadas ao estoque.` });
            setFormProductId('');
            setFormQuantity('');
            setFormUnitCost('');
            setFormReason('COMPRA');
            setIsEntradaOpen(false);
        } catch (error) {
            console.error('Erro:', error);
            toast({ variant: "destructive", title: "Erro", description: error instanceof Error ? error.message : "Falha ao registrar entrada." });
        } finally {
            setIsLoadingEntrada(false);
        }
    };

    // ── Handler para saída manual ──
    const handleAddStockExit = async () => {
        if (!saidaProductId || !saidaQuantity) {
            toast({ variant: "destructive", title: "Erro", description: "Preencha todos os campos." });
            return;
        }

        const quantity = parseFloat(saidaQuantity);
        const saldo = saldoEstoque[saidaProductId] || 0;

        if (quantity <= 0) {
            toast({ variant: "destructive", title: "Erro", description: "Quantidade deve ser maior que zero." });
            return;
        }

        if (quantity > saldo) {
            toast({ variant: "destructive", title: "Erro", description: `Quantidade indisponível. Saldo: ${saldo}` });
            return;
        }

        try {
            setIsLoadingSaida(true);
            const res = await fetch('/api/stock-movements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: saidaProductId,
                    type: 'SAIDA',
                    quantity,
                    unitCost: 0,
                    reason: saidaReason,
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Erro ao registrar saída');
            }

            const newMovement = await res.json();

            // Atualizar lista local
            setMovimentacoesAPI([newMovement, ...movimentacoesAPI]);

            toast({ title: "Sucesso", description: `${quantity} unidades removidas do estoque.` });
            setSaidaProductId('');
            setSaidaQuantity('');
            setSaidaReason('VENDA');
            setIsSaidaOpen(false);
        } catch (error) {
            console.error('Erro:', error);
            toast({ variant: "destructive", title: "Erro", description: error instanceof Error ? error.message : "Falha ao registrar saída." });
        } finally {
            setIsLoadingSaida(false);
        }
    };

    // ── Exportar movimentações ──
    const handleExportMovements = () => {
        const rows = movimentacoesFiltered.map(mov => ({
            DATA: format(new Date(mov.date), 'dd/MM/yyyy HH:mm'),
            PRODUTO: mov.productName,
            TIPO: mov.type === 'ENTRADA' ? 'Entrada' : 'Saída',
            QUANTIDADE: mov.quantity,
            'CUSTO UNIT': `R$ ${mov.unitCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            'CUSTO TOTAL': `R$ ${mov.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            MOTIVO: mov.reason,
            PEDIDO: mov.relatedOrderId || '---',
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Movimentações');
        XLSX.writeFile(wb, `Estoque_Movimentacoes_${format(new Date(), 'ddMMyy')}.xlsx`);
    };

    if (!isReady) return null;

    // ── Totais ──
    const totalEstoque = produtosComSaldo.reduce((acc, p) => acc + p.saldoAtual, 0);
    const totalEntradas = movimentacoes.filter(m => m.type === 'ENTRADA').length;
    const totalSaidas = movimentacoes.filter(m => m.type === 'SAIDA').length;

    return (
        <div className="space-y-6">
            {/* Cards de resumo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-none shadow-sm bg-white">
                    <CardContent className="p-4">
                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Total Produtos</p>
                        <p className="text-2xl font-black">{products.length}</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white">
                    <CardContent className="p-4">
                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Quantidade em Estoque</p>
                        <p className="text-2xl font-black text-green-600">{totalEstoque}</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white">
                    <CardContent className="p-4">
                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Produtos com Baixo Estoque</p>
                        <p className="text-2xl font-black text-red-600">{produtosBaixoEstoque.length}</p>
                    </CardContent>
                </Card>
                <Card className="bg-primary text-primary-foreground border-none shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-[9px] font-black uppercase opacity-70 tracking-widest mb-1">Saídas Automáticas</p>
                        <p className="text-2xl font-black">{totalSaidas}</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="saldo" className="w-full">
                <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                    <TabsTrigger value="saldo" className="gap-2 font-bold text-xs uppercase"><BarChart3 className="w-4 h-4" /> Saldo</TabsTrigger>
                    <TabsTrigger value="movimentacoes" className="gap-2 font-bold text-xs uppercase"><History className="w-4 h-4" /> Histórico</TabsTrigger>
                </TabsList>

                {/* ABA SALDO */}
                <TabsContent value="saldo" className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-tight">Saldo de Estoque</h2>
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">Produtos disponíveis (já com saídas de produção descontadas)</p>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={() => setIsEntradaOpen(true)} className="gap-2 font-bold text-xs uppercase bg-green-600 hover:bg-green-700 text-white">
                                <Plus className="w-4 h-4" /> Entrada
                            </Button>
                            <Button onClick={() => setIsSaidaOpen(true)} className="gap-2 font-bold text-xs uppercase bg-red-600 hover:bg-red-700 text-white">
                                <TrendingDown className="w-4 h-4" /> Saída
                            </Button>
                        </div>
                    </div>

                    {/* Aviso de baixo estoque */}
                    {produtosBaixoEstoque.length > 0 && (
                        <Card className="border-amber-200 bg-amber-50">
                            <CardContent className="p-4 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-black text-amber-900 uppercase">Produtos com Baixo Estoque</p>
                                    <p className="text-xs text-amber-700 mt-1">
                                        {produtosBaixoEstoque.map(p => `${p.name} (${p.saldoAtual} un)`).join(' • ')}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="border-none shadow-md overflow-x-auto">
                        <CardContent className="p-0">
                            <table className="w-full">
                                <thead className="bg-muted/50 border-b">
                                    <tr>
                                        <th className="text-[9px] font-black uppercase text-left px-4 py-3">Produto</th>
                                        <th className="text-[9px] font-black uppercase text-center px-4 py-3 hidden md:table-cell">ID</th>
                                        <th className="text-[9px] font-black uppercase text-center px-4 py-3">Peso Unit.</th>
                                        <th className="text-[9px] font-black uppercase text-center px-4 py-3">Mínimo</th>
                                        <th className="text-[9px] font-black uppercase text-center px-4 py-3">Saldo Atual</th>
                                        <th className="text-[9px] font-black uppercase text-center px-4 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {produtosComSaldo.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-8 text-muted-foreground text-xs italic">
                                                Nenhum produto cadastrado.
                                            </td>
                                        </tr>
                                    ) : (
                                        produtosComSaldo.map((prod, idx) => (
                                            <tr key={prod.id} className={`border-b hover:bg-muted/20 ${idx % 2 === 0 ? 'bg-white' : 'bg-muted/30'}`}>
                                                <td className="px-4 py-3 text-[10px] font-bold uppercase">{prod.name}</td>
                                                <td className="px-4 py-3 text-center text-[9px] text-muted-foreground font-mono hidden md:table-cell">{prod.id}</td>
                                                <td className="px-4 py-3 text-center text-[10px] font-bold">{(prod.weight || 0).toFixed(2)} kg</td>
                                                <td className="px-4 py-3 text-center text-[10px] font-bold">10</td>
                                                <td className={`px-4 py-3 text-center text-[11px] font-black ${prod.saldoAtual < 10 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {prod.saldoAtual}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <Badge className={prod.saldoAtual > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                                        {prod.saldoAtual > 0 ? 'OK' : 'Zerado'}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABA HISTÓRICO */}
                <TabsContent value="movimentacoes" className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-tight">Histórico de Movimentações</h2>
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">Saídas automáticas de produtos aprovados em produção</p>
                        </div>
                        <Button variant="outline" size="sm" className="gap-2 font-bold uppercase text-[10px]" onClick={handleExportMovements}>
                            <Download className="w-3.5 h-3.5" /> Exportar
                        </Button>
                    </div>

                    {/* Filtros */}
                    <div className="bg-white border rounded-xl p-4 space-y-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Filtros</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                            <div className="relative md:col-span-2">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <Input placeholder="Produto ou motivo..." className="pl-8 h-8 text-xs font-bold"
                                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                            <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TODAS">Todas</SelectItem>
                                    <SelectItem value="ENTRADA">Entrada</SelectItem>
                                    <SelectItem value="SAIDA">Saída</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase text-muted-foreground"
                                onClick={() => { setSearchTerm(''); setFilterType('TODAS'); setHistoricoDe(''); setHistoricoAte(''); }}>
                                Limpar
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="flex items-center gap-2">
                                <label className="text-[9px] font-black uppercase text-muted-foreground whitespace-nowrap">De:</label>
                                <Input type="date" className="h-8 text-xs flex-1" value={historicoDe} onChange={e => setHistoricoDe(e.target.value)} />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-[9px] font-black uppercase text-muted-foreground whitespace-nowrap">Até:</label>
                                <Input type="date" className="h-8 text-xs flex-1" value={historicoAte} onChange={e => setHistoricoAte(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Tabela */}
                    {movimentacoesFiltered.length === 0 ? (
                        <Card className="border-none shadow-md">
                            <CardContent className="py-16 text-center text-muted-foreground italic text-xs uppercase opacity-40">
                                Nenhuma movimentação encontrada.
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-none shadow-md overflow-x-auto">
                            <CardContent className="p-0">
                                <table className="w-full">
                                    <thead className="bg-muted/50 border-b">
                                        <tr>
                                            <th className="text-[9px] font-black uppercase text-left px-4 py-3">Produto</th>
                                            <th className="text-[9px] font-black uppercase text-center px-4 py-3">Tipo</th>
                                            <th className="text-[9px] font-black uppercase text-center px-4 py-3">Quantidade</th>
                                            <th className="text-[9px] font-black uppercase text-center px-4 py-3 hidden md:table-cell">Custo Unit.</th>
                                            <th className="text-[9px] font-black uppercase text-center px-4 py-3">Motivo</th>
                                            <th className="text-[9px] font-black uppercase text-center px-4 py-3">Data</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {movimentacoesFiltered.map((mov, idx) => (
                                            <tr key={mov.id} className={`border-b hover:bg-muted/20 ${idx % 2 === 0 ? 'bg-white' : 'bg-muted/30'}`}>
                                                <td className="px-4 py-3 text-[10px] font-bold uppercase">{mov.productName}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <Badge className={mov.type === 'ENTRADA' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                                        {mov.type === 'ENTRADA' ? '↑ ENTRADA' : '↓ SAÍDA'}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-center text-[11px] font-black">{mov.quantity}</td>
                                                <td className="px-4 py-3 text-center text-[9px] text-muted-foreground font-mono hidden md:table-cell">
                                                    R$ {mov.unitCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-4 py-3 text-[9px] text-muted-foreground">{mov.reason}</td>
                                                <td className="px-4 py-3 text-center text-[9px] font-bold text-muted-foreground">
                                                    {format(new Date(mov.date), 'dd/MM/yyyy HH:mm')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            {/* MODAL ENTRADA MANUAL */}
            <Dialog open={isEntradaOpen} onOpenChange={setIsEntradaOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-black uppercase flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Entrada de Estoque
                        </DialogTitle>
                        <DialogDescription className="text-[10px] uppercase font-bold">
                            Registre uma entrada manual de produtos
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-muted-foreground">Produto *</label>
                            <Select value={formProductId} onValueChange={setFormProductId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Selecione um produto" />
                                </SelectTrigger>
                                <SelectContent>
                                    {products.map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name} (Atual: {saldoEstoque[p.id] || 0})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-muted-foreground">Quantidade *</label>
                            <Input
                                type="number"
                                placeholder="0"
                                className="h-9 text-xs font-bold"
                                value={formQuantity}
                                onChange={e => setFormQuantity(e.target.value)}
                                min="1"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-muted-foreground">Custo Unitário (R$) *</label>
                            <Input
                                type="number"
                                placeholder="0.00"
                                className="h-9 text-xs font-bold"
                                value={formUnitCost}
                                onChange={e => setFormUnitCost(e.target.value)}
                                min="0"
                                step="0.01"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-muted-foreground">Motivo</label>
                            <Select value={formReason} onValueChange={(v) => setFormReason(v as typeof formReason)}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="COMPRA">Compra</SelectItem>
                                    <SelectItem value="DEVOLUCAO">Devolução</SelectItem>
                                    <SelectItem value="AJUSTE">Ajuste</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsEntradaOpen(false)} className="font-bold text-xs uppercase" disabled={isLoadingEntrada}>
                            Cancelar
                        </Button>
                        <Button onClick={handleAddStockEntry} className="gap-2 font-black text-xs uppercase bg-green-600 hover:bg-green-700 text-white disabled:opacity-50" disabled={isLoadingEntrada}>
                            {isLoadingEntrada ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-3.5 h-3.5" /> Registrar Entrada
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL SAÍDA MANUAL */}
            <Dialog open={isSaidaOpen} onOpenChange={setIsSaidaOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-black uppercase flex items-center gap-2">
                            <TrendingDown className="w-4 h-4" /> Saída de Estoque
                        </DialogTitle>
                        <DialogDescription className="text-[10px] uppercase font-bold">
                            Registre uma saída manual de produtos
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-muted-foreground">Produto *</label>
                            <Select value={saidaProductId} onValueChange={setSaidaProductId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Selecione um produto" />
                                </SelectTrigger>
                                <SelectContent>
                                    {products.filter(p => (saldoEstoque[p.id] || 0) > 0).map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name} (Saldo: {saldoEstoque[p.id] || 0})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-muted-foreground">Quantidade *</label>
                            <Input
                                type="number"
                                placeholder="0"
                                className="h-9 text-xs font-bold"
                                value={saidaQuantity}
                                onChange={e => setSaidaQuantity(e.target.value)}
                                min="1"
                                max={saidaProductId ? (saldoEstoque[saidaProductId] || 0) : undefined}
                            />
                            {saidaProductId && (
                                <p className="text-[8px] text-muted-foreground">
                                    Saldo disponível: <span className="font-bold">{saldoEstoque[saidaProductId] || 0}</span>
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-muted-foreground">Motivo</label>
                            <Select value={saidaReason} onValueChange={setSaidaReason}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="VENDA">Venda</SelectItem>
                                    <SelectItem value="DEVOLVIDO">Devolvido</SelectItem>
                                    <SelectItem value="DANIFICADO">Danificado</SelectItem>
                                    <SelectItem value="AJUSTE">Ajuste</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsSaidaOpen(false)} className="font-bold text-xs uppercase" disabled={isLoadingSaida}>
                            Cancelar
                        </Button>
                        <Button onClick={handleAddStockExit} className="gap-2 font-black text-xs uppercase bg-red-600 hover:bg-red-700 text-white disabled:opacity-50" disabled={isLoadingSaida}>
                            {isLoadingSaida ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...
                                </>
                            ) : (
                                <>
                                    <TrendingDown className="w-3.5 h-3.5" /> Registrar Saída
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}



