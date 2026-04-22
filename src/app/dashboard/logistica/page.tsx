"use client"

import { useSystemData } from '@/server/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Truck, MapPin, Navigation, CheckSquare, Package,
  ChevronDown, ChevronUp, X, History, Printer, PlayCircle,
  Calendar, Clock, AlertTriangle, Search, RotateCcw, User
} from 'lucide-react';
import { useState, useRef, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

// ─── Constantes ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  AGUARDANDO_FATURAMENTO: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  FATURADO: 'bg-green-100 text-green-800 border-green-200',
  ENTREGA: 'bg-purple-100 text-purple-800 border-purple-200',
  ENTREGUE: 'bg-zinc-100 text-zinc-600 border-zinc-200',
};

const STATUS_LABELS: Record<string, string> = {
  AGUARDANDO_FATURAMENTO: 'Ag. Faturamento',
  FATURADO: 'Lib. Entrega',
  ENTREGA: 'Em Entrega',
  ENTREGUE: 'Entregue',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcSacos(order: any) {
  return order.items.reduce((s: number, i: any) => s + i.quantity, 0);
}

function calcPeso(order: any) {
  return order.totalWeight || 0;
}

function calcValor(order: any) {
  return order.totalValue || 0;
}

function formatDate(date: string | undefined, withTime = false) {
  if (!date) return '---';
  try {
    return format(new Date(date), withTime ? 'dd/MM/yy HH:mm' : 'dd/MM/yy');
  } catch {
    return '---';
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function LogisticaPage() {
  const {
    orders, products, vehicles, drivers,
    updateOrderStatus, confirmDelivery, isReady,
  } = useSystemData();

  // ── Expedição: seleção ───────────────────────────────────────────────────
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [expandedCities, setExpandedCities] = useState<Record<string, boolean>>({});
  const [expSearch, setExpSearch] = useState('');

  // ── Modal: aceitar pedidos ───────────────────────────────────────────────
  const [isAceitarOpen, setIsAceitarOpen] = useState(false);
  const [aceitarOrderIds, setAceitarOrderIds] = useState<string[]>([]);
  const [aceitarData, setAceitarData] = useState({
    vehicleId: '',
    driverId: '',
    scheduledDeliveryDate: '',
  });

  // ── Modal: romaneio ──────────────────────────────────────────────────────
  const [isRomaneioOpen, setIsRomaneioOpen] = useState(false);
  const [romaneioOrders, setRomaneioOrders] = useState<string[]>([]);
  const romaneioRef = useRef<HTMLDivElement>(null);

  // ── Modal: reverter pedido ───────────────────────────────────────────────
  const [isReverterOpen, setIsReverterOpen] = useState(false);
  const [reverterOrderId, setReverterOrderId] = useState<string | null>(null);

  // ── Histórico: filtros ───────────────────────────────────────────────────
  const [histSearch, setHistSearch] = useState('');
  const [histStatus, setHistStatus] = useState('ALL');
  const [histCidade, setHistCidade] = useState('ALL');
  const [histDe, setHistDe] = useState('');
  const [histAte, setHistAte] = useState('');

  // ── Em rota: filtros ─────────────────────────────────────────────────────
  const [rotaSearch, setRotaSearch] = useState('');
  const [rotaCidade, setRotaCidade] = useState('ALL');
  const [rotaVeiculo, setRotaVeiculo] = useState('ALL');

  // ─── Derivações de pedidos ───────────────────────────────────────────────
  const expedicaoOrders = useMemo(() =>
    orders.filter(o => o.status === 'AGUARDANDO_FATURAMENTO'), [orders]);

  const aguardandoFaturamentoOrders = useMemo(() =>
    orders.filter(o => o.status === 'AGUARDANDO_FATURAMENTO'), [orders]);

  const faturadosOrders = useMemo(() =>
    orders.filter(o => o.status === 'FATURADO'), [orders]);

  const emRotaOrders = useMemo(() =>
    orders.filter(o => o.status === 'ENTREGA'), [orders]);

  const historicoOrders = useMemo(() =>
    orders.filter(o => ['ENTREGA', 'FATURADO', 'ENTREGUE'].includes(o.status)), [orders]);

  // ─── Agrupamentos por cidade ─────────────────────────────────────────────
  function groupByCity<T extends { city?: string }>(list: T[]) {
    return list.reduce((acc, order) => {
      const city = order.city || 'Sem Cidade';
      if (!acc[city]) acc[city] = [];
      acc[city].push(order);
      return acc;
    }, {} as Record<string, T[]>);
  }

  const groupedByCity = useMemo(() => {
    const filtered = expSearch
      ? expedicaoOrders.filter(o =>
        o.customerName?.toLowerCase().includes(expSearch.toLowerCase()) ||
        o.id?.toLowerCase().includes(expSearch.toLowerCase()))
      : expedicaoOrders;
    return groupByCity(filtered);
  }, [expedicaoOrders, expSearch]);

  const groupedFaturamento = useMemo(() =>
    groupByCity(aguardandoFaturamentoOrders), [aguardandoFaturamentoOrders]);

  const groupedFaturados = useMemo(() =>
    groupByCity(faturadosOrders), [faturadosOrders]);

  // ─── Filtros em rota ─────────────────────────────────────────────────────
  const rotaCidades = useMemo(() =>
    [...new Set(emRotaOrders.map(o => o.city).filter(Boolean))], [emRotaOrders]);

  const rotaVeiculos = useMemo(() =>
    vehicles.filter(v => emRotaOrders.some(o => o.assignedVehicleId === v.id)), [emRotaOrders, vehicles]);

  const rotaFiltered = useMemo(() => {
    return emRotaOrders.filter(o => {
      const matchSearch = !rotaSearch ||
        o.customerName?.toLowerCase().includes(rotaSearch.toLowerCase()) ||
        o.id?.toLowerCase().includes(rotaSearch.toLowerCase());
      const matchCidade = rotaCidade === 'ALL' || o.city === rotaCidade;
      const matchVeiculo = rotaVeiculo === 'ALL' || o.assignedVehicleId === rotaVeiculo;
      return matchSearch && matchCidade && matchVeiculo;
    });
  }, [emRotaOrders, rotaSearch, rotaCidade, rotaVeiculo]);

  // ─── Filtros histórico ───────────────────────────────────────────────────
  const cidadesDisponiveis = useMemo(() =>
    [...new Set(historicoOrders.map(o => o.city).filter(Boolean))], [historicoOrders]);

  const historicoFiltered = useMemo(() => {
    return historicoOrders.filter(o => {
      const matchSearch = !histSearch ||
        o.customerName?.toLowerCase().includes(histSearch.toLowerCase()) ||
        o.id?.toLowerCase().includes(histSearch.toLowerCase());
      const matchStatus = histStatus === 'ALL' || o.status === histStatus;
      const matchCidade = histCidade === 'ALL' || o.city === histCidade;
      // Filtra por departureTime (data real de saída), não createdAt
      const departureDate = (o as any).departureTime ? new Date((o as any).departureTime) : null;
      const matchDe = !histDe || (departureDate && departureDate >= new Date(histDe));
      const matchAte = !histAte || (departureDate && departureDate <= new Date(histAte + 'T23:59:59'));
      return matchSearch && matchStatus && matchCidade && matchDe && matchAte;
    });
  }, [historicoOrders, histSearch, histStatus, histCidade, histDe, histAte]);

  // ─── Seleção expedição ───────────────────────────────────────────────────
  const toggleOrder = useCallback((orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]);
  }, []);

  const toggleCity = useCallback((city: string) => {
    const cityOrderIds = groupedByCity[city]?.map(o => o.id) ?? [];
    const allSelected = cityOrderIds.every(id => selectedOrders.includes(id));
    setSelectedOrders(prev =>
      allSelected
        ? prev.filter(id => !cityOrderIds.includes(id))
        : [...new Set([...prev, ...cityOrderIds])]);
  }, [groupedByCity, selectedOrders]);

  const selectedOrdersData = useMemo(() =>
    orders.filter(o => selectedOrders.includes(o.id)), [orders, selectedOrders]);

  const totalSacosSelected = useMemo(() =>
    selectedOrdersData.reduce((acc, o) => acc + calcSacos(o), 0), [selectedOrdersData]);

  const totalPesoSelected = useMemo(() =>
    selectedOrdersData.reduce((acc, o) => acc + calcPeso(o), 0), [selectedOrdersData]);

  const totalValorSelected = useMemo(() =>
    selectedOrdersData.reduce((acc, o) => acc + calcValor(o), 0), [selectedOrdersData]);

  const citiesSelected = useMemo(() =>
    [...new Set(selectedOrdersData.map(o => o.city).filter(Boolean))], [selectedOrdersData]);

  // ─── Capacidade do veículo selecionado ───────────────────────────────────
  const vehicleSelected = useMemo(() =>
    vehicles.find(v => v.id === aceitarData.vehicleId), [vehicles, aceitarData.vehicleId]);

  const pesoAceitar = useMemo(() =>
    orders.filter(o => aceitarOrderIds.includes(o.id))
      .reduce((acc, o) => acc + calcPeso(o), 0), [orders, aceitarOrderIds]);

  const capacidadeOk = !vehicleSelected || pesoAceitar <= (vehicleSelected.capacityKg || Infinity);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const openAceitar = (orderIds: string[]) => {
    setAceitarOrderIds(orderIds);
    setAceitarData({ vehicleId: '', driverId: '', scheduledDeliveryDate: '' });
    setIsAceitarOpen(true);
  };

  const handleAceitarCarga = () => {
    if (!aceitarData.vehicleId || !aceitarData.scheduledDeliveryDate) {
      toast({ variant: 'destructive', title: 'Campos incompletos', description: 'Preencha veículo e data.' });
      return;
    }
    if (!capacidadeOk) {
      toast({ variant: 'destructive', title: 'Capacidade excedida', description: `Veículo suporta ${vehicleSelected!.capacityKg}kg mas carga tem ${pesoAceitar.toFixed(2)}kg.` });
      return;
    }
    try {
      aceitarOrderIds.forEach(id => {
        updateOrderStatus(id, 'AGUARDANDO_FATURAMENTO', {
          assignedVehicleId: aceitarData.vehicleId,
          assignedDriverId: aceitarData.driverId || '',
          scheduledDeliveryDate: aceitarData.scheduledDeliveryDate,
          acceptedAt: new Date().toISOString(),
        } as any);
      });
      toast({ title: 'Pedidos Aceitos', description: `${aceitarOrderIds.length} pedido(s) enviados para faturamento.` });
      setSelectedOrders([]);
      setIsAceitarOpen(false);
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao aceitar pedidos. Tente novamente.' });
    }
  };

  const handleIniciarEntrega = async (orderIds: string[]) => {
    try {
      const departureTime = new Date().toISOString();
      orderIds.forEach(id => {
        updateOrderStatus(id, 'ENTREGA', { departureTime } as any);
      });
      setRomaneioOrders(orderIds);
      toast({ title: 'Entrega Iniciada', description: `${orderIds.length} pedido(s) em rota.` });
      // Romaneio é ação separada — não abre automaticamente
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao iniciar entrega.' });
    }
  };

  const handleConfirmarEntrega = async (orderId: string) => {
    try {
      await confirmDelivery(orderId);
      toast({ title: 'Entrega Confirmada', description: `Pedido ${orderId} finalizado.` });
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao confirmar entrega.' });
    }
  };

  const handleReverter = (orderId: string) => {
    setReverterOrderId(orderId);
    setIsReverterOpen(true);
  };

  const confirmarReverter = () => {
    if (!reverterOrderId) return;
    try {
      updateOrderStatus(reverterOrderId, 'PRONTO_LOGISTICA', {
        assignedVehicleId: '',
        assignedDriverId: '',
        scheduledDeliveryDate: '',
        revertedAt: new Date().toISOString(),
      } as any);
      toast({ title: 'Pedido Revertido', description: `Pedido ${reverterOrderId} voltou para Expedição.` });
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao reverter pedido.' });
    }
    setIsReverterOpen(false);
    setReverterOrderId(null);
  };

  const abrirRomaneio = (orderIds: string[]) => {
    setRomaneioOrders(orderIds);
    setIsRomaneioOpen(true);
  };

  const romaneioData = useMemo(() =>
    orders.filter(o => romaneioOrders.includes(o.id)), [orders, romaneioOrders]);

  if (!isReady) return null;

  // ─── Subcomponentes ──────────────────────────────────────────────────────

  const CityGroupReadOnly = ({
    city, cityOrders, colorClass, badgeClass, onIniciar, expandKey
  }: {
    city: string;
    cityOrders: any[];
    colorClass: string;
    badgeClass: string;
    onIniciar?: () => void;
    expandKey: string;
  }) => {
    const totalSacos = cityOrders.reduce((acc: number, o: any) => acc + calcSacos(o), 0);
    const totalPeso = cityOrders.reduce((acc: number, o: any) => acc + calcPeso(o), 0);
    const isExpanded = expandedCities[expandKey] !== false;
    const vehicle = cityOrders[0]?.assignedVehicleId
      ? vehicles.find(v => v.id === cityOrders[0].assignedVehicleId) : null;
    const driver = cityOrders[0]?.assignedDriverId
      ? drivers.find(d => d.id === cityOrders[0].assignedDriverId) : null;

    return (
      <div>
        <div className={`${colorClass} px-4 py-3 border rounded-t-lg flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <MapPin className="w-3.5 h-3.5" />
            <h3 className="text-[10px] font-black uppercase tracking-widest">{city}</h3>
            {vehicle && (
              <span className="text-[9px] font-bold opacity-60">
                {vehicle.model} {vehicle.plate ? `(${vehicle.plate})` : ''}{driver ? ` · ${driver.name}` : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-[9px] bg-white ${badgeClass}`}>{cityOrders.length} ped.</Badge>
            <Badge variant="outline" className={`text-[9px] bg-white ${badgeClass}`}>{totalSacos} UN</Badge>
            <Badge variant="outline" className={`text-[9px] bg-white ${badgeClass}`}>{totalPeso.toFixed(2)} KG</Badge>
            {onIniciar && (
              <>
                <Button size="sm"
                  className="h-7 gap-1.5 font-black text-[9px] uppercase bg-zinc-800 hover:bg-zinc-700 text-white"
                  onClick={() => abrirRomaneio(cityOrders.map((o: any) => o.id))}>
                  <Printer className="w-3 h-3" /> Romaneio
                </Button>
                <Button size="sm"
                  className="h-7 gap-1.5 font-black text-[9px] uppercase bg-green-600 hover:bg-green-700"
                  onClick={onIniciar}>
                  <PlayCircle className="w-3 h-3" /> Iniciar Entrega
                </Button>
              </>
            )}
            {!onIniciar && (
              <Button size="sm" variant="ghost" className="h-7 gap-1.5 font-black text-[9px] uppercase text-muted-foreground"
                onClick={() => {
                  const ids = cityOrders.map((o: any) => o.id);
                  ids.forEach((id: string) => handleReverter(id));
                }}>
                <RotateCcw className="w-3 h-3" /> Reverter
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6"
              onClick={() => setExpandedCities(prev => ({ ...prev, [expandKey]: !isExpanded }))}>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
        {isExpanded && (
          <Card className="border-none shadow-md overflow-hidden rounded-tl-none rounded-tr-none">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-[9px] font-black uppercase">Pedido</TableHead>
                    <TableHead className="text-[9px] font-black uppercase">Cliente</TableHead>
                    <TableHead className="text-[9px] font-black uppercase">Endereço</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center">Sacos</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center">Peso KG</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center">Prev. Entrega</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center">Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cityOrders.map((order: any) => (
                    <TableRow key={order.id} className="h-12 hover:bg-muted/20">
                      <TableCell className="font-mono text-[11px] font-black text-primary">{order.id}</TableCell>
                      <TableCell className="text-[11px] font-black uppercase">{order.customerName}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">{order.customerAddress || '---'}</TableCell>
                      <TableCell className="text-center text-[11px] font-black">{calcSacos(order)}</TableCell>
                      <TableCell className="text-center text-[11px] font-black">{calcPeso(order).toFixed(2)}</TableCell>
                      <TableCell className="text-center text-[9px] font-bold text-muted-foreground">
                        {formatDate((order as any).scheduledDeliveryDate || order.deliveryDate)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`${STATUS_COLORS[order.status] || ''} text-[8px] font-black uppercase px-2 h-5`}>
                          {STATUS_LABELS[order.status] || order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          title="Reverter para Expedição"
                          onClick={() => handleReverter(order.id)}>
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Cards de resumo ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Aguardando Aceite', value: expedicaoOrders.length, color: 'text-foreground' },
          { label: 'Ag. Faturamento', value: aguardandoFaturamentoOrders.length, color: 'text-indigo-600' },
          { label: 'Lib. para Entrega', value: faturadosOrders.length, color: 'text-green-600' },
          { label: 'Em Trânsito', value: emRotaOrders.length, color: 'text-primary', highlight: true },
        ].map(item => (
          <Card key={item.label} className={`border-none shadow-sm ${item.highlight ? 'bg-primary text-primary-foreground' : 'bg-white'}`}>
            <CardContent className="p-4">
              <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${item.highlight ? 'opacity-70' : 'text-muted-foreground'}`}>
                {item.label}
              </p>
              <p className={`text-2xl font-black ${item.highlight ? '' : item.color}`}>
                {item.value} <span className="text-sm font-bold opacity-60">pedidos</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="expedicao" className="w-full">
        <TabsList className="grid w-full max-w-[600px] grid-cols-3">
          <TabsTrigger value="expedicao" className="gap-2 font-bold text-xs uppercase">
            <Package className="w-4 h-4" /> Expedição
          </TabsTrigger>
          <TabsTrigger value="rota" className="gap-2 font-bold text-xs uppercase">
            <Navigation className="w-4 h-4" /> Em Rota
            {emRotaOrders.length > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground text-[9px] font-black rounded-full px-1.5 py-0.5">
                {emRotaOrders.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2 font-bold text-xs uppercase">
            <History className="w-4 h-4" /> Histórico
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════
            ABA EXPEDIÇÃO
        ══════════════════════════════════════════ */}
        <TabsContent value="expedicao" className="mt-6 space-y-6">

          {/* Busca */}
          <div className="flex items-center gap-3 max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar pedido ou cliente..."
                className="h-8 text-xs font-bold pl-9"
                value={expSearch}
                onChange={e => setExpSearch(e.target.value)}
              />
            </div>
            {expSearch && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpSearch('')}>
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          {/* Barra de seleção */}
          {selectedOrders.length > 0 && (
            <div className="bg-primary text-primary-foreground rounded-xl px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-6 flex-wrap">
                {[
                  { label: 'Selecionados', value: `${selectedOrders.length} pedidos` },
                  { label: 'Sacos', value: `${totalSacosSelected} un` },
                  { label: 'Peso', value: `${totalPesoSelected.toFixed(2)} KG` },
                  { label: 'Valor', value: `R$ ${totalValorSelected.toLocaleString('pt-BR')}` },
                  { label: 'Cidades', value: citiesSelected.join(', ') || '—' },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-[9px] font-black uppercase opacity-70">{item.label}</p>
                    <p className="text-sm font-black">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-8 gap-1.5 font-black text-[9px] uppercase bg-white text-primary hover:bg-white/90"
                  onClick={() => openAceitar(selectedOrders)}>
                  <Calendar className="w-3.5 h-3.5" />
                  {citiesSelected.length > 1 ? 'Aceitar Rota' : 'Aceitar Carga'}
                </Button>
                <Button
                  variant="ghost" size="sm"
                  className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => setSelectedOrders([])}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Estado vazio */}
          {Object.keys(groupedByCity).length === 0 &&
            Object.keys(groupedFaturamento).length === 0 &&
            Object.keys(groupedFaturados).length === 0 && (
              <Card className="border-none shadow-sm">
                <CardContent className="py-16 text-center text-muted-foreground italic text-xs uppercase opacity-40">
                  Nenhum pedido na expedição.
                </CardContent>
              </Card>
            )}

          {/* PRONTO_LOGISTICA */}
          {Object.entries(groupedByCity).map(([city, cityOrders], idx) => {
            const cityTotalSacos = cityOrders.reduce((acc, o) => acc + calcSacos(o), 0);
            const cityTotalPeso = cityOrders.reduce((acc, o) => acc + calcPeso(o), 0);
            const cityTotalValor = cityOrders.reduce((acc, o) => acc + calcValor(o), 0);
            const allCitySelected = cityOrders.every(o => selectedOrders.includes(o.id));
            const someCitySelected = cityOrders.some(o => selectedOrders.includes(o.id));
            const isExpanded = expandedCities[city] !== false;

            return (
              <div key={city} className={idx > 0 ? 'border-t-4 border-primary/10 pt-4' : ''}>
                <div className="bg-primary/5 px-4 py-3 border rounded-t-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={allCitySelected}
                      ref={el => { if (el) el.indeterminate = someCitySelected && !allCitySelected; }}
                      onChange={() => toggleCity(city)}
                      className="w-4 h-4 accent-primary cursor-pointer"
                    />
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">{city}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] bg-white">{cityOrders.length} ped.</Badge>
                    <Badge variant="outline" className="text-[9px] bg-white">{cityTotalSacos} UN</Badge>
                    <Badge variant="outline" className="text-[9px] bg-white">{cityTotalPeso.toFixed(2)} KG</Badge>
                    <Badge variant="outline" className="text-[9px] bg-white">
                      R$ {cityTotalValor.toLocaleString('pt-BR')}
                    </Badge>
                    <Button
                      size="sm" variant="outline"
                      className="h-7 gap-1.5 font-black text-[9px] uppercase"
                      onClick={() => openAceitar(cityOrders.map(o => o.id))}>
                      <Calendar className="w-3 h-3" /> Aceitar
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6"
                      onClick={() => setExpandedCities(prev => ({ ...prev, [city]: !isExpanded }))}>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
                {isExpanded && (
                  <Card className="border-none shadow-md overflow-hidden rounded-tl-none rounded-tr-none">
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead className="w-10" />
                            <TableHead className="text-[9px] font-black uppercase">Pedido</TableHead>
                            <TableHead className="text-[9px] font-black uppercase">Cliente</TableHead>
                            <TableHead className="text-[9px] font-black uppercase">Endereço</TableHead>
                            <TableHead className="text-[9px] font-black uppercase text-center">Sacos</TableHead>
                            <TableHead className="text-[9px] font-black uppercase text-center">Peso KG</TableHead>
                            <TableHead className="text-[9px] font-black uppercase text-right">Valor</TableHead>
                            <TableHead className="text-[9px] font-black uppercase text-center">Prev. Pedido</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cityOrders.map(order => {
                            const isSelected = selectedOrders.includes(order.id);
                            return (
                              <TableRow
                                key={order.id}
                                className={`h-12 cursor-pointer ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/20'}`}
                                onClick={() => toggleOrder(order.id)}>
                                <TableCell>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleOrder(order.id)}
                                    className="w-4 h-4 accent-primary cursor-pointer"
                                    onClick={e => e.stopPropagation()}
                                  />
                                </TableCell>
                                <TableCell className="font-mono text-[11px] font-black text-primary">{order.id}</TableCell>
                                <TableCell className="text-[11px] font-black uppercase">{order.customerName}</TableCell>
                                <TableCell className="text-[10px] text-muted-foreground">{order.customerAddress || '---'}</TableCell>
                                <TableCell className="text-center text-[11px] font-black">{calcSacos(order)}</TableCell>
                                <TableCell className="text-center text-[11px] font-black">{calcPeso(order).toFixed(2)}</TableCell>
                                <TableCell className="text-right text-[11px] font-black">
                                  R$ {calcValor(order).toLocaleString('pt-BR')}
                                </TableCell>
                                <TableCell className="text-center text-[9px] font-bold text-muted-foreground">
                                  {formatDate(order.deliveryDate)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })}

          {/* AGUARDANDO_FATURAMENTO */}
          {Object.keys(groupedFaturamento).length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pt-2">
                <div className="h-px flex-1 bg-indigo-100" />
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Aguardando Faturamento</span>
                <div className="h-px flex-1 bg-indigo-100" />
              </div>
              {Object.entries(groupedFaturamento).map(([city, cityOrders]) => (
                <CityGroupReadOnly
                  key={`fat-${city}`}
                  city={city}
                  cityOrders={cityOrders}
                  colorClass="bg-indigo-50 border-indigo-100 text-indigo-700"
                  badgeClass="border-indigo-200 text-indigo-700"
                  expandKey={`fat-${city}`}
                />
              ))}
            </div>
          )}

          {/* FATURADO — liberado para entrega */}
          {Object.keys(groupedFaturados).length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pt-2">
                <div className="h-px flex-1 bg-green-100" />
                <span className="text-[9px] font-black uppercase tracking-widest text-green-600">Faturados — Liberados para Entrega</span>
                <div className="h-px flex-1 bg-green-100" />
              </div>
              {Object.entries(groupedFaturados).map(([city, cityOrders]) => (
                <CityGroupReadOnly
                  key={`fat2-${city}`}
                  city={city}
                  cityOrders={cityOrders}
                  colorClass="bg-green-50 border-green-100 text-green-700"
                  badgeClass="border-green-200 text-green-700"
                  onIniciar={() => handleIniciarEntrega(cityOrders.map(o => o.id))}
                  expandKey={`fat2-${city}`}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════
            ABA EM ROTA
        ══════════════════════════════════════════ */}
        <TabsContent value="rota" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">Pedidos em Trânsito</h2>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">
                Confirme a entrega ao receber comprovante
              </p>
            </div>
            <span className="text-[9px] font-bold text-muted-foreground uppercase">
              {rotaFiltered.length} de {emRotaOrders.length} pedidos
            </span>
          </div>

          {/* Filtros em rota */}
          <div className="bg-white border rounded-xl p-4 space-y-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Filtros</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Pedido ou cliente..."
                  className="h-8 text-xs font-bold pl-9"
                  value={rotaSearch}
                  onChange={e => setRotaSearch(e.target.value)}
                />
              </div>
              <Select value={rotaCidade} onValueChange={setRotaCidade}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Cidade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as Cidades</SelectItem>
                  {rotaCidades.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={rotaVeiculo} onValueChange={setRotaVeiculo}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Veículo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Veículos</SelectItem>
                  {rotaVeiculos.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.model} ({v.plate})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(rotaSearch || rotaCidade !== 'ALL' || rotaVeiculo !== 'ALL') && (
              <Button
                variant="ghost" size="sm"
                className="h-7 text-[10px] font-black uppercase text-muted-foreground"
                onClick={() => { setRotaSearch(''); setRotaCidade('ALL'); setRotaVeiculo('ALL'); }}>
                Limpar filtros
              </Button>
            )}
          </div>

          <Card className="border-none shadow-md overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-[9px] font-black uppercase">Pedido</TableHead>
                    <TableHead className="text-[9px] font-black uppercase">Cliente</TableHead>
                    <TableHead className="text-[9px] font-black uppercase">Cidade</TableHead>
                    <TableHead className="text-[9px] font-black uppercase">Veículo / Motorista</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center">Sacos</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center">Peso</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center">Saída</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rotaFiltered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-16 text-muted-foreground italic text-xs uppercase opacity-40">
                        Nenhuma entrega em trânsito.
                      </TableCell>
                    </TableRow>
                  )}
                  {rotaFiltered.map(order => {
                    const vehicle = vehicles.find(v => v.id === order.assignedVehicleId);
                    const driver = drivers.find(d => d.id === order.assignedDriverId);
                    return (
                      <TableRow key={order.id} className="h-12 hover:bg-muted/20">
                        <TableCell className="font-mono text-[11px] font-black text-primary">{order.id}</TableCell>
                        <TableCell className="text-[11px] font-black uppercase">{order.customerName}</TableCell>
                        <TableCell className="text-[10px] font-bold text-muted-foreground uppercase">{order.city}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black">
                              {vehicle ? `${vehicle.model} (${vehicle.plate})` : '---'}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-bold flex items-center gap-1">
                              {driver ? <><User className="w-2.5 h-2.5" />{driver.name}</> : '---'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-[11px] font-black">{calcSacos(order)}</TableCell>
                        <TableCell className="text-center text-[11px] font-black">{calcPeso(order).toFixed(2)} kg</TableCell>
                        <TableCell className="text-center text-[9px] font-bold text-muted-foreground">
                          {formatDate((order as any).departureTime, true)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm" variant="ghost"
                              className="h-8 gap-1 font-black text-[9px] uppercase text-muted-foreground hover:text-destructive"
                              title="Abrir Romaneio"
                              onClick={() => abrirRomaneio([order.id])}>
                              <Printer className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm" variant="outline"
                              className="h-8 gap-1.5 font-black text-[9px] uppercase border-2 text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() => handleConfirmarEntrega(order.id)}>
                              <CheckSquare className="w-3.5 h-3.5" /> Confirmar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════
            ABA HISTÓRICO
        ══════════════════════════════════════════ */}
        <TabsContent value="historico" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">Histórico de Entregas</h2>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">
                Filtrado por data de saída
              </p>
            </div>
            <span className="text-[9px] font-bold text-muted-foreground uppercase">
              {historicoFiltered.length} de {historicoOrders.length} pedidos
            </span>
          </div>

          <div className="bg-white border rounded-xl p-4 space-y-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Filtros</p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Pedido ou cliente..."
                  className="h-8 text-xs font-bold pl-9"
                  value={histSearch}
                  onChange={e => setHistSearch(e.target.value)}
                />
              </div>
              <Select value={histStatus} onValueChange={setHistStatus}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="ENTREGA">Em Entrega</SelectItem>
                  <SelectItem value="FATURADO">Lib. Entrega</SelectItem>
                  <SelectItem value="ENTREGUE">Entregue</SelectItem>
                </SelectContent>
              </Select>
              <Select value={histCidade} onValueChange={setHistCidade}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Cidade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  {cidadesDisponiveis.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                variant="ghost" size="sm"
                className="h-8 text-[10px] font-black uppercase text-muted-foreground"
                onClick={() => { setHistSearch(''); setHistStatus('ALL'); setHistCidade('ALL'); setHistDe(''); setHistAte(''); }}>
                Limpar
              </Button>
            </div>
            <div className="flex gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-[9px] font-black uppercase text-muted-foreground whitespace-nowrap">De:</label>
                <Input type="date" className="h-8 text-xs w-36" value={histDe} onChange={e => setHistDe(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[9px] font-black uppercase text-muted-foreground whitespace-nowrap">Até:</label>
                <Input type="date" className="h-8 text-xs w-36" value={histAte} onChange={e => setHistAte(e.target.value)} />
              </div>
            </div>
          </div>

          <Card className="border-none shadow-md overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-[9px] font-black uppercase">Pedido</TableHead>
                    <TableHead className="text-[9px] font-black uppercase">Cliente</TableHead>
                    <TableHead className="text-[9px] font-black uppercase">Cidade</TableHead>
                    <TableHead className="text-[9px] font-black uppercase">Veículo / Motorista</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center">Sacos</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center">Saída</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center w-28">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historicoFiltered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-16 text-muted-foreground italic text-xs uppercase opacity-40">
                        Nenhum pedido no histórico.
                      </TableCell>
                    </TableRow>
                  )}
                  {historicoFiltered.map(order => {
                    const vehicle = vehicles.find(v => v.id === order.assignedVehicleId);
                    const driver = drivers.find(d => d.id === order.assignedDriverId);
                    return (
                      <TableRow key={order.id} className="h-12 hover:bg-muted/20">
                        <TableCell className="font-mono text-[11px] font-black text-primary">{order.id}</TableCell>
                        <TableCell className="text-[11px] font-black uppercase">{order.customerName}</TableCell>
                        <TableCell className="text-[10px] font-bold text-muted-foreground uppercase">{order.city}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black">{vehicle?.model || '---'}</span>
                            <span className="text-[9px] text-muted-foreground font-bold">
                              {driver?.name || '---'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-[11px] font-black">{calcSacos(order)}</TableCell>
                        <TableCell className="text-center text-[9px] font-bold text-muted-foreground">
                          {formatDate((order as any).departureTime, true)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`${STATUS_COLORS[order.status] || ''} text-[8px] font-black uppercase px-2 h-5`}>
                            {STATUS_LABELS[order.status] || order.status}
                          </Badge>
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

      {/* ══════════════════════════════════════════
          MODAL: ACEITAR PEDIDOS
      ══════════════════════════════════════════ */}
      <Dialog open={isAceitarOpen} onOpenChange={setIsAceitarOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-black uppercase">Aceitar Pedidos para Entrega</DialogTitle>
            <DialogDescription className="text-[10px] uppercase font-bold">
              {aceitarOrderIds.length} pedido(s) · Defina veículo e data de entrega
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Lista de pedidos */}
            <div className="bg-muted/30 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
              {orders.filter(o => aceitarOrderIds.includes(o.id)).map(o => (
                <div key={o.id} className="flex justify-between text-[10px] font-bold">
                  <span>{o.id} — {o.customerName} — {o.city}</span>
                  <span className="text-muted-foreground">{calcSacos(o)} un · {calcPeso(o).toFixed(2)} kg</span>
                </div>
              ))}
              {/* Totais */}
              <div className="flex justify-between text-[10px] font-black border-t pt-1 mt-1">
                <span>Total</span>
                <span>
                  {orders.filter(o => aceitarOrderIds.includes(o.id)).reduce((a, o) => a + calcSacos(o), 0)} un ·{' '}
                  {pesoAceitar.toFixed(2)} kg ·{' '}
                  R$ {orders.filter(o => aceitarOrderIds.includes(o.id)).reduce((a, o) => a + calcValor(o), 0).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>

            {/* Data */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground">
                Data Programada de Entrega *
              </label>
              <Input
                type="date"
                className="h-9 text-xs"
                value={aceitarData.scheduledDeliveryDate}
                onChange={e => setAceitarData({ ...aceitarData, scheduledDeliveryDate: e.target.value })}
              />
            </div>

            {/* Veículo */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground">Veículo *</label>
              <Select onValueChange={val => setAceitarData({ ...aceitarData, vehicleId: val })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione um veículo" /></SelectTrigger>
                <SelectContent>
                  {vehicles.filter(v => v.status === 'DISPONIVEL').map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.model} ({v.plate}) — {v.capacityKg}kg cap.
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Alerta de capacidade */}
              {vehicleSelected && (
                <div className={`flex items-center gap-2 text-[10px] font-bold px-2 py-1.5 rounded ${capacidadeOk ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {!capacidadeOk && <AlertTriangle className="w-3 h-3" />}
                  <span>
                    Carga: {pesoAceitar.toFixed(2)}kg / Capacidade: {vehicleSelected.capacityKg}kg
                    {!capacidadeOk && ' — EXCEDIDA'}
                  </span>
                </div>
              )}
            </div>

            {/* Motorista (opcional) */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground">
                Motorista <span className="text-muted-foreground/60">(opcional)</span>
              </label>
              <Select onValueChange={val => setAceitarData({ ...aceitarData, driverId: val })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione um motorista" /></SelectTrigger>
                <SelectContent>
                  {drivers.filter(d => d.status === 'DISPONIVEL').map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAceitarOpen(false)} className="font-bold text-xs uppercase">
              Cancelar
            </Button>
            <Button
              onClick={handleAceitarCarga}
              disabled={!capacidadeOk}
              className="font-black text-xs uppercase gap-2">
              <Truck className="w-3.5 h-3.5" /> Confirmar Aceite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════
          MODAL: REVERTER PEDIDO
      ══════════════════════════════════════════ */}
      <Dialog open={isReverterOpen} onOpenChange={setIsReverterOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black uppercase flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Reverter Pedido
            </DialogTitle>
            <DialogDescription className="text-[10px] uppercase font-bold">
              O pedido {reverterOrderId} voltará para "Aguardando Aceite" na Expedição.
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground py-2">
            As informações de veículo, motorista e data programada serão removidas. Esta ação é registrada com data e hora.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsReverterOpen(false)} className="font-bold text-xs uppercase">
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmarReverter} className="font-black text-xs uppercase gap-2">
              <RotateCcw className="w-3.5 h-3.5" /> Confirmar Reversão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════
          MODAL: ROMANEIO
      ══════════════════════════════════════════ */}
      <Dialog open={isRomaneioOpen} onOpenChange={setIsRomaneioOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">Romaneio de Carga</DialogTitle>
          <div className="bg-white flex flex-col max-h-[90vh]">
            <div className="bg-primary px-6 py-4 flex items-center justify-between shrink-0">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Documento de Entrega</p>
                <h2 className="text-lg font-black uppercase text-white">Romaneio de Carga</h2>
              </div>
              <Button
                size="sm" variant="ghost"
                className="h-8 gap-1.5 font-black text-[9px] uppercase text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => window.print()}>
                <Printer className="w-3.5 h-3.5" /> Imprimir
              </Button>
            </div>
            <div ref={romaneioRef} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex justify-between text-[10px] font-bold text-muted-foreground border-b pb-3 flex-wrap gap-2">
                <span>Data: {format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
                <span>Pedidos: {romaneioData.length}</span>
                <span>Sacos: {romaneioData.reduce((acc, o) => acc + calcSacos(o), 0)} un</span>
                <span>Peso: {romaneioData.reduce((acc, o) => acc + calcPeso(o), 0).toFixed(2)} KG</span>
                <span>Valor: R$ {romaneioData.reduce((acc, o) => acc + calcValor(o), 0).toLocaleString('pt-BR')}</span>
              </div>
              {romaneioData.map((order, idx) => (
                <div key={order.id} className={`space-y-3 ${idx > 0 ? 'border-t pt-4' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-black uppercase">{order.customerName}</p>
                      <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {order.city} — {order.customerAddress || 'Endereço não informado'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black uppercase text-muted-foreground">Pedido</p>
                      <p className="text-xs font-black font-mono text-primary">{order.id}</p>
                    </div>
                  </div>
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200">
                        <th className="text-left text-[9px] font-black uppercase text-muted-foreground pb-1">Produto</th>
                        <th className="text-center text-[9px] font-black uppercase text-muted-foreground pb-1 w-20">Qtd</th>
                        <th className="text-right text-[9px] font-black uppercase text-muted-foreground pb-1 w-24">Peso Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map(item => {
                        const prod = products.find(p => p.id === item.productId);
                        return (
                          <tr key={item.productId} className="border-b border-zinc-50">
                            <td className="py-1.5 font-bold uppercase text-[11px]">{prod?.name || item.productId}</td>
                            <td className="py-1.5 text-center font-black text-[11px]">{item.quantity}</td>
                            <td className="py-1.5 text-right font-black text-[11px]">
                              {((prod?.weight || 0) * item.quantity).toFixed(2)} kg
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-zinc-300">
                        <td className="pt-2 text-[9px] font-black uppercase text-muted-foreground">Total</td>
                        <td className="pt-2 text-center font-black text-[11px]">{calcSacos(order)}</td>
                        <td className="pt-2 text-right font-black text-[11px]">{calcPeso(order).toFixed(2)} kg</td>
                      </tr>
                    </tfoot>
                  </table>
                  <div className="flex justify-end mt-2">
                    <div className="w-48 text-center">
                      <div className="border-t border-zinc-300 pt-1">
                        <p className="text-[8px] font-black uppercase text-muted-foreground">Assinatura do Recebedor</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}