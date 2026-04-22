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
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Package, FileDown, CheckCircle, Clock, Printer, ShieldCheck, Factory,
  ArrowRight, Info, Box, MapPin, ArrowUpRight, ArrowDownRight, Plus, Search, ChevronDown, History
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ProductionStage, Product } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';




export default function ProducaoEstoquePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewProductOpen, setIsNewProductOpen] = useState(false);
  const [groupByCity, setGroupByCity] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);
  const { orders, products, updateProductionStage, updateOrderStatus, isReady, } = useSystemData();
  const [historicoSearch, setHistoricoSearch] = useState('');
  const [historicoStatus, setHistoricoStatus] = useState('ALL');
  const [historicoDe, setHistoricoDe] = useState('');
  const [historicoAte, setHistoricoAte] = useState('');
  const [historicoCidade, setHistoricoCidade] = useState('ALL');

  const productionOrders = orders.filter(o => o.status === 'PRODUCAO');
  const historicOrders = orders.filter(o => o.status !== 'PRODUCAO' && o.status !== 'PENDENTE');

  const historicoFiltered = useMemo(() => {
    return historicOrders.filter(o => {
      const matchSearch = !historicoSearch ||
        o.customerName?.toLowerCase().includes(historicoSearch.toLowerCase()) ||
        o.id?.toLowerCase().includes(historicoSearch.toLowerCase());
      const matchStatus = historicoStatus === 'ALL' || o.status === historicoStatus;
      const matchCidade = historicoCidade === 'ALL' || o.city === historicoCidade;
      const orderDate = new Date(o.createdAt);
      const matchDe = !historicoDe || orderDate >= new Date(historicoDe);
      const matchAte = !historicoAte || orderDate <= new Date(historicoAte);
      return matchSearch && matchStatus && matchCidade && matchDe && matchAte;
    });
  }, [historicOrders, historicoSearch, historicoStatus, historicoCidade, historicoDe, historicoAte]);

  const lotesDisponiveis = useMemo(() => {
    return [...new Set(historicOrders.map(o => o.status).filter(Boolean))];
  }, [historicOrders]);

  const cidadesDisponiveis = useMemo(() => {
    return [...new Set(historicOrders.map(o => o.city).filter(Boolean))];
  }, [historicOrders]);
  const groupedProduction = useMemo(() => {
    if (!groupByCity) return { 'Todas as Ordens': productionOrders };
    return productionOrders.reduce((acc, order) => {
      const city = order.city || 'Sem Cidade';
      if (!acc[city]) acc[city] = [];
      acc[city].push(order);
      return acc;
    }, {} as Record<string, typeof productionOrders>);
  }, [productionOrders, groupByCity]);

  if (!isReady) return null;



  const getStageColor = (stage: ProductionStage) => {
    switch (stage) {
      case 'FILA': return 'bg-slate-100 text-slate-700';
      case 'PROCESSO': return 'bg-orange-100 text-orange-700';
      case 'QUALIDADE': return 'bg-blue-100 text-blue-700';
      case 'CONCLUIDO': return 'bg-green-100 text-green-700';
      default: return 'bg-muted';
    }
  };

  const getProgressValue = (stage: ProductionStage) => {
    switch (stage) {
      case 'FILA': return 10;
      case 'PROCESSO': return 40;
      case 'QUALIDADE': return 80;
      case 'CONCLUIDO': return 100;
      default: return 0;
    }
  };

  const statusColors: Record<string, string> = {
    PRONTO_LOGISTICA: 'bg-blue-100 text-blue-800 border-blue-200',
    ENTREGA: 'bg-purple-100 text-purple-800 border-purple-200',
    AGUARDANDO_FATURAMENTO: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    FATURADO: 'bg-green-100 text-green-800 border-green-200',
    REJEITADO: 'bg-red-100 text-red-800 border-red-200',
  };

  const statusLabels: Record<string, string> = {
    PRONTO_LOGISTICA: 'Expedição',
    ENTREGA: 'Em Entrega',
    AGUARDANDO_FATURAMENTO: 'Financeiro',
    FATURADO: 'Finalizado',
    REJEITADO: 'Rejeitado',
  };

  const handleExportHistorico = () => {
    const rows: any[] = [];

    historicoFiltered.forEach(order => {
      order.items.forEach((item, idx) => {
        const prod = products.find(p => p.id === item.productId);
        rows.push({
          PEDIDO: idx === 0 ? order.id : '',
          CLIENTE: idx === 0 ? order.customerName : '',
          CIDADE: idx === 0 ? order.city : '',
          PRODUTO: prod?.name || item.productId,
          SACOS: item.quantity,
          'PESO KG': ((prod?.weight || 0) * item.quantity).toFixed(2),
          VALOR: idx === 0 ? order.totalValue : '',
          STATUS: idx === 0 ? (statusLabels[order.status] || order.status) : '',
          APROVADO: idx === 0 && (order as any).approvedAt ? new Date((order as any).approvedAt).toLocaleString('pt-BR') : '',
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Histórico');
    XLSX.writeFile(wb, `Historico_Producao_${format(new Date(), 'ddMMyy')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="producao" className="w-full">
        <TabsList className="grid w-full max-w-[600px] grid-cols-2">
          <TabsTrigger value="producao" className="gap-2 font-bold text-xs uppercase"><Factory className="w-4 h-4" /> Produção</TabsTrigger>
          <TabsTrigger value="historico" className="gap-2 font-bold text-xs uppercase"><History className="w-4 h-4" /> Histórico</TabsTrigger>
        </TabsList>

        {/* ABA PRODUÇÃO */}
        <TabsContent value="producao" className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-tight">Fila de Produção</h2>
              <p className="text-[9px] sm:text-[10px] font-bold uppercase text-muted-foreground">Baixa automática de insumos ao concluir</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className={`gap-2 font-bold uppercase text-[9px] sm:text-[10px] w-full sm:w-auto ${groupByCity ? 'bg-primary/10 border-primary text-primary' : ''}`}
              onClick={() => setGroupByCity(!groupByCity)}
            >
              <MapPin className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> Agrupar Cidade
            </Button>
          </div>

          {Object.keys(groupedProduction).map((city, idx) => {
            const cityOrders = groupedProduction[city];
            const totalUnits = cityOrders.reduce((acc, o) => acc + o.items.reduce((s, i) => s + i.quantity, 0), 0);
            const totalKgCity = cityOrders.reduce((acc, o) => acc + (o.totalWeight || 0), 0);

            return (
              <div key={city} className={idx > 0 ? 'border-t-4 border-primary/10 pt-4' : ''}>
                {groupByCity && (
                  <div className="bg-primary/5 px-3 sm:px-4 py-2 border rounded-t-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h3 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                      <MapPin className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> {city}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[8px] sm:text-[9px] bg-white">{cityOrders.length} OP's</Badge>
                      <Badge variant="outline" className="text-[8px] sm:text-[9px] bg-white">{totalUnits} UN</Badge>
                      <Badge variant="outline" className="text-[8px] sm:text-[9px] bg-white">{totalKgCity.toFixed(2)} KG</Badge>
                    </div>
                  </div>
                )}
                <Card className={`border-none shadow-md overflow-x-auto ${groupByCity ? 'rounded-tl-none rounded-tr-none' : ''}`}>
                  <CardContent className="p-0 min-w-full">
                    <Table className="min-w-full">
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="text-[8px] sm:text-[9px] font-black uppercase">OP / Cliente</TableHead>
                          <TableHead className="text-[8px] sm:text-[9px] font-black uppercase hidden sm:table-cell">Itens do Pedido</TableHead>
                          <TableHead className="text-[8px] sm:text-[9px] font-black uppercase w-28 sm:w-36 hidden md:table-cell">Progresso</TableHead>
                          <TableHead className="text-[8px] sm:text-[9px] font-black uppercase text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cityOrders.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-12 sm:py-16 text-muted-foreground italic text-xs uppercase opacity-40">
                              Sem ordens em fabricação.
                            </TableCell>
                          </TableRow>
                        )}
                        {cityOrders.map((order) => {
                          const stage = order.productionStage || 'FILA';
                          const totalOrderKg = order.items.reduce((acc, i) => {
                            const prod = products.find(p => p.id === i.productId);
                            return acc + ((prod?.weight || 0) * i.quantity);
                          }, 0);
                          const totalOrderUnits = order.items.reduce((acc, i) => acc + i.quantity, 0);

                          return (
                            <TableRow key={order.id} className="hover:bg-muted/20 align-top">
                              <TableCell className="py-3 sm:py-4">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-mono font-black text-primary text-[10px] sm:text-xs">OP-{order.id.split('-')[1]}</span>
                                  <span className="text-[10px] sm:text-[11px] font-black uppercase">{order.customerName}</span>
                                  <span className="text-[8px] sm:text-[9px] text-muted-foreground flex items-center gap-1">
                                    <MapPin className="w-2.5 sm:w-3 h-2.5 sm:h-3" /> {order.city}
                                  </span>
                                  <div className="flex gap-2 mt-1 flex-wrap">
                                    <Badge variant="outline" className="text-[7px] sm:text-[8px] font-black">{totalOrderUnits} UN</Badge>
                                    <Badge variant="outline" className="text-[7px] sm:text-[8px] font-black">{totalOrderKg.toFixed(2)} KG</Badge>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-3 sm:py-4 hidden sm:table-cell">
                                <div className="flex flex-col gap-2">
                                  {order.items.map(item => {
                                    const prod = products.find(p => p.id === item.productId);
                                    return (
                                      <div key={item.productId} className="text-[9px] sm:text-[10px] bg-white border rounded-lg px-2 sm:px-3 py-2 max-w-xs">
                                        <p className="font-black text-primary uppercase text-[9px] sm:text-[10px]">{prod?.name}</p>
                                        <div className="flex gap-2 sm:gap-4 mt-1 text-[8px] sm:text-[9px] text-muted-foreground font-bold">
                                          <span>{item.quantity} un</span>
                                          <span>{((prod?.weight || 0) * item.quantity).toFixed(2)} kg</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </TableCell>
                              <TableCell className="py-3 sm:py-4 hidden md:table-cell">
                                <div className="space-y-1.5">
                                  <Progress value={getProgressValue(stage)} className="h-1" />
                                  <Badge variant="secondary" className={`${getStageColor(stage)} text-[7px] sm:text-[8px] font-black uppercase h-4`}>
                                    {stage}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="py-3 sm:py-4 text-right">
                                <div className="flex flex-col sm:flex-row justify-end gap-1">
                                  {stage === 'FILA' && (
                                    <Button size="sm" variant="outline"
                                      className="h-7 sm:h-8 gap-1 sm:gap-1.5 font-black text-[7px] sm:text-[9px] uppercase border text-nowrap"
                                      onClick={() => setSelectedOrderDetails(order)}>
                                      <Info className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> <span className="hidden sm:inline">Visualizar Pedido</span><span className="sm:hidden">Ver</span>
                                    </Button>
                                  )}
                                  {stage === 'PROCESSO' && (
                                    <div className="flex flex-col sm:flex-row gap-1">
                                      <Button size="sm" variant="outline"
                                        className="h-7 sm:h-8 gap-1 sm:gap-1.5 font-black text-[7px] sm:text-[9px] uppercase border text-nowrap"
                                        onClick={() => setSelectedOrderDetails(order)}>
                                        <Info className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> <span className="hidden sm:inline">Ver</span>
                                      </Button>
                                      <Button size="sm" variant="outline"
                                        className="h-7 sm:h-8 gap-1 sm:gap-1.5 font-black text-[7px] sm:text-[9px] uppercase border text-blue-600 border-blue-200 hover:bg-blue-50 text-nowrap"
                                        onClick={() => {
                                          updateProductionStage(order.id, 'QUALIDADE');
                                          toast({ title: "Pedido Conferido", description: "Aguardando aprovação final." });
                                        }}>
                                        <ArrowRight className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> Confirmar
                                      </Button>
                                    </div>
                                  )}
                                  {stage === 'QUALIDADE' && (
                                    <Button size="sm"
                                      className="h-7 sm:h-8 gap-1 sm:gap-1.5 font-black text-[7px] sm:text-[9px] uppercase bg-green-600 hover:bg-green-700 text-nowrap"
                                      onClick={async () => {
                                        const result = await updateOrderStatus(order.id, 'PRONTO_LOGISTICA', { approvedAt: new Date().toISOString() });
                                        if ((result as any).stockWarnings?.length) {
                                          toast({
                                            variant: 'destructive',
                                            title: 'Atenção: Estoque Insuficiente',
                                            description: (result as any).stockWarnings.join(' | '),
                                          });
                                        } else {
                                          toast({ title: "Produção Aprovada", description: "Pedido enviado para expedição." });
                                        }
                                      }}>
                                      <ShieldCheck className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> <span className="hidden md:inline">Aprovar Produção</span><span className="md:hidden">Aprovar</span>
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </TabsContent>

        {/* ABA HISTÓRICO */}
        <TabsContent value="historico" className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-tight">Histórico de Produção</h2>
              <p className="text-[9px] sm:text-[10px] font-bold uppercase text-muted-foreground">Todos os pedidos processados</p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-[8px] sm:text-[9px] font-bold text-muted-foreground uppercase">
                {historicoFiltered.length} pedidos
              </span>
              <Button variant="outline" size="sm" className="gap-2 font-bold uppercase text-[9px] sm:text-[10px]" onClick={handleExportHistorico}>
                <FileDown className="w-3.5 h-3.5" /> Exportar
              </Button>
            </div>
          </div>

          {/* Painel de Filtros */}
          <div className="bg-white border rounded-xl p-3 sm:p-4 space-y-3">
            <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-muted-foreground">Filtros</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Pedido ou cliente..." className="pl-8 h-8 text-[12px] sm:text-xs font-bold"
                  value={historicoSearch} onChange={e => setHistoricoSearch(e.target.value)} />
              </div>
              <Select value={historicoStatus} onValueChange={setHistoricoStatus}>
                <SelectTrigger className="h-8 text-[12px] sm:text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Status</SelectItem>
                  {Object.entries(statusLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={historicoCidade} onValueChange={setHistoricoCidade}>
                <SelectTrigger className="h-8 text-[12px] sm:text-xs"><SelectValue placeholder="Cidade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as Cidades</SelectItem>
                  {cidadesDisponiveis.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" className="h-8 text-[9px] sm:text-[10px] font-black uppercase text-muted-foreground"
                onClick={() => { setHistoricoSearch(''); setHistoricoStatus('ALL'); setHistoricoCidade('ALL'); setHistoricoDe(''); setHistoricoAte(''); }}>
                Limpar
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <label className="text-[8px] sm:text-[9px] font-black uppercase text-muted-foreground whitespace-nowrap">De:</label>
                <Input type="date" className="h-8 text-[11px] sm:text-xs flex-1" value={historicoDe} onChange={e => setHistoricoDe(e.target.value)} />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <label className="text-[8px] sm:text-[9px] font-black uppercase text-muted-foreground whitespace-nowrap">Até:</label>
                <Input type="date" className="h-8 text-[11px] sm:text-xs flex-1" value={historicoAte} onChange={e => setHistoricoAte(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Lista de Pedidos */}
          {historicoFiltered.length === 0 && (
            <Card className="border-none shadow-md">
              <CardContent className="py-16 text-center text-muted-foreground italic text-xs uppercase opacity-40">
                Nenhum pedido encontrado.
              </CardContent>
            </Card>
          )}

          <Card className="border-none shadow-md overflow-x-auto">
            <CardContent className="p-0 min-w-full">
              <Table className="min-w-full">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-[8px] sm:text-[9px] font-black uppercase">Pedido</TableHead>
                    <TableHead className="text-[8px] sm:text-[9px] font-black uppercase hidden sm:table-cell">Cliente</TableHead>
                    <TableHead className="text-[8px] sm:text-[9px] font-black uppercase hidden md:table-cell">Cidade</TableHead>
                    <TableHead className="text-[8px] sm:text-[9px] font-black uppercase text-center">Itens</TableHead>
                    <TableHead className="text-[8px] sm:text-[9px] font-black uppercase text-center hidden lg:table-cell">Peso</TableHead>
                    <TableHead className="text-[8px] sm:text-[9px] font-black uppercase text-right hidden md:table-cell">Valor</TableHead>
                    <TableHead className="text-[8px] sm:text-[9px] font-black uppercase text-center w-20 sm:w-28">Status</TableHead>
                    <TableHead className="text-[8px] sm:text-[9px] font-black uppercase text-center hidden sm:table-cell">Aprovado</TableHead>
                    <TableHead className="w-8 sm:w-12 text-right pr-2 sm:pr-4"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historicoFiltered.map((order) => {
                    const totalUnitsOrder = order.items.reduce((acc, i) => acc + i.quantity, 0);
                    return (
                      <TableRow key={order.id} className="hover:bg-muted/20 h-10 sm:h-12">
                        <TableCell className="font-mono text-[10px] sm:text-[11px] font-black text-primary truncate">{order.id}</TableCell>
                        <TableCell className="text-[10px] sm:text-[11px] font-black uppercase hidden sm:table-cell">{order.customerName}</TableCell>
                        <TableCell className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase hidden md:table-cell">{order.city || '---'}</TableCell>
                        <TableCell className="text-center text-[9px] sm:text-[10px] font-black">{totalUnitsOrder} un</TableCell>
                        <TableCell className="text-center text-[9px] sm:text-[10px] font-black hidden lg:table-cell">{order.totalWeight?.toFixed(2)} kg</TableCell>
                        <TableCell className="text-right text-[10px] sm:text-[11px] font-black hidden md:table-cell">R$ {(order.totalValue || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`${statusColors[order.status] || ''} text-[7px] sm:text-[8px] font-black uppercase px-1 h-4`}>
                            {statusLabels[order.status] || order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-[8px] sm:text-[9px] font-bold text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                          {(order as any).approvedAt ? new Date((order as any).approvedAt).toLocaleString('pt-BR') : '---'}
                        </TableCell>
                        <TableCell className="text-right pr-2 sm:pr-4">
                          <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-primary"
                            onClick={() => setSelectedOrderDetails(order)}>
                            <Info className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
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

      {/* MODAL DETALHES DO PEDIDO */}
      <Dialog open={!!selectedOrderDetails} onOpenChange={(open) => !open && setSelectedOrderDetails(null)}>
        <DialogContent className="max-w-4xl max-h-[95vh] p-0 overflow-hidden bg-white w-full sm:w-auto">
          <DialogTitle className="sr-only">Detalhes do Pedido {selectedOrderDetails?.id}</DialogTitle>
          {selectedOrderDetails && (
            <div className="flex flex-col max-h-[95vh]">
              <div className="bg-primary px-4 sm:px-8 py-3 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between shrink-0 gap-3">
                <div>
                  <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-white/50 mb-0.5">{selectedOrderDetails.id}</p>
                  <h2 className="text-base sm:text-xl font-black uppercase text-white tracking-tight">{selectedOrderDetails.customerName}</h2>
                  <p className="text-[9px] sm:text-[10px] font-bold text-white/60 uppercase mt-0.5">{selectedOrderDetails.city}</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  {selectedOrderDetails.productionStage === 'FILA' && (
                    <Button size="sm"
                      className="h-8 gap-1.5 font-black text-[8px] sm:text-[9px] uppercase bg-orange-600 hover:bg-orange-700 text-nowrap"
                      onClick={() => {
                        updateProductionStage(selectedOrderDetails.id, 'PROCESSO');
                        toast({ title: "Produção Iniciada", description: "Pedido movido para processamento." });
                        setSelectedOrderDetails(null);
                      }}>
                      <ArrowRight className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> Aprovar
                    </Button>
                  )}
                  {selectedOrderDetails.productionStage === 'PROCESSO' && (
                    <Button size="sm"
                      className="h-8 gap-1.5 font-black text-[8px] sm:text-[9px] uppercase bg-blue-600 hover:bg-blue-700 text-nowrap"
                      onClick={() => {
                        updateProductionStage(selectedOrderDetails.id, 'QUALIDADE');
                        toast({ title: "Pedido Conferido", description: "Aguardando aprovação final." });
                        setSelectedOrderDetails(null);
                      }}>
                      <ArrowRight className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> Confirmar
                    </Button>
                  )}
                  {selectedOrderDetails.productionStage === 'QUALIDADE' && (
                    <Button size="sm"
                      className="h-8 gap-1.5 font-black text-[8px] sm:text-[9px] uppercase bg-green-600 hover:bg-green-700 text-nowrap"
                      onClick={async () => {
                        const result = await updateOrderStatus(selectedOrderDetails.id, 'PRONTO_LOGISTICA', { approvedAt: new Date().toISOString() });
                        if ((result as any).stockWarnings?.length) {
                          toast({
                            variant: 'destructive',
                            title: 'Atenção: Estoque Insuficiente',
                            description: (result as any).stockWarnings.join(' | '),
                          });
                        } else {
                          toast({ title: "Produção Aprovada", description: "Pedido enviado para expedição." });
                        }
                        setSelectedOrderDetails(null);
                      }}>
                      <ShieldCheck className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> Aprovar
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-8 text-white/70 hover:text-white hover:bg-white/10 text-nowrap"
                    onClick={() => setSelectedOrderDetails(null)}>
                    Fechar
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x min-h-full">
                  <div className="p-4 sm:p-8 space-y-5 sm:space-y-7">
                    <div className="space-y-3">
                      <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-muted-foreground pb-2 border-b">Cliente</p>
                      {[
                        { label: 'Documento', value: selectedOrderDetails.customerDocument },
                        { label: 'Telefone', value: selectedOrderDetails.customerPhone },
                        { label: 'E-mail', value: selectedOrderDetails.customerEmail },
                        { label: 'Endereço', value: selectedOrderDetails.customerAddress },
                      ].map(f => (
                        <div key={f.label}>
                          <p className="text-[7px] sm:text-[8px] font-black uppercase text-muted-foreground mb-0.5">{f.label}</p>
                          <p className="text-[10px] sm:text-xs font-bold">{f.value || '---'}</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-muted-foreground pb-2 border-b">Comercial</p>
                      {[
                        { label: 'Vendedor', value: selectedOrderDetails.seller },
                        { label: 'Pagamento', value: selectedOrderDetails.paymentCondition?.replace(/_/g, ' ') },
                        { label: 'Emissão', value: selectedOrderDetails.createdAt ? new Date(selectedOrderDetails.createdAt).toLocaleString('pt-BR') : '---' },
                        { label: 'Previsão Entrega', value: selectedOrderDetails.deliveryDate ? new Date(selectedOrderDetails.deliveryDate).toLocaleDateString('pt-BR') : '---' },
                      ].map(f => (
                        <div key={f.label}>
                          <p className="text-[7px] sm:text-[8px] font-black uppercase text-muted-foreground mb-0.5">{f.label}</p>
                          <p className="text-[10px] sm:text-xs font-bold">{f.value || '---'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 sm:p-8 flex flex-col gap-5 sm:gap-6">
                    <div className="space-y-3">
                      <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-muted-foreground pb-2 border-b">Itens do Pedido</p>
                      <div className="space-y-2">
                        {selectedOrderDetails.items.map((item: any, idx: number) => {
                          const prod = products.find(p => p.id === item.productId);
                          return (
                            <div key={item.productId} className={`flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 sm:py-3 px-3 sm:px-4 rounded-lg gap-2 ${idx % 2 === 0 ? 'bg-muted/40' : ''}`}>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] sm:text-[11px] font-black uppercase truncate">{prod?.name}</p>
                                <p className="text-[8px] sm:text-[9px] text-muted-foreground font-bold font-mono">{item.productId}</p>
                              </div>
                              <div className="text-left sm:text-right shrink-0">
                                <p className="text-[9px] sm:text-[10px] font-black">{item.quantity} un × R$ {item.price.toLocaleString()}</p>
                                <p className="text-[10px] sm:text-xs font-black text-primary">R$ {(item.price * item.quantity).toLocaleString()}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="mt-auto pt-3 sm:pt-4 border-t space-y-2">
                      <div className="flex justify-between text-[9px] sm:text-[10px] font-bold text-muted-foreground">
                        <span>Quantidade total</span>
                        <span>{selectedOrderDetails.items.reduce((acc: number, i: any) => acc + i.quantity, 0)} un</span>
                      </div>
                      <div className="flex justify-between text-[9px] sm:text-[10px] font-bold text-muted-foreground">
                        <span>Peso total</span>
                        <span>{selectedOrderDetails.totalWeight?.toFixed(2)} KG</span>
                      </div>
                      <div className="flex justify-between text-[9px] sm:text-[10px] font-bold text-muted-foreground">
                        <span>Estágio</span>
                        <Badge className={`${getStageColor(selectedOrderDetails.productionStage || 'FILA')} text-[7px] sm:text-[8px] font-black uppercase px-2 h-5`}>
                          {selectedOrderDetails.productionStage || 'FILA'}
                        </Badge>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline pt-2 border-t gap-1">
                        <span className="text-[9px] sm:text-xs font-black uppercase text-primary">Total</span>
                        <span className="text-2xl sm:text-3xl font-black text-primary">R$ {selectedOrderDetails.totalValue.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t bg-white px-4 sm:px-8 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
                <div className="text-[9px] sm:text-[10px] font-bold text-muted-foreground">
                  <p className="uppercase">Etapa: <span className={`font-black ${getStageColor(selectedOrderDetails.productionStage || 'FILA')}`}>{selectedOrderDetails.productionStage || 'FILA'}</span></p>
                </div>
                <Button
                  className="w-full sm:w-auto h-9 gap-2 font-black text-[9px] sm:text-[10px] uppercase bg-primary hover:bg-primary/90 text-white text-nowrap"
                  onClick={() => {
                    const stage = selectedOrderDetails.productionStage || 'FILA';
                    if (stage === 'FILA') {
                      updateProductionStage(selectedOrderDetails.id, 'PROCESSO');
                      toast({ title: "Produção Iniciada", description: "Pedido movido para processamento." });
                    } else if (stage === 'PROCESSO') {
                      updateProductionStage(selectedOrderDetails.id, 'QUALIDADE');
                      toast({ title: "Pedido Conferido", description: "Aguardando aprovação final." });
                    } else if (stage === 'QUALIDADE') {
                      updateOrderStatus(selectedOrderDetails.id, 'PRONTO_LOGISTICA', { approvedAt: new Date().toISOString() }).then((result) => {
                        if ((result as any).stockWarnings?.length) {
                          toast({
                            variant: 'destructive',
                            title: 'Atenção: Estoque Insuficiente',
                            description: (result as any).stockWarnings.join(' | '),
                          });
                        } else {
                          toast({ title: "Produção Aprovada", description: "Pedido enviado para expedição." });
                        }
                      });
                    }
                    setSelectedOrderDetails(null);
                  }}
                >
                  <ArrowRight className="w-4 h-4" />
                  {selectedOrderDetails.productionStage === 'FILA' && 'Iniciar Produção'}
                  {selectedOrderDetails.productionStage === 'PROCESSO' && 'Conferir e Aprovar'}
                  {selectedOrderDetails.productionStage === 'QUALIDADE' && 'Liberar para Expedição'}
                  {!selectedOrderDetails.productionStage && 'Iniciar Produção'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div >
  );
}
