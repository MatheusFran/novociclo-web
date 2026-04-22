"use client";

import { useState, useMemo } from 'react';
import { useSystemData } from '@/server/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileCheck, ShieldCheck, ShieldAlert, Loader2, Eye, Search,
  History, CreditCard, User, MapPin, Package, FileText, Receipt, Layers
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function FaturamentoPage() {
  const { orders, products, updateOrderStatus, isReady } = useSystemData();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // ── Dialog de confirmação de faturamento ──
  const [faturarOrder, setFaturarOrder] = useState<any>(null);
  const [nfNumero, setNfNumero] = useState('');
  const [vendaDireta, setVendaDireta] = useState('');

  // Filtros fila
  const [filaSearch, setFilaSearch] = useState('');
  const [filaDe, setFilaDe] = useState('');
  const [filaAte, setFilaAte] = useState('');
  const [filaGroupByCity, setFilaGroupByCity] = useState(false);

  // Filtros histórico
  const [histSearch, setHistSearch] = useState('');
  const [histDe, setHistDe] = useState('');
  const [histAte, setHistAte] = useState('');
  const [histCidade, setHistCidade] = useState('ALL');

  const filaOrders = orders.filter(o => o.status === 'AGUARDANDO_FATURAMENTO');
  const historicoOrders = orders.filter(o => o.status === 'FATURADO' || o.status === 'REJEITADO');

  const filaFiltered = useMemo(() => {
    return filaOrders.filter(o => {
      const matchSearch = !filaSearch ||
        o.customerName?.toLowerCase().includes(filaSearch.toLowerCase()) ||
        o.id?.toLowerCase().includes(filaSearch.toLowerCase());
      const orderDate = new Date(o.createdAt);
      const matchDe = !filaDe || orderDate >= new Date(filaDe);
      const matchAte = !filaAte || orderDate <= new Date(filaAte);
      return matchSearch && matchDe && matchAte;
    });
  }, [filaOrders, filaSearch, filaDe, filaAte]);

  const cidadesDisponiveis = useMemo(() => [...new Set(historicoOrders.map(o => o.city).filter(Boolean))], [historicoOrders]);

  const histFiltered = useMemo(() => {
    return historicoOrders.filter(o => {
      const matchSearch = !histSearch ||
        o.customerName?.toLowerCase().includes(histSearch.toLowerCase()) ||
        o.id?.toLowerCase().includes(histSearch.toLowerCase());
      const matchCidade = histCidade === 'ALL' || o.city === histCidade;
      const orderDate = new Date(o.createdAt);
      const matchDe = !histDe || orderDate >= new Date(histDe);
      const matchAte = !histAte || orderDate <= new Date(histAte);
      return matchSearch && matchCidade && matchDe && matchAte;
    });
  }, [historicoOrders, histSearch, histCidade, histDe, histAte]);

  if (!isReady) return null;

  const totalFilaValor = filaFiltered.reduce((acc, o) => acc + (o.totalValue || 0), 0);
  const totalHistValor = histFiltered.filter(o => o.status === 'FATURADO').reduce((acc, o) => acc + (o.totalValue || 0), 0);

  const openFaturarDialog = (order: any) => {
    setFaturarOrder(order);
    setNfNumero('');
    setVendaDireta('');
    setSelectedOrder(null);
  };

  const handleConfirmFaturar = async () => {
    if (!vendaDireta.trim()) {
      toast({ variant: "destructive", title: "Campo obrigatório", description: "Informe o número da Venda Direta." });
      return;
    }
    setIsProcessing(faturarOrder.id);
    try {
      await new Promise(resolve => setTimeout(resolve, 1200));
      updateOrderStatus(faturarOrder.id, 'FATURADO', {
        invoicedAt: new Date().toISOString(),
        nfNumero: nfNumero.trim() || null,
        vendaDiretaNumero: vendaDireta.trim(),
      } as any);
      toast({ title: "Pedido Faturado", description: `Pedido ${faturarOrder.id} liberado para entrega.` });
      setFaturarOrder(null);
    } catch {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível faturar o pedido." });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReject = (orderId: string) => {
    updateOrderStatus(orderId, 'REJEITADO', { rejectedAt: new Date().toISOString() } as any);
    toast({ variant: "destructive", title: "Pedido Rejeitado", description: `Pedido ${orderId} enviado para revisão.` });
    setSelectedOrder(null);
  };

  return (
    <div className="space-y-6">
      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4">
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Fila de Faturamento</p>
            <p className="text-2xl font-black">{filaOrders.length} pedidos</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4">
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Valor na Fila</p>
            <p className="text-2xl font-black text-indigo-600">R$ {totalFilaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4">
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Finalizados</p>
            <p className="text-2xl font-black text-green-600">{historicoOrders.filter(o => o.status === 'FATURADO').length} pedidos</p>
          </CardContent>
        </Card>
        <Card className="bg-primary text-primary-foreground border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-[9px] font-black uppercase opacity-70 tracking-widest mb-1">Total Faturado</p>
            <p className="text-2xl font-black">R$ {totalHistValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="fila" className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="fila" className="gap-2 font-bold text-xs uppercase">
            <FileCheck className="w-4 h-4" /> Fila
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2 font-bold text-xs uppercase">
            <History className="w-4 h-4" /> Histórico
          </TabsTrigger>
        </TabsList>

        {/* ABA FILA */}
        <TabsContent value="fila" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">Fila de Faturamento</h2>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">
                Ao faturar, informe Venda Direta (obrigatório) e NF-35 (opcional)
              </p>
            </div>
            <span className="text-[9px] font-bold text-muted-foreground uppercase">{filaFiltered.length} pedidos</span>
          </div>

          <div className="bg-white border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Filtros</p>
              <Button
                variant={filaGroupByCity ? "default" : "ghost"}
                size="sm"
                className="h-7 gap-1.5 text-[9px] font-black uppercase"
                onClick={() => setFilaGroupByCity(!filaGroupByCity)}
              >
                <Layers className="w-3.5 h-3.5" /> {filaGroupByCity ? 'Desagrupar' : 'Agrupar por Cidade'}
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="relative md:col-span-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Pedido ou cliente..." className="pl-8 h-8 text-xs font-bold"
                  value={filaSearch} onChange={e => setFilaSearch(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[9px] font-black uppercase text-muted-foreground whitespace-nowrap">De:</label>
                <Input type="date" className="h-8 text-xs" value={filaDe} onChange={e => setFilaDe(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[9px] font-black uppercase text-muted-foreground whitespace-nowrap">Até:</label>
                <Input type="date" className="h-8 text-xs" value={filaAte} onChange={e => setFilaAte(e.target.value)} />
              </div>
            </div>
          </div>

          <Card className="border-none shadow-md overflow-hidden">
            <CardContent className="p-0">
              {!filaGroupByCity ? (
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-[9px] font-black uppercase">Pedido</TableHead>
                      <TableHead className="text-[9px] font-black uppercase">Cliente</TableHead>
                      <TableHead className="text-[9px] font-black uppercase">Cidade</TableHead>
                      <TableHead className="text-[9px] font-black uppercase">Vendedor</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-center">Sacos</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-center">Peso</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-center">Emissão</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-right">Valor</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filaFiltered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-16 text-muted-foreground italic text-xs uppercase opacity-40">
                          Nenhum pedido na fila.
                        </TableCell>
                      </TableRow>
                    )}
                    {filaFiltered.map(order => {
                      const totalSacos = order.items.reduce((acc: number, i: any) => acc + i.quantity, 0);
                      return (
                        <TableRow key={order.id} className="h-12 hover:bg-muted/20">
                          <TableCell className="font-mono text-[11px] font-black text-primary">{order.id}</TableCell>
                          <TableCell className="text-[11px] font-black uppercase">{order.customerName}</TableCell>
                          <TableCell className="text-[10px] font-bold text-muted-foreground uppercase">{order.city || '---'}</TableCell>
                          <TableCell className="text-[10px] font-bold text-muted-foreground">{order.seller || '---'}</TableCell>
                          <TableCell className="text-center text-[10px] font-black">{totalSacos}</TableCell>
                          <TableCell className="text-center text-[10px] font-black">{order.totalWeight?.toFixed(2)} kg</TableCell>
                          <TableCell className="text-center text-[9px] font-bold text-muted-foreground">
                            {format(new Date(order.createdAt), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="text-right text-[11px] font-black">
                            R$ {(order.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button variant="outline" size="sm" className="h-8 gap-1.5 font-black text-[9px] uppercase border-2"
                                onClick={() => setSelectedOrder(order)}>
                                <Eye className="w-3.5 h-3.5" /> Ver
                              </Button>
                              <Button variant="outline" size="sm"
                                className="h-8 gap-1.5 font-black text-[9px] uppercase border-2 text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => handleReject(order.id)}>
                                <ShieldAlert className="w-3.5 h-3.5" /> Rejeitar
                              </Button>
                              <Button size="sm"
                                className="h-8 gap-1.5 font-black text-[9px] uppercase bg-green-600 hover:bg-green-700"
                                onClick={() => openFaturarDialog(order)}>
                                <ShieldCheck className="w-3.5 h-3.5" /> Faturar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="space-y-0">
                  {filaFiltered.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground italic text-xs uppercase opacity-40">
                      Nenhum pedido na fila.
                    </div>
                  ) : (
                    Object.entries(
                      filaFiltered.reduce<Record<string, any[]>>((acc, order) => {
                        const city = order.city || 'SEM CIDADE';
                        if (!acc[city]) acc[city] = [];
                        acc[city].push(order);
                        return acc;
                      }, {})
                    ).sort(([cityA], [cityB]) => cityA.localeCompare(cityB)).map(([city, orders]) => {
                      const cityTotal = orders.reduce((acc, o) => acc + (o.totalValue || 0), 0);
                      const citySacos = orders.reduce((acc, o) => acc + o.items.reduce((s: number, i: any) => s + i.quantity, 0), 0);
                      return (
                        <div key={city} className="border-b last:border-b-0">
                          <div className="bg-primary/5 px-6 py-3 border-b sticky top-0 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-primary" />
                              <p className="font-black uppercase text-sm text-primary">{city}</p>
                            </div>
                            <div className="flex items-center gap-6 text-[10px] font-black">
                              <span className="text-muted-foreground">{(orders as any[]).length} pedidos</span>
                              <span className="text-muted-foreground">{citySacos} sacos</span>
                              <span className="text-primary">R$ {cityTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                          <Table>
                            <TableHeader className="bg-muted/30">
                              <TableRow>
                                <TableHead className="text-[9px] font-black uppercase">Pedido</TableHead>
                                <TableHead className="text-[9px] font-black uppercase">Cliente</TableHead>
                                <TableHead className="text-[9px] font-black uppercase">Vendedor</TableHead>
                                <TableHead className="text-[9px] font-black uppercase text-center">Sacos</TableHead>
                                <TableHead className="text-[9px] font-black uppercase text-center">Peso</TableHead>
                                <TableHead className="text-[9px] font-black uppercase text-center">Emissão</TableHead>
                                <TableHead className="text-[9px] font-black uppercase text-right">Valor</TableHead>
                                <TableHead className="text-[9px] font-black uppercase text-right">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(orders as any[]).map(order => {
                                const totalSacos = order.items.reduce((acc: number, i: any) => acc + i.quantity, 0);
                                return (
                                  <TableRow key={order.id} className="h-12 hover:bg-muted/20">
                                    <TableCell className="font-mono text-[11px] font-black text-primary">{order.id}</TableCell>
                                    <TableCell className="text-[11px] font-black uppercase">{order.customerName}</TableCell>
                                    <TableCell className="text-[10px] font-bold text-muted-foreground">{order.seller || '---'}</TableCell>
                                    <TableCell className="text-center text-[10px] font-black">{totalSacos}</TableCell>
                                    <TableCell className="text-center text-[10px] font-black">{order.totalWeight?.toFixed(2)} kg</TableCell>
                                    <TableCell className="text-center text-[9px] font-bold text-muted-foreground">
                                      {format(new Date(order.createdAt), 'dd/MM/yyyy')}
                                    </TableCell>
                                    <TableCell className="text-right text-[11px] font-black">
                                      R$ {(order.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-1.5">
                                        <Button variant="outline" size="sm" className="h-8 gap-1.5 font-black text-[9px] uppercase border-2"
                                          onClick={() => setSelectedOrder(order)}>
                                          <Eye className="w-3.5 h-3.5" /> Ver
                                        </Button>
                                        <Button variant="outline" size="sm"
                                          className="h-8 gap-1.5 font-black text-[9px] uppercase border-2 text-red-600 border-red-200 hover:bg-red-50"
                                          onClick={() => handleReject(order.id)}>
                                          <ShieldAlert className="w-3.5 h-3.5" /> Rejeitar
                                        </Button>
                                        <Button size="sm"
                                          className="h-8 gap-1.5 font-black text-[9px] uppercase bg-green-600 hover:bg-green-700"
                                          onClick={() => openFaturarDialog(order)}>
                                          <ShieldCheck className="w-3.5 h-3.5" /> Faturar
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA HISTÓRICO */}
        <TabsContent value="historico" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">Histórico de Faturamento</h2>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Pedidos finalizados e rejeitados</p>
            </div>
            <span className="text-[9px] font-bold text-muted-foreground uppercase">{histFiltered.length} registros</span>
          </div>

          <div className="bg-white border rounded-xl p-4 space-y-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Filtros</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div className="relative md:col-span-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Pedido ou cliente..." className="pl-8 h-8 text-xs font-bold"
                  value={histSearch} onChange={e => setHistSearch(e.target.value)} />
              </div>
              <Select value={histCidade} onValueChange={setHistCidade}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Cidade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as Cidades</SelectItem>
                  {cidadesDisponiveis.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <label className="text-[9px] font-black uppercase text-muted-foreground whitespace-nowrap">De:</label>
                <Input type="date" className="h-8 text-xs" value={histDe} onChange={e => setHistDe(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[9px] font-black uppercase text-muted-foreground whitespace-nowrap">Até:</label>
                <Input type="date" className="h-8 text-xs" value={histAte} onChange={e => setHistAte(e.target.value)} />
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase text-muted-foreground"
              onClick={() => { setHistSearch(''); setHistCidade('ALL'); setHistDe(''); setHistAte(''); }}>
              Limpar Filtros
            </Button>
          </div>

          <Card className="border-none shadow-md overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-[9px] font-black uppercase">Pedido</TableHead>
                    <TableHead className="text-[9px] font-black uppercase">Cliente</TableHead>
                    <TableHead className="text-[9px] font-black uppercase">Cidade</TableHead>
                    <TableHead className="text-[9px] font-black uppercase">Vendedor</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center">Sacos</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center">Faturado em</TableHead>
                    <TableHead className="text-[9px] font-black uppercase">Venda Direta</TableHead>
                    <TableHead className="text-[9px] font-black uppercase">NF-35</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-right">Valor</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center w-24">Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {histFiltered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-16 text-muted-foreground italic text-xs uppercase opacity-40">
                        Nenhum registro no histórico.
                      </TableCell>
                    </TableRow>
                  )}
                  {histFiltered.map(order => {
                    const totalSacos = order.items.reduce((acc: number, i: any) => acc + i.quantity, 0);
                    const invoicedAt = (order as any).invoicedAt;
                    const rejectedAt = (order as any).rejectedAt;
                    const nf = (order as any).nfNumero;
                    const vd = (order as any).vendaDiretaNumero;
                    return (
                      <TableRow key={order.id} className="h-12 hover:bg-muted/20">
                        <TableCell className="font-mono text-[11px] font-black text-primary">{order.id}</TableCell>
                        <TableCell className="text-[11px] font-black uppercase">{order.customerName}</TableCell>
                        <TableCell className="text-[10px] font-bold text-muted-foreground uppercase">{order.city || '---'}</TableCell>
                        <TableCell className="text-[10px] font-bold text-muted-foreground">{order.seller || '---'}</TableCell>
                        <TableCell className="text-center text-[10px] font-black">{totalSacos}</TableCell>
                        <TableCell className="text-center text-[9px] font-bold text-muted-foreground">
                          {invoicedAt ? format(new Date(invoicedAt), 'dd/MM/yyyy HH:mm') :
                            rejectedAt ? format(new Date(rejectedAt), 'dd/MM/yyyy HH:mm') : '---'}
                        </TableCell>
                        <TableCell>
                          {vd
                            ? <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[9px] font-black font-mono">{vd}</span>
                            : <span className="text-muted-foreground/40 text-[9px]">—</span>}
                        </TableCell>
                        <TableCell>
                          {nf
                            ? <span className="bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded text-[9px] font-black font-mono">{nf}</span>
                            : <span className="text-muted-foreground/40 text-[9px]">—</span>}
                        </TableCell>
                        <TableCell className="text-right text-[11px] font-black">
                          R$ {(order.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`text-[8px] font-black uppercase px-2 h-5 ${order.status === 'FATURADO' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                            {order.status === 'FATURADO' ? 'Finalizado' : 'Rejeitado'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary"
                            onClick={() => setSelectedOrder(order)}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── DIALOG CONFIRMAR FATURAMENTO ── */}
      <Dialog open={!!faturarOrder} onOpenChange={(open) => { if (!open) setFaturarOrder(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black uppercase text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-600" /> Confirmar Faturamento
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase text-muted-foreground">
              {faturarOrder?.id} · {faturarOrder?.customerName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Resumo */}
            <div className="bg-muted/30 rounded-lg px-4 py-3 flex justify-between items-center border">
              <div>
                <p className="text-[9px] font-black uppercase text-muted-foreground">Cliente</p>
                <p className="text-xs font-black uppercase">{faturarOrder?.customerName}</p>
                <p className="text-[9px] font-bold text-muted-foreground">{faturarOrder?.city}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black uppercase text-muted-foreground">Valor Total</p>
                <p className="text-lg font-black text-primary">
                  R$ {(faturarOrder?.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Venda Direta — obrigatório */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                <Receipt className="w-3 h-3" /> Número da Venda Direta
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <Input
                placeholder="Ex: 123456"
                className="h-9 text-xs font-bold font-mono"
                value={vendaDireta}
                onChange={e => setVendaDireta(e.target.value)}
                autoFocus
              />
            </div>

            {/* NF-35 — opcional */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                <FileText className="w-3 h-3" /> Número da NF-35
                <span className="text-[9px] text-muted-foreground/60 font-normal normal-case">(opcional)</span>
              </label>
              <Input
                placeholder="Ex: 000123"
                className="h-9 text-xs font-bold font-mono"
                value={nfNumero}
                onChange={e => setNfNumero(e.target.value)}
              />
            </div>

            {/* Data — informativa */}
            <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3">
              <p className="text-[9px] font-black uppercase text-green-700 mb-0.5">Data de Faturamento</p>
              <p className="text-xs font-black text-green-800">
                {format(new Date(), 'dd/MM/yyyy')} às {format(new Date(), 'HH:mm')} — registrado automaticamente
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" className="font-bold text-xs uppercase"
              onClick={() => setFaturarOrder(null)}>
              Cancelar
            </Button>
            <Button size="sm"
              className="gap-2 font-black text-xs uppercase bg-green-600 hover:bg-green-700"
              disabled={isProcessing === faturarOrder?.id}
              onClick={handleConfirmFaturar}>
              {isProcessing === faturarOrder?.id
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <><ShieldCheck className="w-3.5 h-3.5" /> Confirmar Faturamento</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DETALHES DO PEDIDO */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white">
          {selectedOrder && (
            <div className="flex flex-col max-h-[90vh]">
              <div className="bg-primary px-8 py-5 flex items-center justify-between shrink-0">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-0.5">{selectedOrder.id}</p>
                  <h2 className="text-xl font-black uppercase text-white tracking-tight">{selectedOrder.customerName}</h2>
                  <div className="flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-white/60" />
                    <span className="text-sm font-black text-white/90 uppercase">{selectedOrder.city || '---'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedOrder.status === 'AGUARDANDO_FATURAMENTO' && (
                    <>
                      <Button size="sm" variant="outline"
                        className="h-8 gap-1.5 font-black text-[9px] uppercase border-2 text-red-400 border-red-300 hover:bg-red-50 bg-transparent"
                        onClick={() => handleReject(selectedOrder.id)}>
                        <ShieldAlert className="w-3.5 h-3.5" /> Rejeitar
                      </Button>
                      <Button size="sm"
                        className="h-8 gap-1.5 font-black text-[9px] uppercase bg-green-500 hover:bg-green-600"
                        onClick={() => openFaturarDialog(selectedOrder)}>
                        <ShieldCheck className="w-3.5 h-3.5" /> Faturar — Liberar Entrega
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="sm" className="h-8 text-white/70 hover:text-white hover:bg-white/10"
                    onClick={() => setSelectedOrder(null)}>
                    Fechar
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 divide-x">
                  <div className="p-8 space-y-7">
                    <div className="space-y-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground pb-2 border-b flex items-center gap-2">
                        <User className="w-3 h-3" /> Cliente
                      </p>
                      {[
                        { label: 'Documento', value: selectedOrder.customerDocument },
                        { label: 'Telefone', value: selectedOrder.customerPhone },
                        { label: 'E-mail', value: selectedOrder.customerEmail },
                        { label: 'Endereço', value: selectedOrder.customerAddress },
                      ].map((f: any) => (
                        <div key={f.label}>
                          <p className="text-[8px] font-black uppercase text-muted-foreground mb-0.5">{f.label}</p>
                          <p className="text-xs font-bold">{f.value || '---'}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground pb-2 border-b flex items-center gap-2">
                        <CreditCard className="w-3 h-3" /> Comercial
                      </p>
                      {[
                        { label: 'Vendedor', value: selectedOrder.seller },
                        { label: 'Pagamento', value: selectedOrder.paymentCondition?.replace(/_/g, ' ') },
                        { label: 'Emissão', value: format(new Date(selectedOrder.createdAt), 'dd/MM/yyyy HH:mm') },
                        { label: 'Previsão Entrega', value: selectedOrder.deliveryDate ? format(new Date(selectedOrder.deliveryDate), 'dd/MM/yyyy') : '---' },
                        { label: 'Faturado em', value: (selectedOrder as any).invoicedAt ? format(new Date((selectedOrder as any).invoicedAt), 'dd/MM/yyyy HH:mm') : '---' },
                      ].map((f: any) => (
                        <div key={f.label}>
                          <p className="text-[8px] font-black uppercase text-muted-foreground mb-0.5">{f.label}</p>
                          <p className="text-xs font-bold">{f.value || '---'}</p>
                        </div>
                      ))}
                    </div>

                    {/* Documentos fiscais — só aparece se houver */}
                    {((selectedOrder as any).vendaDiretaNumero || (selectedOrder as any).nfNumero) && (
                      <div className="space-y-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground pb-2 border-b flex items-center gap-2">
                          <FileText className="w-3 h-3" /> Documentos Fiscais
                        </p>
                        {(selectedOrder as any).vendaDiretaNumero && (
                          <div>
                            <p className="text-[8px] font-black uppercase text-muted-foreground mb-0.5">Venda Direta</p>
                            <p className="text-xs font-black font-mono text-primary">{(selectedOrder as any).vendaDiretaNumero}</p>
                          </div>
                        )}
                        {(selectedOrder as any).nfNumero && (
                          <div>
                            <p className="text-[8px] font-black uppercase text-muted-foreground mb-0.5">NF-35</p>
                            <p className="text-xs font-black font-mono">{(selectedOrder as any).nfNumero}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {(selectedOrder as any).observations && (
                      <div className="space-y-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground pb-2 border-b">
                          Observações
                        </p>
                        <p className="text-xs font-medium text-slate-600 leading-relaxed bg-muted/40 rounded-lg p-3">
                          {(selectedOrder as any).observations}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="p-8 flex flex-col gap-6">
                    <div className="space-y-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground pb-2 border-b flex items-center gap-2">
                        <Package className="w-3 h-3" /> Itens do Pedido
                      </p>
                      <div className="space-y-2">
                        {selectedOrder.items.map((item: any, idx: number) => {
                          const prod = products.find((p: any) => p.id === item.productId);
                          return (
                            <div key={item.productId} className={`flex items-center justify-between py-3 px-4 rounded-lg ${idx % 2 === 0 ? 'bg-muted/40' : ''}`}>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-black uppercase truncate">{prod?.name || item.productId}</p>
                                <p className="text-[9px] text-muted-foreground font-bold font-mono">{item.productId}</p>
                              </div>
                              <div className="text-right shrink-0 ml-4">
                                <p className="text-[10px] font-black">
                                  <span className="text-primary font-black text-sm">{item.quantity}</span>
                                  <span className="text-[9px] font-black text-muted-foreground ml-1 uppercase">{prod?.uom || 'un'}</span>
                                  <span className="text-muted-foreground"> × R$ {item.price.toLocaleString()}</span>
                                </p>
                                <p className="text-xs font-black text-primary">R$ {(item.price * item.quantity).toLocaleString()}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="mt-auto pt-4 border-t space-y-2">
                      <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                        <span>Quantidade total</span>
                        <span>{selectedOrder.items.reduce((acc: number, i: any) => acc + i.quantity, 0)} un</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                        <span>Peso total</span>
                        <span>{selectedOrder.totalWeight?.toFixed(2)} KG</span>
                      </div>
                      <div className="flex justify-between items-baseline pt-2 border-t">
                        <span className="text-xs font-black uppercase text-primary">Total</span>
                        <span className="text-3xl font-black text-primary">R$ {selectedOrder.totalValue.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}