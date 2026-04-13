'use client';

import { useSystemData } from '@/server/store';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Inbox, Send, BarChart3, History, Plus, Search, Trash2, Download, Clock, TrendingUp, TrendingDown, Info
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
  type: 'ENTRADA' | 'SAIDA';
  quantity: number;
  unitCost: number;
  totalCost: number;
  reason: string;
  date: string;
  relatedOrderId?: string;
}

interface StockBalance {
  productId: string;
  quantity: number;
  totalValue: number;
  lastUpdate: string;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function loadStockFromStorage(): StockMovement[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem('novociclo_stock_movements');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStockToStorage(movements: StockMovement[]) {
  try {
    window.localStorage.setItem('novociclo_stock_movements', JSON.stringify(movements));
  } catch { }
}

function calculateStockBalance(movements: StockMovement[]): Record<string, StockBalance> {
  const balances: Record<string, StockBalance> = {};

  movements.forEach(mov => {
    if (!balances[mov.productId]) {
      balances[mov.productId] = { productId: mov.productId, quantity: 0, totalValue: 0, lastUpdate: new Date().toISOString() };
    }

    if (mov.type === 'ENTRADA') {
      balances[mov.productId].quantity += mov.quantity;
      balances[mov.productId].totalValue += mov.totalCost;
    } else {
      balances[mov.productId].quantity -= mov.quantity;
      balances[mov.productId].totalValue -= mov.totalCost;
    }
    balances[mov.productId].lastUpdate = mov.date;
  });

  return balances;
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function EstoqueLogisticaPage() {
  const { products, orders, isReady } = useSystemData();
  const [movements, setMovements] = useState<StockMovement[]>([]);
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

  const stockBalance = useMemo(() => calculateStockBalance(movements), [movements]);

  useEffect(() => {
    setMovements(loadStockFromStorage());
  }, []);

  // Filtrar movimentações
  const filteredMovements = useMemo(() => {
    return movements.filter(mov => {
      const prod = products.find(p => p.id === mov.productId);
      const matchSearch = !searchTerm || prod?.name.toLowerCase().includes(searchTerm.toLowerCase()) || mov.productId.includes(searchTerm);
      const matchType = filterType === 'TODAS' || mov.type === filterType;
      const movDate = new Date(mov.date);
      const matchDe = !historicoDe || movDate >= new Date(historicoDe);
      const matchAte = !historicoAte || movDate <= new Date(historicoAte);
      return matchSearch && matchType && matchDe && matchAte;
    });
  }, [movements, searchTerm, filterType, historicoDe, historicoAte, products]);

  // Detectar saídas de estoque pelos pedidos
  useEffect(() => {
    const processOrderStockMovement = async () => {
      const readyOrders = orders.filter(o => o.status === 'PRONTO_LOGISTICA');
      const existingOrderIds = new Set(movements.filter(m => m.type === 'SAIDA' && m.relatedOrderId).map(m => m.relatedOrderId));

      const newMovements: StockMovement[] = [];
      
      readyOrders.forEach(order => {
        if (!existingOrderIds.has(order.id)) {
          order.items.forEach(item => {
            const prod = products.find(p => p.id === item.productId);
            if (prod) {
              // Buscar custo médio do produto nas últimas entradas
              const recentEntries = movements
                .filter(m => m.productId === item.productId && m.type === 'ENTRADA')
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5);

              const avgCost = recentEntries.length > 0
                ? recentEntries.reduce((acc, m) => acc + (m.totalCost / m.quantity), 0) / recentEntries.length
                : item.price;

              newMovements.push({
                id: `stock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                productId: item.productId,
                type: 'SAIDA',
                quantity: item.quantity,
                unitCost: avgCost,
                totalCost: avgCost * item.quantity,
                reason: `Pedido ${order.id}`,
                date: new Date().toISOString(),
                relatedOrderId: order.id,
              });
            }
          });
        }
      });

      if (newMovements.length > 0) {
        const updated = [...movements, ...newMovements];
        setMovements(updated);
        saveStockToStorage(updated);
        toast({ title: "Estoque Atualizado", description: `${newMovements.length} movimentações de saída processadas.` });
      }
    };

    processOrderStockMovement();
  }, [orders, products, movements]);

  const handleAddStockEntry = () => {
    if (!formProductId || !formQuantity || !formUnitCost) {
      toast({ variant: "destructive", title: "Erro", description: "Preencha todos os campos." });
      return;
    }

    const quantity = parseFloat(formQuantity);
    const unitCost = parseFloat(formUnitCost);

    if (quantity <= 0 || unitCost <= 0) {
      toast({ variant: "destructive", title: "Erro", description: "Quantidade e custo devem ser maiores que zero." });
      return;
    }

    const movement: StockMovement = {
      id: `stock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      productId: formProductId,
      type: 'ENTRADA',
      quantity,
      unitCost,
      totalCost: quantity * unitCost,
      reason: formReason,
      date: new Date().toISOString(),
    };

    const updated = [...movements, movement];
    setMovements(updated);
    saveStockToStorage(updated);

    toast({ title: "Entrada Registrada", description: `${quantity} unidades adicionadas ao estoque.` });

    // Limpar formulário
    setFormProductId('');
    setFormQuantity('');
    setFormUnitCost('');
    setFormReason('COMPRA');
    setIsEntradaOpen(false);
  };

  const handleDeleteMovement = (movementId: string) => {
    const updated = movements.filter(m => m.id !== movementId);
    setMovements(updated);
    saveStockToStorage(updated);
    toast({ title: "Movimentação Deletada", description: "O registro foi removido." });
  };

  const handleExportMovements = () => {
    const rows: any[] = filteredMovements.map(mov => {
      const prod = products.find(p => p.id === mov.productId);
      return {
        DATA: format(new Date(mov.date), 'dd/MM/yyyy HH:mm'),
        PRODUTO: prod?.name || mov.productId,
        TIPO: mov.type === 'ENTRADA' ? 'Entrada' : 'Saída',
        QUANTIDADE: mov.quantity,
        'CUSTO UNIT': `R$ ${mov.unitCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        'CUSTO TOTAL': `R$ ${mov.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        MOTIVO: mov.reason,
        PEDIDO: mov.relatedOrderId || '---',
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movimentações');
    XLSX.writeFile(wb, `Estoque_Movimentacoes_${format(new Date(), 'ddMMyy')}.xlsx`);
  };

  if (!isReady) return null;

  const totalStockValue = Object.values(stockBalance).reduce((acc, b) => acc + b.totalValue, 0);
  const totalStockQuantity = Object.values(stockBalance).reduce((acc, b) => acc + b.quantity, 0);
  const entradas = movements.filter(m => m.type === 'ENTRADA').length;
  const saidas = movements.filter(m => m.type === 'SAIDA').length;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Valor Total</p>
                <p className="text-2xl font-black text-primary">R$ {totalStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Quantidade</p>
                <p className="text-2xl font-black text-blue-600">{totalStockQuantity.toLocaleString()}</p>
              </div>
              <Inbox className="w-8 h-8 text-blue-600/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Entradas</p>
                <p className="text-2xl font-black text-green-600">{entradas}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Saídas</p>
                <p className="text-2xl font-black text-red-600">{saidas}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-600/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="saldo" className="w-full">
        <TabsList className="grid w-full max-w-[800px] grid-cols-4">
          <TabsTrigger value="saldo" className="gap-2 font-bold text-xs uppercase"><BarChart3 className="w-4 h-4" /> Saldo</TabsTrigger>
          <TabsTrigger value="entrada" className="gap-2 font-bold text-xs uppercase"><Inbox className="w-4 h-4" /> Entrada</TabsTrigger>
          <TabsTrigger value="saida" className="gap-2 font-bold text-xs uppercase"><Send className="w-4 h-4" /> Saída</TabsTrigger>
          <TabsTrigger value="movimentacoes" className="gap-2 font-bold text-xs uppercase"><History className="w-4 h-4" /> Movimentos</TabsTrigger>
        </TabsList>

        {/* ABA SALDO ATUAL */}
        <TabsContent value="saldo" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">Saldo de Estoque</h2>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Produtos disponíveis em estoque</p>
            </div>
          </div>

          <Card className="border-none shadow-md overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-[9px] font-black uppercase">Produto</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center">Quantidade</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center">Custo Unit.</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-right">Valor Total</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center">Última Atualização</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.values(stockBalance).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic text-xs uppercase opacity-40">
                        Nenhum produto em estoque.
                      </TableCell>
                    </TableRow>
                  ) : (
                    Object.values(stockBalance)
                      .filter(bal => bal.quantity > 0)
                      .sort((a, b) => b.totalValue - a.totalValue)
                      .map((balance) => {
                        const prod = products.find(p => p.id === balance.productId);
                        const avgCost = balance.quantity > 0 ? balance.totalValue / balance.quantity : 0;
                        const percentOfTotal = totalStockValue > 0 ? (balance.totalValue / totalStockValue) * 100 : 0;

                        return (
                          <TableRow key={balance.productId} className="hover:bg-muted/20 h-16">
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <p className="text-[11px] font-black uppercase">{prod?.name}</p>
                                <p className="text-[8px] font-mono text-muted-foreground">{balance.productId}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-col items-center gap-1">
                                <p className="text-sm font-black text-primary">{balance.quantity.toLocaleString()}</p>
                                <p className="text-[8px] text-muted-foreground">{prod?.uom?.toUpperCase() || 'UN'}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <p className="text-xs font-bold">R$ {avgCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </TableCell>
                            <TableCell>
                              <div className="text-right space-y-1">
                                <p className="text-sm font-black text-primary">R$ {balance.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                <Progress value={percentOfTotal} className="h-1.5" />
                                <p className="text-[8px] text-muted-foreground">{percentOfTotal.toFixed(1)}% do total</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-xs font-bold text-muted-foreground">
                              {format(new Date(balance.lastUpdate), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary/80">
                                <Info className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA ENTRADA */}
        <TabsContent value="entrada" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">Entrada de Estoque</h2>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Registrar novos produtos no estoque</p>
            </div>
            <Button className="gap-2 font-bold" onClick={() => setIsEntradaOpen(true)}>
              <Plus className="w-4 h-4" /> Nova Entrada
            </Button>
          </div>

          {/* Modal Entrada */}
          <Dialog open={isEntradaOpen} onOpenChange={setIsEntradaOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nova Entrada de Estoque</DialogTitle>
                <DialogDescription>Registre um novo produto ou quantidade ao estoque</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Produto</label>
                  <Select value={formProductId} onValueChange={setFormProductId}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar produto..." /></SelectTrigger>
                    <SelectContent>
                      {products.filter(p => !p.isRawMaterial).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Quantidade</label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0"
                    value={formQuantity}
                    onChange={e => setFormQuantity(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Custo Unitário (R$)</label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0"
                    value={formUnitCost}
                    onChange={e => setFormUnitCost(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Motivo da Entrada</label>
                  <Select value={formReason} onValueChange={(v) => setFormReason(v as typeof formReason)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COMPRA">Compra</SelectItem>
                      <SelectItem value="DEVOLUCAO">Devolução</SelectItem>
                      <SelectItem value="AJUSTE">Ajuste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formProductId && formQuantity && formUnitCost && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <div className="flex justify-between text-sm font-bold">
                      <span>Custo Total:</span>
                      <span className="text-primary">R$ {(parseFloat(formQuantity) * parseFloat(formUnitCost)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEntradaOpen(false)}>Cancelar</Button>
                <Button onClick={handleAddStockEntry}>Registrar Entrada</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Listagem das últimas entradas */}
          <Card className="border-none shadow-md overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-[9px] font-black uppercase">Produto</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center">Quantidade</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center">Custo Unit.</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-right">Total</TableHead>
                    <TableHead className="text-[9px] font-black uppercase">Motivo</TableHead>
                    <TableHead className="text-[9px] font-black uppercase">Data</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.filter(m => m.type === 'ENTRADA').length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground italic text-xs uppercase opacity-40">
                        Nenhuma entrada registrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    movements
                      .filter(m => m.type === 'ENTRADA')
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 20)
                      .map((mov) => {
                        const prod = products.find(p => p.id === mov.productId);
                        return (
                          <TableRow key={mov.id} className="hover:bg-muted/20 h-12">
                            <TableCell className="text-sm font-bold">{prod?.name}</TableCell>
                            <TableCell className="text-center text-sm font-black">{mov.quantity}</TableCell>
                            <TableCell className="text-center text-xs font-bold">R$ {mov.unitCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right text-sm font-black text-primary">R$ {mov.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 text-[8px] font-black uppercase">
                                {mov.reason}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-[10px] font-bold text-muted-foreground">
                              {format(new Date(mov.date), 'dd/MM/yyyy HH:mm')}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600"
                                onClick={() => handleDeleteMovement(mov.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA SAÍDA */}
        <TabsContent value="saida" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">Saída de Estoque</h2>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Produtos saindo de acordo com pedidos</p>
            </div>
          </div>

          <Card className="border-none shadow-md overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-[9px] font-black uppercase">Produto</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center">Quantidade</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center">Custo Unit.</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-right">Total</TableHead>
                    <TableHead className="text-[9px] font-black uppercase">Pedido</TableHead>
                    <TableHead className="text-[9px] font-black uppercase">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.filter(m => m.type === 'SAIDA').length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic text-xs uppercase opacity-40">
                        Nenhuma saída de estoque.
                      </TableCell>
                    </TableRow>
                  ) : (
                    movements
                      .filter(m => m.type === 'SAIDA')
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((mov) => {
                        const prod = products.find(p => p.id === mov.productId);
                        return (
                          <TableRow key={mov.id} className="hover:bg-muted/20 h-12">
                            <TableCell className="text-sm font-bold">{prod?.name}</TableCell>
                            <TableCell className="text-center text-sm font-black text-red-600">{mov.quantity}</TableCell>
                            <TableCell className="text-center text-xs font-bold">R$ {mov.unitCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right text-sm font-black text-red-600">R$ {mov.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell>
                              <p className="font-mono text-[10px] font-black text-primary">{mov.relatedOrderId || '---'}</p>
                            </TableCell>
                            <TableCell className="text-[10px] font-bold text-muted-foreground">
                              {format(new Date(mov.date), 'dd/MM/yyyy HH:mm')}
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA MOVIMENTAÇÕES */}
        <TabsContent value="movimentacoes" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">Histórico de Movimentações</h2>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Todas as entradas e saídas</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2 font-bold uppercase text-[10px]" onClick={handleExportMovements}>
              <Download className="w-3.5 h-3.5" /> Exportar
            </Button>
          </div>

          {/* Filtros */}
          <div className="bg-white border rounded-xl p-4 space-y-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Filtros</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative md:col-span-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Produto ou motivo..." className="pl-8 h-8 text-xs font-bold"
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas</SelectItem>
                  <SelectItem value="ENTRADA">Apenas Entradas</SelectItem>
                  <SelectItem value="SAIDA">Apenas Saídas</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase text-muted-foreground"
                onClick={() => { setSearchTerm(''); setFilterType('TODAS'); setHistoricoDe(''); setHistoricoAte(''); }}>
                Limpar
              </Button>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <label className="text-[9px] font-black uppercase text-muted-foreground whitespace-nowrap">De:</label>
                <Input type="date" className="h-8 text-xs w-40" value={historicoDe} onChange={e => setHistoricoDe(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[9px] font-black uppercase text-muted-foreground whitespace-nowrap">Até:</label>
                <Input type="date" className="h-8 text-xs w-40" value={historicoAte} onChange={e => setHistoricoAte(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Tabela */}
          <Card className="border-none shadow-md overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-[9px] font-black uppercase">Data/Hora</TableHead>
                    <TableHead className="text-[9px] font-black uppercase">Produto</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center">Tipo</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center">Qtd</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center">Custo Unit.</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-right">Total</TableHead>
                    <TableHead className="text-[9px] font-black uppercase">Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground italic text-xs uppercase opacity-40">
                        Nenhuma movimentação encontrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMovements
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((mov) => {
                        const prod = products.find(p => p.id === mov.productId);
                        return (
                          <TableRow key={mov.id} className="hover:bg-muted/20 h-12">
                            <TableCell className="text-[10px] font-bold text-muted-foreground">
                              {format(new Date(mov.date), 'dd/MM/yyyy HH:mm')}
                            </TableCell>
                            <TableCell className="text-sm font-bold">{prod?.name}</TableCell>
                            <TableCell className="text-center">
                              <Badge className={mov.type === 'ENTRADA' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'} variant="outline">
                                <span className="text-[8px] font-black uppercase">
                                  {mov.type === 'ENTRADA' ? 'Entrada' : 'Saída'}
                                </span>
                              </Badge>
                            </TableCell>
                            <TableCell className={`text-center text-sm font-black ${mov.type === 'ENTRADA' ? 'text-green-600' : 'text-red-600'}`}>
                              {mov.type === 'ENTRADA' ? '+' : '-'}{mov.quantity}
                            </TableCell>
                            <TableCell className="text-center text-xs font-bold">R$ {mov.unitCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right text-sm font-black">
                              {mov.type === 'ENTRADA' ? (
                                <span className="text-green-600">R$ {mov.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              ) : (
                                <span className="text-red-600">R$ {mov.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-[10px] font-bold text-muted-foreground">{mov.reason}</TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
