"use client"

import { useSystemData } from '@/server/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrderTable, type TableColumn, type OrderTableAction } from '@/components/shared/OrderTable';
import { OrderDetailsModal } from '@/components/shared/OrderDetailsModal';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Truck, MapPin, CheckSquare, Package,
  X, History, Printer, PlayCircle,
  Calendar, AlertTriangle, Search, RotateCcw, User, Eye
} from 'lucide-react';
import { useState, useRef, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

import { FilterPanel } from '@/components/shared/FilterPanel';
import { SummaryCard } from '@/components/shared/SummaryCard';
import { Checkbox } from '@/components/ui/checkbox';

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

export default function LogisticaPage() {
  const {
    orders, products, vehicles, drivers,
    updateOrderStatus, confirmDelivery, isReady,
  } = useSystemData();

  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [expSearch, setExpSearch] = useState('');
  const [expCidade, setExpCidade] = useState('ALL');
  const [expStatus, setExpStatus] = useState('ALL');

  const [isAceitarOpen, setIsAceitarOpen] = useState(false);
  const [aceitarOrderIds, setAceitarOrderIds] = useState<string[]>([]);
  // ── MUDANÇA 1: removido driverId, adicionado dataCarregamento
  const [aceitarData, setAceitarData] = useState({
    vehicleId: '',
    scheduledDeliveryDate: '',
    grupoCarga: '',
    tipoCarga: '',
    dataCarregamento: '',
  });

  const [isRomaneioOpen, setIsRomaneioOpen] = useState(false);
  const [romaneioOrders, setRomaneioOrders] = useState<string[]>([]);
  const romaneioRef = useRef<HTMLDivElement>(null);

  const [isReverterOpen, setIsReverterOpen] = useState(false);
  const [reverterOrderId, setReverterOrderId] = useState<string | null>(null);

  const [isVisualizarOpen, setIsVisualizarOpen] = useState(false);
  const [visualizarOrderId, setVisualizarOrderId] = useState<string | null>(null);

  const [isIniciarEntregaOpen, setIsIniciarEntregaOpen] = useState(false);
  const [iniciarEntregaOrders, setIniciarEntregaOrders] = useState<string[]>([]);
  const [dataIniciarEntrega, setDataIniciarEntrega] = useState('');

  const [isConfirmarEntregaOpen, setIsConfirmarEntregaOpen] = useState(false);
  const [confirmarEntregaOrderId, setConfirmarEntregaOrderId] = useState<string | null>(null);
  const [dataConfirmarEntrega, setDataConfirmarEntrega] = useState('');

  const [histSearch, setHistSearch] = useState('');
  const [histStatus, setHistStatus] = useState('ALL');
  const [histCidade, setHistCidade] = useState('ALL');
  const [histDe, setHistDe] = useState('');
  const [histAte, setHistAte] = useState('');

  const expedicaoOrders = useMemo(() =>
    orders.filter(o => o.status === 'PRONTO_LOGISTICA'), [orders]);

  const aguardandoFaturamentoOrders = useMemo(() =>
    orders.filter(o => o.status === 'AGUARDANDO_FATURAMENTO'), [orders]);

  const faturadosOrders = useMemo(() =>
    orders.filter(o => o.status === 'FATURADO'), [orders]);

  const emRotaOrders = useMemo(() =>
    orders.filter(o => o.status === 'ENTREGA'), [orders]);

  const historicoOrders = useMemo(() =>
    orders.filter(o => ['ENTREGA', 'FATURADO', 'ENTREGUE'].includes(o.status)), [orders]);

  function groupByCity<T extends { city?: string }>(list: T[]) {
    return list.reduce((acc, order) => {
      const city = order.city || 'Sem Cidade';
      if (!acc[city]) acc[city] = [];
      acc[city].push(order);
      return acc;
    }, {} as Record<string, T[]>);
  }

  const expCidades = useMemo(() =>
    [...new Set(
      orders
        .filter(o => ['PRONTO_LOGISTICA', 'AGUARDANDO_FATURAMENTO', 'FATURADO'].includes(o.status))
        .map(o => o.city)
        .filter(Boolean)
    )], [orders]);

  const expedicaoAllOrders = useMemo(() =>
    orders.filter(o => ['PRONTO_LOGISTICA', 'AGUARDANDO_FATURAMENTO', 'FATURADO'].includes(o.status)),
    [orders]);

  const expedicaoFiltered = useMemo(() => {
    return expedicaoAllOrders.filter(o => {
      const matchSearch = !expSearch ||
        o.customerName?.toLowerCase().includes(expSearch.toLowerCase()) ||
        o.id?.toLowerCase().includes(expSearch.toLowerCase());
      const matchCidade = expCidade === 'ALL' || o.city === expCidade;
      const matchStatus = expStatus === 'ALL' || o.status === expStatus;
      return matchSearch && matchCidade && matchStatus;
    });
  }, [expedicaoAllOrders, expSearch, expCidade, expStatus]);

  const cidadesDisponiveis = useMemo(() =>
    [...new Set(historicoOrders.map(o => o.city).filter(Boolean))], [historicoOrders]);

  const historicoFiltered = useMemo(() => {
    return historicoOrders.filter(o => {
      const matchSearch = !histSearch ||
        o.customerName?.toLowerCase().includes(histSearch.toLowerCase()) ||
        o.id?.toLowerCase().includes(histSearch.toLowerCase());
      const matchStatus = histStatus === 'ALL' || o.status === histStatus;
      const matchCidade = histCidade === 'ALL' || o.city === histCidade;
      const departureDate = (o as any).departureTime ? new Date((o as any).departureTime) : null;
      const matchDe = !histDe || (departureDate && departureDate >= new Date(histDe));
      const matchAte = !histAte || (departureDate && departureDate <= new Date(histAte + 'T23:59:59'));
      return matchSearch && matchStatus && matchCidade && matchDe && matchAte;
    });
  }, [historicoOrders, histSearch, histStatus, histCidade, histDe, histAte]);

  const toggleOrder = useCallback((orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]);
  }, []);

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

  const vehicleSelected = useMemo(() =>
    vehicles.find(v => v.id === aceitarData.vehicleId), [vehicles, aceitarData.vehicleId]);

  const pesoAceitar = useMemo(() =>
    orders.filter(o => aceitarOrderIds.includes(o.id))
      .reduce((acc, o) => acc + calcPeso(o), 0), [orders, aceitarOrderIds]);

  const capacidadeOk = !vehicleSelected || pesoAceitar <= (vehicleSelected.capacityKg || Infinity);

  const openAceitar = (orderIds: string[]) => {
    setAceitarOrderIds(orderIds);
    // ── MUDANÇA 2: resetar sem driverId, com dataCarregamento
    setAceitarData({
      vehicleId: '',
      scheduledDeliveryDate: '',
      grupoCarga: '',
      tipoCarga: '',
      dataCarregamento: '',
    });
    setIsAceitarOpen(true);
  };

  const handleAceitarCarga = () => {
    // ── MUDANÇA 3: validar dataCarregamento em vez de motorista
    if (
      !aceitarData.vehicleId ||
      !aceitarData.scheduledDeliveryDate ||
      !aceitarData.grupoCarga ||
      !aceitarData.tipoCarga ||
      !aceitarData.dataCarregamento
    ) {
      toast({
        variant: 'destructive',
        title: 'Campos incompletos',
        description: 'Preencha todos os campos obrigatórios.',
      });
      return;
    }
    try {
      aceitarOrderIds.forEach(id => {
        // ── MUDANÇA 4: salvar grupoCarga, tipoCarga e dataCarregamento no pedido
        updateOrderStatus(id, 'AGUARDANDO_FATURAMENTO', {
          assignedVehicleId: aceitarData.vehicleId,
          scheduledDeliveryDate: aceitarData.scheduledDeliveryDate,
          grupoCarga: aceitarData.grupoCarga,
          tipoCarga: aceitarData.tipoCarga,
          dataCarregamento: aceitarData.dataCarregamento,
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

  const handleIniciarEntrega = (orderIds: string[]) => {
    setIniciarEntregaOrders(orderIds);
    setDataIniciarEntrega('');
    setIsIniciarEntregaOpen(true);
  };

  const confirmarIniciarEntrega = async () => {
    if (!dataIniciarEntrega) {
      toast({
        variant: 'destructive',
        title: 'Data obrigatória',
        description: 'Selecione a data de saída para iniciar a entrega.',
      });
      return;
    }
    try {
      const departureTime = new Date(dataIniciarEntrega).toISOString();
      iniciarEntregaOrders.forEach(id => {
        updateOrderStatus(id, 'ENTREGA', { departureTime } as any);
      });
      setRomaneioOrders(iniciarEntregaOrders);
      toast({ title: 'Entrega Iniciada', description: `${iniciarEntregaOrders.length} pedido(s) em rota.` });
      setIsIniciarEntregaOpen(false);
      setDataIniciarEntrega('');
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao iniciar entrega.' });
    }
  };

  const handleConfirmarEntrega = (orderId: string) => {
    setConfirmarEntregaOrderId(orderId);
    setDataConfirmarEntrega('');
    setIsConfirmarEntregaOpen(true);
  };

  const confirmarEntregaComData = async () => {
    if (!confirmarEntregaOrderId || !dataConfirmarEntrega) {
      toast({
        variant: 'destructive',
        title: 'Data obrigatória',
        description: 'Selecione a data de entrega para confirmar.',
      });
      return;
    }
    try {
      await confirmDelivery(confirmarEntregaOrderId);
      toast({ title: 'Entrega Confirmada', description: `Pedido ${confirmarEntregaOrderId} finalizado.` });
      setIsConfirmarEntregaOpen(false);
      setDataConfirmarEntrega('');
      setConfirmarEntregaOrderId(null);
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

  const visualizarOrder = useMemo(() =>
    visualizarOrderId ? orders.find(o => o.id === visualizarOrderId) || null : null, [orders, visualizarOrderId]);

  if (!isReady) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Aguardando Aceite" value={expedicaoOrders.length} unit="pedidos" />
        <SummaryCard label="Ag. Faturamento" value={aguardandoFaturamentoOrders.length} unit="pedidos" color="info" />
        <SummaryCard label="Lib. para Entrega" value={faturadosOrders.length} unit="pedidos" color="success" />
        <SummaryCard label="Em Trânsito" value={emRotaOrders.length} unit="pedidos" color="primary" highlight />
      </div>

      <Tabs defaultValue="expedicao" className="w-full">
        <TabsList className="grid w-full max-w-[600px] grid-cols-2">
          <TabsTrigger value="expedicao" className="gap-2 font-bold text-xs uppercase">
            <Package className="w-4 h-4" /> Expedição
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2 font-bold text-xs uppercase">
            <History className="w-4 h-4" /> Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expedicao" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">Expedição</h2>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">
                Selecione pedidos para montar carga
              </p>
            </div>
            <span className="text-[9px] font-bold text-muted-foreground uppercase">
              {expedicaoFiltered.length} de {expedicaoAllOrders.length} pedidos
            </span>
          </div>

          <FilterPanel
            fields={[
              { type: 'search', key: 'search', placeholder: 'Pedido ou cliente...', value: expSearch, onChange: setExpSearch, className: 'md:col-span-2' },
              {
                type: 'select', key: 'cidade', placeholder: 'Cidade', value: expCidade, onChange: setExpCidade,
                options: [{ label: 'Todas as Cidades', value: 'ALL' }, ...expCidades.map(c => ({ label: c!, value: c! }))],
              },
              {
                type: 'select', key: 'status', placeholder: 'Status', value: expStatus, onChange: setExpStatus,
                options: [
                  { label: 'Todos', value: 'ALL' },
                  { label: 'Ag. Aceite', value: 'PRONTO_LOGISTICA' },
                  { label: 'Ag. Faturamento', value: 'AGUARDANDO_FATURAMENTO' },
                  { label: 'Lib. Entrega', value: 'FATURADO' },
                ],
              },
            ]}
            onClear={() => { setExpSearch(''); setExpCidade('ALL'); setExpStatus('ALL'); }}
            gridCols="grid-cols-1 sm:grid-cols-2 md:grid-cols-4"
          />

          {selectedOrders.length > 0 && (
            <div className="bg-primary text-primary-foreground rounded-xl px-5 py-3 flex items-center justify-between flex-wrap gap-3">
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
                {selectedOrdersData.some(o => o.status === 'PRONTO_LOGISTICA') && (
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 font-black text-[9px] uppercase bg-white text-primary hover:bg-white/90"
                    onClick={() => openAceitar(selectedOrders.filter(id =>
                      orders.find(o => o.id === id)?.status === 'PRONTO_LOGISTICA'
                    ))}>
                    <Calendar className="w-3.5 h-3.5" />
                    {citiesSelected.length > 1 ? 'Aceitar Rota' : 'Aceitar Carga'}
                  </Button>
                )}
                {selectedOrdersData.some(o => o.status === 'FATURADO') && (
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 font-black text-[9px] uppercase bg-green-500 hover:bg-green-400 text-white"
                    onClick={() => handleIniciarEntrega(selectedOrders.filter(id =>
                      orders.find(o => o.id === id)?.status === 'FATURADO'
                    ))}>
                    <PlayCircle className="w-3.5 h-3.5" /> Iniciar Entrega
                  </Button>
                )}
                <Button
                  variant="ghost" size="sm"
                  className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => setSelectedOrders([])}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          <OrderTable
            orders={expedicaoFiltered}
            columns={[
              {
                key: 'select', header: '', width: '40px',
                render: (o) => (
                  o.status === 'AGUARDANDO_FATURAMENTO' ? (
                    <div className="flex justify-center">
                      <Truck className="h-4 w-4 text-muted-foreground animate-pulse" />
                    </div>
                  ) : (
                    <Checkbox
                      checked={selectedOrders.includes(o.id)}
                      onCheckedChange={() => toggleOrder(o.id)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  )
                ),
              },
              { key: 'id', header: 'Pedido', width: '120px', render: (o) => <span className="font-mono text-[11px] font-black text-primary">{o.id}</span> },
              { key: 'customerName', header: 'Cliente', render: (o) => <span className="text-[11px] font-black uppercase">{o.customerName}</span> },
              { key: 'city', header: 'Cidade', width: '110px', render: (o) => <span className="text-[10px] font-bold text-muted-foreground uppercase">{o.city || '---'}</span> },
              { key: 'sacos', header: 'Sacos', width: '80px', align: 'center', render: (o) => <span className="text-[11px] font-black">{calcSacos(o)}</span> },
              { key: 'peso', header: 'Peso KG', width: '100px', align: 'center', render: (o) => <span className="text-[11px] font-black">{calcPeso(o).toFixed(2)}</span> },
              { key: 'createdAt', header: 'Dt Pedido', width: '100px', align: 'center', hiddenOn: 'lg', render: (o) => <span className="text-[9px] font-bold text-muted-foreground">{formatDate((o as any).createdAt)}</span> },
              { key: 'approvedAt', header: 'Dt Produção', width: '100px', align: 'center', hiddenOn: 'lg', render: (o) => <span className="text-[9px] font-bold text-muted-foreground">{formatDate((o as any).approvedAt)}</span> },
              {
                key: 'status', header: 'Status', width: '130px', align: 'center',
                render: (o) => (
                  <Badge variant="outline" className={`${STATUS_COLORS[o.status] || 'bg-muted'} text-[8px] font-black uppercase px-2 h-5`}>
                    {STATUS_LABELS[o.status] || o.status}
                  </Badge>
                ),
              },
            ]}
            actions={[
              { label: 'Visualizar', onClick: (o) => { setVisualizarOrderId(o.id); setIsVisualizarOpen(true); }, variant: 'ghost', icon: <Eye className="w-3 h-3" /> },
              { label: 'Romaneio', onClick: (o) => abrirRomaneio([o.id]), variant: 'ghost', icon: <Printer className="w-3 h-3" />, hidden: o => o.status !== 'FATURADO' },
            ]}
            emptyMessage="Nenhum pedido na expedição."
          />
        </TabsContent>

        <TabsContent value="historico" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">Histórico de Entregas</h2>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Filtrado por data de saída</p>
            </div>
            <span className="text-[9px] font-bold text-muted-foreground uppercase">
              {historicoFiltered.length} de {historicoOrders.length} pedidos
            </span>
          </div>

          <FilterPanel
            fields={[
              { type: 'search', key: 'search', placeholder: 'Pedido ou cliente...', value: histSearch, onChange: setHistSearch, className: 'md:col-span-2' },
              {
                type: 'select', key: 'status', placeholder: 'Status', value: histStatus, onChange: setHistStatus,
                options: [{ label: 'Todos', value: 'ALL' }, { label: 'Em Entrega', value: 'ENTREGA' }, { label: 'Lib. Entrega', value: 'FATURADO' }, { label: 'Entregue', value: 'ENTREGUE' }],
              },
              {
                type: 'select', key: 'cidade', placeholder: 'Cidade', value: histCidade, onChange: setHistCidade,
                options: [{ label: 'Todas', value: 'ALL' }, ...cidadesDisponiveis.map(c => ({ label: c!, value: c! }))],
              },
              { type: 'date', key: 'de', placeholder: 'De', value: histDe, onChange: setHistDe },
              { type: 'date', key: 'ate', placeholder: 'Até', value: histAte, onChange: setHistAte },
            ]}
            onClear={() => { setHistSearch(''); setHistStatus('ALL'); setHistCidade('ALL'); setHistDe(''); setHistAte(''); }}
            gridCols="grid-cols-1 sm:grid-cols-2 md:grid-cols-4"
          />

          <OrderTable
            showSearch showGroupByCity showExport
            orders={historicoFiltered}
            columns={[
              { key: 'id', header: 'Pedido', width: '120px', render: (o) => <span className="font-mono text-[11px] font-black text-primary">{o.id}</span> },
              { key: 'customerName', header: 'Cliente', render: (o) => <span className="text-[11px] font-black uppercase">{o.customerName}</span> },
              { key: 'city', header: 'Cidade', width: '100px', render: (o) => <span className="text-[10px] font-bold text-muted-foreground uppercase">{o.city}</span> },
              {
                key: 'vehicle', header: 'Veículo / Motorista',
                render: (o) => {
                  const vehicle = vehicles.find(v => v.id === o.assignedVehicleId);
                  const driver = drivers.find(d => d.id === o.assignedDriverId);
                  return (
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black">{vehicle?.model || '---'}</span>
                      <span className="text-[9px] text-muted-foreground font-bold">{driver?.name || '---'}</span>
                    </div>
                  );
                },
              },
              { key: 'sacos', header: 'Sacos', width: '80px', align: 'center', render: (o) => <span className="text-[11px] font-black">{calcSacos(o)}</span> },
              { key: 'departureTime', header: 'DT Saída', width: '100px', align: 'center', render: (o) => <span className="text-[9px] font-bold text-muted-foreground">{formatDate((o as any).departureTime, true)}</span> },
              {
                key: 'status', header: 'Status', width: '120px', align: 'center',
                render: (o) => <Badge variant="outline" className={`${STATUS_COLORS[o.status] || ''} text-[8px] font-black uppercase px-2 h-5`}>{STATUS_LABELS[o.status] || o.status}</Badge>,
              },
            ]}
            actions={[
              { label: 'Confirmar Entrega', onClick: (o) => handleConfirmarEntrega(o.id), variant: 'ghost', icon: <CheckSquare className="w-3 h-3" />, hidden: o => o.status !== 'ENTREGA' },
              { label: 'Visualizar', onClick: (o) => { setVisualizarOrderId(o.id); setIsVisualizarOpen(true); }, variant: 'ghost', icon: <Eye className="w-3 h-3" /> },
            ]}
            emptyMessage="Nenhum pedido no histórico."
          />
        </TabsContent>
      </Tabs>

      {/* ══ MODAL: MONTAR CARGA ══
          MUDANÇAS: removido motorista, adicionado grupo de carga, tipo de carga e data de carregamento */}
      <Dialog open={isAceitarOpen} onOpenChange={setIsAceitarOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-black uppercase">Montar Carga</DialogTitle>
            <DialogDescription className="text-[10px] uppercase font-bold">
              {aceitarOrderIds.length} pedido(s) · Defina grupo, tipo e data de carregamento
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
              <div className="flex justify-between text-[10px] font-black border-t pt-1 mt-1">
                <span>Total</span>
                <span>
                  {orders.filter(o => aceitarOrderIds.includes(o.id)).reduce((a, o) => a + calcSacos(o), 0)} un ·{' '}
                  {pesoAceitar.toFixed(2)} kg ·{' '}
                  R$ {orders.filter(o => aceitarOrderIds.includes(o.id)).reduce((a, o) => a + calcValor(o), 0).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>

            {/* Grupo de Carga */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground">
                Grupo de Carga *
              </label>
              <Input
                className="h-9 text-xs font-mono"
                placeholder="Ex: ROTA-UBERLANDIA-01"
                value={aceitarData.grupoCarga}
                onChange={e => setAceitarData({ ...aceitarData, grupoCarga: e.target.value })}
              />
              <p className="text-[9px] text-muted-foreground">Identificador do conjunto de pedidos desta carga</p>
            </div>

            {/* Tipo de Carga */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground">
                Tipo de Carga *
              </label>
              <Select value={aceitarData.tipoCarga} onValueChange={val => setAceitarData({ ...aceitarData, tipoCarga: val })}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BATIDA">Batida</SelectItem>
                  <SelectItem value="PALETIZADA">Paletizada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Data de Carregamento — substituiu motorista */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground">
                Data de Carregamento *
              </label>
              <Input
                type="datetime-local"
                className="h-9 text-xs"
                value={aceitarData.dataCarregamento}
                onChange={e => setAceitarData({ ...aceitarData, dataCarregamento: e.target.value })}
              />
            </div>

            {/* Data Programada de Entrega */}
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
              <Select value={aceitarData.vehicleId} onValueChange={val => setAceitarData({ ...aceitarData, vehicleId: val })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione um veículo" /></SelectTrigger>
                <SelectContent>
                  {vehicles.filter(v => v.status === 'DISPONIVEL').map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.model} ({v.plate}) — {v.capacityKg}kg cap.
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAceitarOpen(false)} className="font-bold text-xs uppercase">
              Cancelar
            </Button>
            <Button onClick={handleAceitarCarga} disabled={!capacidadeOk} className="font-black text-xs uppercase gap-2">
              <Truck className="w-3.5 h-3.5" /> Confirmar Montagem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ MODAL: REVERTER PEDIDO ══ */}
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
            <Button variant="ghost" onClick={() => setIsReverterOpen(false)} className="font-bold text-xs uppercase">Cancelar</Button>
            <Button variant="destructive" onClick={confirmarReverter} className="font-black text-xs uppercase gap-2">
              <RotateCcw className="w-3.5 h-3.5" /> Confirmar Reversão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ MODAL: ROMANEIO ══ */}
      <Dialog open={isRomaneioOpen} onOpenChange={setIsRomaneioOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">Romaneio de Carga</DialogTitle>
          <div className="bg-white flex flex-col max-h-[90vh]">
            <div className="bg-primary px-6 py-4 flex items-center justify-between shrink-0">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Documento de Entrega</p>
                <h2 className="text-lg font-black uppercase text-white">Romaneio de Carga</h2>
              </div>
              <Button size="sm" variant="ghost" className="h-8 gap-1.5 font-black text-[9px] uppercase text-white/70 hover:text-white hover:bg-white/10" onClick={() => window.print()}>
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
              {/* Informações da carga (grupo, tipo, carregamento) exibidas no romaneio */}
              {romaneioData[0]?.grupoCarga && (
                <div className="flex gap-6 text-xs border-b pb-3">
                  <div>
                    <p className="text-[9px] font-black uppercase text-muted-foreground">Grupo de Carga</p>
                    <p className="font-black font-mono">{romaneioData[0].grupoCarga}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-muted-foreground">Tipo</p>
                    <p className="font-black">{romaneioData[0].tipoCarga === 'PALETIZADA' ? 'Paletizada' : 'Batida'}</p>
                  </div>
                  {romaneioData[0].dataCarregamento && (
                    <div>
                      <p className="text-[9px] font-black uppercase text-muted-foreground">Carregamento</p>
                      <p className="font-black">{formatDate(romaneioData[0].dataCarregamento, true)}</p>
                    </div>
                  )}
                </div>
              )}
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
                      {order.items.map((item: any) => {
                        const prod = products.find((p: any) => p.id === item.productId);
                        return (
                          <tr key={item.productId} className="border-b border-zinc-50">
                            <td className="py-1.5 font-bold uppercase text-[11px]">{prod?.name || item.productId}</td>
                            <td className="py-1.5 text-center font-black text-[11px]">{item.quantity}</td>
                            <td className="py-1.5 text-right font-black text-[11px]">{((prod?.weight || 0) * item.quantity).toFixed(2)} kg</td>
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

      {/* ══ MODAL: VISUALIZAR PEDIDO ══ */}
      <OrderDetailsModal
        isOpen={isVisualizarOpen}
        order={visualizarOrder}
        products={products}
        onClose={() => setIsVisualizarOpen(false)}
        headerBadge={{
          label: STATUS_LABELS[visualizarOrder?.status || ''] || visualizarOrder?.status || '',
          color: STATUS_COLORS[visualizarOrder?.status || ''] || 'bg-muted',
        }}
        statusLabels={STATUS_LABELS}
        actions={[
          {
            label: 'Confirmar Entrega',
            variant: 'green',
            icon: <CheckSquare className="w-3.5 h-3.5" />,
            hidden: o => o.status !== 'ENTREGA',
            onClick: () => { handleConfirmarEntrega(visualizarOrder!.id); setIsVisualizarOpen(false); },
          },
        ]}
      />

      {/* ══ MODAL: INICIAR ENTREGA COM DATA ══ */}
      <Dialog open={isIniciarEntregaOpen} onOpenChange={setIsIniciarEntregaOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black uppercase flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-green-500" /> Iniciar Entrega
            </DialogTitle>
            <DialogDescription className="text-[10px] uppercase font-bold">
              {iniciarEntregaOrders.length} pedido(s) · Selecione a data de saída
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground">
                Data e Hora de Saída *
              </label>
              <Input
                type="datetime-local"
                className="h-9 text-xs"
                value={dataIniciarEntrega}
                onChange={e => setDataIniciarEntrega(e.target.value)}
              />
              <p className="text-[9px] text-muted-foreground">Defina quando a entrega foi iniciada</p>
            </div>
            {iniciarEntregaOrders.length > 0 && (
              <div className="bg-muted/30 rounded-lg p-3 space-y-1 max-h-32 overflow-y-auto">
                <p className="text-[9px] font-black uppercase text-muted-foreground pb-2">Pedidos</p>
                {orders.filter(o => iniciarEntregaOrders.includes(o.id)).map(o => (
                  <div key={o.id} className="flex justify-between text-[10px] font-bold">
                    <span>{o.id} — {o.customerName}</span>
                    <span className="text-muted-foreground">{calcSacos(o)} un</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsIniciarEntregaOpen(false)} className="font-bold text-xs uppercase">
              Cancelar
            </Button>
            <Button onClick={confirmarIniciarEntrega} className="font-black text-xs uppercase gap-2 bg-green-500 hover:bg-green-400">
              <PlayCircle className="w-3.5 h-3.5" /> Iniciar Entrega
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ MODAL: CONFIRMAR ENTREGA COM DATA ══ */}
      <Dialog open={isConfirmarEntregaOpen} onOpenChange={setIsConfirmarEntregaOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black uppercase flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-green-500" /> Confirmar Entrega
            </DialogTitle>
            <DialogDescription className="text-[10px] uppercase font-bold">
              Pedido {confirmarEntregaOrderId} · Selecione a data de entrega
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground">
                Data e Hora de Entrega *
              </label>
              <Input
                type="datetime-local"
                className="h-9 text-xs"
                value={dataConfirmarEntrega}
                onChange={e => setDataConfirmarEntrega(e.target.value)}
              />
              <p className="text-[9px] text-muted-foreground">Defina quando a entrega foi concluída</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsConfirmarEntregaOpen(false)} className="font-bold text-xs uppercase">
              Cancelar
            </Button>
            <Button onClick={confirmarEntregaComData} className="font-black text-xs uppercase gap-2 bg-green-500 hover:bg-green-400">
              <CheckSquare className="w-3.5 h-3.5" /> Confirmar Entrega
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
