"use client"

import React from 'react';
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
  Calendar, AlertTriangle, Search, RotateCcw, User, Eye,
  Layers,
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

// Colunas do Kanban
const KANBAN_COLUMNS = [
  { key: 'FATURADO', label: 'Ag. Saída', color: 'border-t-green-400' },
  { key: 'ENTREGA', label: 'Em Rota', color: 'border-t-purple-400' },
  { key: 'ENTREGUE', label: 'Entregue', color: 'border-t-zinc-400' },
];

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
  const [montagemSearch, setMontagemSearch] = useState('');
  const [montagemCidade, setMontagemCidade] = useState('ALL');

  const [isAceitarOpen, setIsAceitarOpen] = useState(false);
  const [aceitarOrderIds, setAceitarOrderIds] = useState<string[]>([]);
  const [aceitarData, setAceitarData] = useState({
    vehicleId: '',
    scheduledDeliveryDate: '',
    grupoCarga: '',
    tipoCarga: '',
    dataCarregamento: '',
  });

  const [isIniciarEntregaCargaOpen, setIsIniciarEntregaCargaOpen] = useState(false);
  const [iniciarEntregaCarga, setIniciarEntregaCarga] = useState<string | null>(null);
  const [dataIniciarEntregaCarga, setDataIniciarEntregaCarga] = useState('');

  const [isFinalizarEntregaCargaOpen, setIsFinalizarEntregaCargaOpen] = useState(false);
  const [finalizarEntregaCarga, setFinalizarEntregaCarga] = useState<string | null>(null);
  const [dataFinalizarEntregaCarga, setDataFinalizarEntregaCarga] = useState('');

  const [histSearch, setHistSearch] = useState('');
  const [histCidade, setHistCidade] = useState('ALL');
  const [histDe, setHistDe] = useState('');
  const [histAte, setHistAte] = useState('');

  const [isVisualizarOpen, setIsVisualizarOpen] = useState(false);
  const [visualizarOrderId, setVisualizarOrderId] = useState<string | null>(null);

  const [isRomaneioOpen, setIsRomaneioOpen] = useState(false);
  const [romaneioGrupo, setRomaneioGrupo] = useState<string | null>(null);
  const romaneioRef = useRef<HTMLDivElement>(null);

  const [isDeletarGrupoOpen, setIsDeletarGrupoOpen] = useState(false);
  const [deletarGrupo, setDeletarGrupo] = useState<string | null>(null);

  // ── Orders derivados ────────────────────────────────────────────────────────
  // ABA 1: Montagem de Carga - pedidos esperando montagem
  const montagemOrders = useMemo(() =>
    orders.filter(o => o.status === 'PRONTO_LOGISTICA'), [orders]);

  // ABA 2: Liberado Logística - cargas montadas e em transporte
  const liberadoOrders = useMemo(() =>
    orders.filter(o => ['AGUARDANDO_FATURAMENTO', 'FATURADO', 'ENTREGA'].includes(o.status)), [orders]);

  // ABA 3: Histórico - entregas finalizadas
  const historicoOrders = useMemo(() =>
    orders.filter(o => o.status === 'ENTREGUE'), [orders]);

  // ── Cargas montadas: agrupadas por grupoCarga (liberadas para logística) ────
  const cargasMontadas = useMemo(() => {
    const cargasOrders = liberadoOrders.filter((o: any) => o.grupoCarga);
    const grupos: Record<string, any[]> = {};
    cargasOrders.forEach(o => {
      const g = (o as any).grupoCarga;
      if (!grupos[g]) grupos[g] = [];
      grupos[g].push(o);
    });
    return Object.entries(grupos).map(([grupo, pedidos]) => ({
      grupo,
      pedidos,
      tipoCarga: (pedidos[0] as any).tipoCarga,
      dataCarregamento: (pedidos[0] as any).dataCarregamento,
      scheduledDeliveryDate: (pedidos[0] as any).scheduledDeliveryDate,
      vehicleId: (pedidos[0] as any).assignedVehicleId,
      totalSacos: pedidos.reduce((a, o) => a + calcSacos(o), 0),
      totalPeso: pedidos.reduce((a, o) => a + calcPeso(o), 0),
      statusGeral: pedidos.every(o => o.status === 'ENTREGUE')
        ? 'ENTREGUE'
        : pedidos.some(o => o.status === 'ENTREGA')
          ? 'ENTREGA'
          : pedidos.some(o => o.status === 'FATURADO')
            ? 'FATURADO'
            : 'AGUARDANDO_FATURAMENTO',
    }));
  }, [liberadoOrders]);

  const expCidades = useMemo(() =>
    [...new Set(
      montagemOrders
        .map(o => o.city)
        .filter(Boolean)
    )], [montagemOrders]);

  // ── Montagem filtrada ──────────────────────────────────────────────────────
  const montagemFiltered = useMemo(() => {
    return montagemOrders
      .filter(o => {
        const matchSearch = !montagemSearch ||
          o.customerName?.toLowerCase().includes(montagemSearch.toLowerCase()) ||
          o.id?.toLowerCase().includes(montagemSearch.toLowerCase());
        const matchCidade = montagemCidade === 'ALL' || o.city === montagemCidade;
        return matchSearch && matchCidade;
      });
  }, [montagemOrders, montagemSearch, montagemCidade]);

  // ── Cargas por status para Liberado Logística ──────────────────────────────
  const cargasPorStatus = useMemo(() => {
    const statusMap: Record<string, any[]> = {
      'AGUARDANDO_FATURAMENTO': [],
      'FATURADO': [],
      'ENTREGA': [],
    };
    liberadoOrders.forEach(o => {
      if (statusMap[o.status]) {
        statusMap[o.status].push(o);
      }
    });
    return statusMap;
  }, [liberadoOrders]);

  const cidadesDisponiveis = useMemo(() =>
    [...new Set(historicoOrders.map(o => o.city).filter(Boolean))], [historicoOrders]);

  const historicoFiltered = useMemo(() => {
    return historicoOrders.filter(o => {
      const matchSearch = !histSearch ||
        o.customerName?.toLowerCase().includes(histSearch.toLowerCase()) ||
        o.id?.toLowerCase().includes(histSearch.toLowerCase());
      const matchCidade = histCidade === 'ALL' || o.city === histCidade;
      const entregaDate = (o as any).deliveryConfirmedAt ? new Date((o as any).deliveryConfirmedAt) : null;
      const matchDe = !histDe || (entregaDate && entregaDate >= new Date(histDe));
      const matchAte = !histAte || (entregaDate && entregaDate <= new Date(histAte + 'T23:59:59'));
      return matchSearch && matchCidade && matchDe && matchAte;
    });
  }, [historicoOrders, histSearch, histCidade, histDe, histAte]);

  // ── Kanban orders ──────────────────────────────────────────────────────────
  const kanbanOrders = useMemo(() =>
    orders
      .filter(o => ['FATURADO', 'ENTREGA', 'ENTREGUE'].includes(o.status)),
    [orders]);

  // ── Ações ──────────────────────────────────────────────────────────────────
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
    if (
      !aceitarData.vehicleId ||
      !aceitarData.scheduledDeliveryDate ||
      !aceitarData.grupoCarga ||
      !aceitarData.tipoCarga ||
      !aceitarData.dataCarregamento
    ) {
      toast({ variant: 'destructive', title: 'Campos incompletos', description: 'Preencha todos os campos obrigatórios.' });
      return;
    }
    try {
      aceitarOrderIds.forEach(id => {
        const order = orders.find(o => o.id === id);
        updateOrderStatus(id, 'AGUARDANDO_FATURAMENTO', {
          assignedVehicleId: aceitarData.vehicleId,
          scheduledDeliveryDate: aceitarData.scheduledDeliveryDate,
          grupoCarga: aceitarData.grupoCarga,
          tipoCarga: aceitarData.tipoCarga,
          dataCarregamento: aceitarData.dataCarregamento,
          acceptedAt: new Date().toISOString(),
        } as any);
      });
      toast({ title: 'Carga Montada', description: `${aceitarOrderIds.length} pedido(s) organizados em carga.` });
      setSelectedOrders([]);
      setIsAceitarOpen(false);
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao montar carga. Tente novamente.' });
    }
  };

  const handleIniciarEntregaCarga = (grupo: string) => {
    setIniciarEntregaCarga(grupo);
    setDataIniciarEntregaCarga('');
    setIsIniciarEntregaCargaOpen(true);
  };

  const confirmarIniciarEntregaCarga = async () => {
    if (!dataIniciarEntregaCarga || !iniciarEntregaCarga) {
      toast({ variant: 'destructive', title: 'Data obrigatória', description: 'Selecione a data de saída para iniciar a entrega.' });
      return;
    }
    try {
      const departureTime = new Date(dataIniciarEntregaCarga).toISOString();
      const cargaPedidos = cargasMontadas.find(c => c.grupo === iniciarEntregaCarga)?.pedidos || [];
      cargaPedidos.forEach(o => {
        updateOrderStatus(o.id, 'ENTREGA', { departureTime } as any);
      });
      toast({ title: 'Entrega Iniciada', description: `Carga ${iniciarEntregaCarga} em rota.` });
      setIsIniciarEntregaCargaOpen(false);
      setDataIniciarEntregaCarga('');
      setIniciarEntregaCarga(null);
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao iniciar entrega.' });
    }
  };

  const handleFinalizarEntregaCarga = (grupo: string) => {
    setFinalizarEntregaCarga(grupo);
    setDataFinalizarEntregaCarga('');
    setIsFinalizarEntregaCargaOpen(true);
  };

  const confirmarFinalizarEntregaCarga = async () => {
    if (!dataFinalizarEntregaCarga || !finalizarEntregaCarga) {
      toast({ variant: 'destructive', title: 'Data obrigatória', description: 'Selecione a data de finalização.' });
      return;
    }
    try {
      const cargaPedidos = cargasMontadas.find(c => c.grupo === finalizarEntregaCarga)?.pedidos || [];
      cargaPedidos.forEach(o => {
        if (o.status === 'ENTREGA') {
          updateOrderStatus(o.id, 'ENTREGUE', { 
            deliveryConfirmedAt: new Date(dataFinalizarEntregaCarga).toISOString() 
          } as any);
        }
      });
      toast({ title: 'Entrega Finalizada', description: `Carga ${finalizarEntregaCarga} entregue.` });
      setIsFinalizarEntregaCargaOpen(false);
      setDataFinalizarEntregaCarga('');
      setFinalizarEntregaCarga(null);
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao finalizar entrega.' });
    }
  };

  const visualizarOrder = useMemo(() =>
    visualizarOrderId ? orders.find(o => o.id === visualizarOrderId) || null : null, [orders, visualizarOrderId]);

  const romaneioData = useMemo(() => {
    if (!romaneioGrupo) return [];
    return cargasMontadas.find(c => c.grupo === romaneioGrupo)?.pedidos || [];
  }, [cargasMontadas, romaneioGrupo]);

  const abrirRomaneio = (grupo: string) => {
    setRomaneioGrupo(grupo);
    setIsRomaneioOpen(true);
  };

  const handleDeletarGrupo = (grupo: string) => {
    setDeletarGrupo(grupo);
    setIsDeletarGrupoOpen(true);
  };

  const confirmarDeletarGrupo = async () => {
    if (!deletarGrupo) return;
    try {
      const cargaPedidos = cargasMontadas.find(c => c.grupo === deletarGrupo)?.pedidos || [];
      cargaPedidos.forEach(o => {
        updateOrderStatus(o.id, 'PRONTO_LOGISTICA', { 
          grupoCarga: '',
          tipoCarga: '',
          dataCarregamento: '',
          assignedVehicleId: '',
          scheduledDeliveryDate: '',
        } as any);
      });
      toast({ title: 'Carga Cancelada', description: `Grupo ${deletarGrupo} foi cancelado. Pedidos retornaram à montagem.` });
      setIsDeletarGrupoOpen(false);
      setDeletarGrupo(null);
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao cancelar carga.' });
    }
  };

  if (!isReady) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Aguardando Montagem" value={montagemOrders.length} unit="pedidos" />
        <SummaryCard label="Em Cargas" value={cargasMontadas.reduce((a, c) => a + c.pedidos.length, 0)} unit="pedidos" color="info" />
        <SummaryCard label="Em Trânsito" value={cargasPorStatus['ENTREGA']?.length || 0} unit="pedidos" color="primary" highlight />
        <SummaryCard label="Entregues" value={historicoOrders.length} unit="pedidos" color="success" />
      </div>

      <Tabs defaultValue="montagem" className="w-full">
        <TabsList className="grid w-full max-w-[800px] grid-cols-3">
          <TabsTrigger value="montagem" className="gap-2 font-bold text-xs uppercase">
            <Package className="w-4 h-4" /> Montagem
          </TabsTrigger>
          <TabsTrigger value="liberado" className="gap-2 font-bold text-xs uppercase">
            <Truck className="w-4 h-4" /> Liberado
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2 font-bold text-xs uppercase">
            <History className="w-4 h-4" /> Histórico
          </TabsTrigger>
        </TabsList>

        {/* ══ ABA: MONTAGEM DE CARGA ═════════════════════════════════════════ */}
        <TabsContent value="montagem" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">Montagem de Carga</h2>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">
                Selecione pedidos para montar carga · Ordenado por prioridade
              </p>
            </div>
            <span className="text-[9px] font-bold text-muted-foreground uppercase">
              {montagemFiltered.length} de {montagemOrders.length} pedidos
            </span>
          </div>

          <FilterPanel
            fields={[
              { type: 'search', key: 'search', placeholder: 'Pedido ou cliente...', value: montagemSearch, onChange: setMontagemSearch, className: 'md:col-span-2' },
              {
                type: 'select', key: 'cidade', placeholder: 'Cidade', value: montagemCidade, onChange: setMontagemCidade,
                options: [{ label: 'Todas as Cidades', value: 'ALL' }, ...expCidades.map(c => ({ label: c!, value: c! }))],
              },
            ]}
            onClear={() => { setMontagemSearch(''); setMontagemCidade('ALL'); }}
            gridCols="grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
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
                <Button
                  size="sm"
                  className="h-8 gap-1.5 font-black text-[9px] uppercase bg-white text-primary hover:bg-white/90"
                  onClick={() => openAceitar(selectedOrders)}>
                  <Truck className="w-3.5 h-3.5" />
                  Montar Carga
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

          <OrderTable
            orders={montagemFiltered}
            columns={[
              {
                key: 'select', header: '', width: '40px',
                render: (o) => (
                  <Checkbox
                    checked={selectedOrders.includes(o.id)}
                    onCheckedChange={() => toggleOrder(o.id)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                ),
              },
              { key: 'id', header: 'Pedido', width: '120px', render: (o) => <span className="font-mono text-[11px] font-black text-primary">{o.id}</span> },
              { key: 'customerName', header: 'Cliente', render: (o) => <span className="text-[11px] font-black uppercase">{o.customerName}</span> },
              { key: 'city', header: 'Cidade', width: '110px', render: (o) => <span className="text-[10px] font-bold text-muted-foreground uppercase">{o.city || '---'}</span> },
              { key: 'sacos', header: 'Sacos', width: '80px', align: 'center', render: (o) => <span className="text-[11px] font-black">{calcSacos(o)}</span> },
              { key: 'peso', header: 'Peso KG', width: '100px', align: 'center', render: (o) => <span className="text-[11px] font-black">{calcPeso(o).toFixed(2)}</span> },
              { key: 'createdAt', header: 'Dt Pedido', width: '100px', align: 'center', hiddenOn: 'lg', render: (o) => <span className="text-[9px] font-bold text-muted-foreground">{formatDate((o as any).createdAt)}</span> },
            ]}
            actions={[
              { label: 'Visualizar', onClick: (o) => { setVisualizarOrderId(o.id); setIsVisualizarOpen(true); }, variant: 'ghost', icon: <Eye className="w-3 h-3" /> },
            ]}
            emptyMessage="Nenhum pedido aguardando montagem."
          />
        </TabsContent>

        {/* ══ ABA: CARGAS MONTADAS ════════════════════════════════════════════ */}
        <TabsContent value="liberado" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">Liberado Logística</h2>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">
                Cargas montadas e em transporte
              </p>
            </div>
            <span className="text-[9px] font-bold text-muted-foreground uppercase">
              {cargasMontadas.length} carga(s)
            </span>
          </div>

          {cargasMontadas.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-xs font-bold uppercase">
              Nenhuma carga montada ainda.
            </div>
          ) : (
            <div className="space-y-4">
              {cargasMontadas
                .map(carga => {
                  const vehicle = vehicles.find(v => v.id === carga.vehicleId);
                  const isEmEntrega = carga.statusGeral === 'ENTREGA';
                  return (
                    <div key={carga.grupo} className="border rounded-xl overflow-hidden">
                      {/* Cabeçalho da carga */}
                      <div className="bg-muted/40 px-4 py-3 flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-black">{carga.grupo}</span>
                          <Badge variant="outline" className={`${STATUS_COLORS[carga.statusGeral] || 'bg-muted'} text-[8px] font-black uppercase px-2 h-5`}>
                            {STATUS_LABELS[carga.statusGeral] || carga.statusGeral}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1.5 font-black text-[9px] uppercase"
                            onClick={() => abrirRomaneio(carga.grupo)}>
                            <Printer className="w-3.5 h-3.5" /> Abrir Romaneio
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          {carga.statusGeral === 'FATURADO' && (
                            <Button
                              size="sm"
                              className="h-8 gap-1.5 font-black text-[9px] uppercase bg-green-500 hover:bg-green-400 text-white"
                              onClick={(e) => { e.stopPropagation(); handleIniciarEntregaCarga(carga.grupo); }}>
                              <PlayCircle className="w-3.5 h-3.5" /> Iniciar Entrega
                            </Button>
                          )}
                          {carga.statusGeral === 'ENTREGA' && (
                            <Button
                              size="sm"
                              className="h-8 gap-1.5 font-black text-[9px] uppercase bg-blue-500 hover:bg-blue-400 text-white"
                              onClick={(e) => { e.stopPropagation(); handleFinalizarEntregaCarga(carga.grupo); }}>
                              <CheckSquare className="w-3.5 h-3.5" /> Finalizar Entrega
                            </Button>
                          )}
                          {carga.statusGeral !== 'ENTREGA' && carga.statusGeral !== 'ENTREGUE' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 gap-1.5 font-black text-[9px] uppercase"
                              onClick={(e) => { e.stopPropagation(); handleDeletarGrupo(carga.grupo); }}>
                              <X className="w-3.5 h-3.5" /> Cancelar
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Info da carga */}
                      <div className="bg-muted/10 px-4 py-2 flex items-center gap-6 text-[10px] font-bold text-muted-foreground flex-wrap">
                        <span><span className="font-black text-foreground">{carga.tipoCarga === 'PALETIZADA' ? 'Paletizada' : 'Batida'}</span></span>
                        <span>Carregamento: <span className="font-black text-foreground">{formatDate(carga.dataCarregamento, true)}</span></span>
                        <span>Entrega: <span className="font-black text-foreground">{formatDate(carga.scheduledDeliveryDate)}</span></span>
                        <span>Veículo: <span className="font-black text-foreground">{vehicle?.model || '—'} {vehicle?.plate ? `(${vehicle.plate})` : ''}</span></span>
                        <span>{carga.pedidos.length} pedidos · {carga.totalSacos} sacos · {carga.totalPeso.toFixed(2)} kg</span>
                      </div>

                      {/* Pedidos da carga */}
                      <div className="divide-y">
                        {carga.pedidos.map(o => (
                          <div key={o.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors">
                            <div className="flex items-center gap-4">
                              <span className="font-mono text-[11px] font-black text-primary w-28">{o.id}</span>
                              <span className="text-[11px] font-black uppercase">{o.customerName}</span>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase hidden md:block">{o.city}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-[10px] font-bold text-muted-foreground">{calcSacos(o)} un · {calcPeso(o).toFixed(2)} kg</span>
                              <Badge variant="outline" className={`${STATUS_COLORS[o.status] || 'bg-muted'} text-[8px] font-black uppercase px-2 h-5`}>
                                {STATUS_LABELS[o.status] || o.status}
                              </Badge>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                onClick={() => { setVisualizarOrderId(o.id); setIsVisualizarOpen(true); }}>
                                <Eye className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </TabsContent>

        {/* ══ ABA: HISTÓRICO ══════════════════════════════════════════════════ */}
        <TabsContent value="historico" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">Histórico de Entregas</h2>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Pedidos entregues</p>
            </div>
            <span className="text-[9px] font-bold text-muted-foreground uppercase">
              {historicoFiltered.length} de {historicoOrders.length} pedidos
            </span>
          </div>

          <FilterPanel
            fields={[
              { type: 'search', key: 'search', placeholder: 'Pedido ou cliente...', value: histSearch, onChange: setHistSearch, className: 'md:col-span-2' },
              {
                type: 'select', key: 'cidade', placeholder: 'Cidade', value: histCidade, onChange: setHistCidade,
                options: [{ label: 'Todas', value: 'ALL' }, ...cidadesDisponiveis.map(c => ({ label: c!, value: c! }))],
              },
              { type: 'date', key: 'de', placeholder: 'De', value: histDe, onChange: setHistDe },
              { type: 'date', key: 'ate', placeholder: 'Até', value: histAte, onChange: setHistAte },
            ]}
            onClear={() => { setHistSearch(''); setHistCidade('ALL'); setHistDe(''); setHistAte(''); }}
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
              { key: 'grupoCarga', header: 'Grupo de Carga', width: '140px', render: (o) => <span className="font-mono text-[10px] font-black">{(o as any).grupoCarga || '---'}</span> },
              { key: 'sacos', header: 'Sacos', width: '80px', align: 'center', render: (o) => <span className="text-[11px] font-black">{calcSacos(o)}</span> },
              { key: 'departureTime', header: 'Dt Saída', width: '100px', align: 'center', render: (o) => <span className="text-[9px] font-bold text-muted-foreground">{formatDate((o as any).departureTime, true)}</span> },
              {
                key: 'status', header: 'Status', width: '120px', align: 'center',
                render: (o) => <Badge variant="outline" className={`${STATUS_COLORS[o.status] || ''} text-[8px] font-black uppercase px-2 h-5`}>{STATUS_LABELS[o.status] || o.status}</Badge>,
              },
            ]}
            actions={[
              { label: 'Visualizar', onClick: (o) => { setVisualizarOrderId(o.id); setIsVisualizarOpen(true); }, variant: 'ghost', icon: <Eye className="w-3 h-3" /> },
            ]}
            emptyMessage="Nenhum pedido no histórico."
          />
        </TabsContent>
      </Tabs>

      {/* ══ MODAL: MONTAR CARGA ══ */}
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
              <label className="text-[10px] font-black uppercase text-muted-foreground">Grupo de Carga *</label>
              <Input
                className="h-9 text-xs font-mono"
                placeholder="Ex: ROTA-UBERLANDIA-01"
                value={aceitarData.grupoCarga}
                onChange={e => setAceitarData({ ...aceitarData, grupoCarga: e.target.value })}
              />
              <p className="text-[9px] text-muted-foreground">Identificador único para este conjunto de pedidos</p>
            </div>

            {/* Tipo de Carga */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground">Tipo de Carga *</label>
              <Select value={aceitarData.tipoCarga} onValueChange={val => setAceitarData({ ...aceitarData, tipoCarga: val })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BATIDA">Batida</SelectItem>
                  <SelectItem value="PALETIZADA">Paletizada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Data de Carregamento */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground">Data de Carregamento *</label>
              <Input
                type="datetime-local"
                className="h-9 text-xs"
                value={aceitarData.dataCarregamento}
                onChange={e => setAceitarData({ ...aceitarData, dataCarregamento: e.target.value })}
              />
            </div>

            {/* Data Programada de Entrega */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground">Data Programada de Entrega *</label>
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
            <Button variant="ghost" onClick={() => setIsAceitarOpen(false)} className="font-bold text-xs uppercase">Cancelar</Button>
            <Button onClick={handleAceitarCarga} disabled={!capacidadeOk} className="font-black text-xs uppercase gap-2">
              <Truck className="w-3.5 h-3.5" /> Montar Carga
            </Button>
          </DialogFooter>
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
        actions={[]}
      />

      {/* ══ MODAL: INICIAR ENTREGA DE CARGA ══ */}
      <Dialog open={isIniciarEntregaCargaOpen} onOpenChange={setIsIniciarEntregaCargaOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black uppercase flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-green-500" /> Iniciar Entrega de Carga
            </DialogTitle>
            <DialogDescription className="text-[10px] uppercase font-bold">
              Carga {iniciarEntregaCarga} · Defina data de saída
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground">Data e Hora de Saída *</label>
              <Input
                type="datetime-local"
                className="h-9 text-xs"
                value={dataIniciarEntregaCarga}
                onChange={e => setDataIniciarEntregaCarga(e.target.value)}
              />
              <p className="text-[9px] text-muted-foreground">Defina quando a carga saiu para entrega</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsIniciarEntregaCargaOpen(false)} className="font-bold text-xs uppercase">Cancelar</Button>
            <Button onClick={confirmarIniciarEntregaCarga} className="font-black text-xs uppercase gap-2 bg-green-500 hover:bg-green-400">
              <PlayCircle className="w-3.5 h-3.5" /> Iniciar Entrega
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ MODAL: FINALIZAR ENTREGA DE CARGA ══ */}
      <Dialog open={isFinalizarEntregaCargaOpen} onOpenChange={setIsFinalizarEntregaCargaOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black uppercase flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-500" /> Finalizar Entrega de Carga
            </DialogTitle>
            <DialogDescription className="text-[10px] uppercase font-bold">
              Carga {finalizarEntregaCarga} · Defina data de finalização
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground">Data e Hora de Finalização *</label>
              <Input
                type="datetime-local"
                className="h-9 text-xs"
                value={dataFinalizarEntregaCarga}
                onChange={e => setDataFinalizarEntregaCarga(e.target.value)}
              />
              <p className="text-[9px] text-muted-foreground">Defina quando a carga foi entregue completamente</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsFinalizarEntregaCargaOpen(false)} className="font-bold text-xs uppercase">Cancelar</Button>
            <Button onClick={confirmarFinalizarEntregaCarga} className="font-black text-xs uppercase gap-2 bg-blue-500 hover:bg-blue-400 text-white">
              <CheckSquare className="w-3.5 h-3.5" /> Finalizar Entrega
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
                <h2 className="text-lg font-black uppercase text-white">Romaneio de Carga - {romaneioGrupo}</h2>
              </div>
              <Button size="sm" variant="ghost" className="h-8 gap-1.5 font-black text-[9px] uppercase text-white/70 hover:text-white hover:bg-white/10" onClick={() => window.print()}>
                <Printer className="w-3.5 h-3.5" /> Imprimir
              </Button>
            </div>
            <div ref={romaneioRef} className="flex-1 overflow-y-auto p-6 space-y-6">
              {romaneioData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  <p className="font-bold">Nenhum pedido encontrado para essa carga</p>
                  <p className="text-[10px] mt-2">Grupo: {romaneioGrupo}</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-[10px] font-bold text-muted-foreground border-b pb-3 flex-wrap gap-2">
                    <span>Data: {format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
                    <span>Pedidos: {romaneioData.length}</span>
                    <span>Sacos: {romaneioData.reduce((acc, o) => acc + calcSacos(o), 0)} un</span>
                    <span>Peso: {romaneioData.reduce((acc, o) => acc + calcPeso(o), 0).toFixed(2)} KG</span>
                    <span>Valor: R$ {romaneioData.reduce((acc, o) => acc + calcValor(o), 0).toLocaleString('pt-BR')}</span>
                  </div>
                  {romaneioData.length > 0 && romaneioData[0]?.grupoCarga && (
                    <div className="flex gap-6 text-xs border-b pb-3 flex-wrap">
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
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══ MODAL: DELETAR GRUPO DE CARGA ══ */}
      <Dialog open={isDeletarGrupoOpen} onOpenChange={setIsDeletarGrupoOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black uppercase flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-4 h-4" /> Cancelar Carga
            </DialogTitle>
            <DialogDescription className="text-[10px] uppercase font-bold">
              Tem certeza que deseja cancelar o grupo {deletarGrupo}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm font-bold text-muted-foreground">
              Esta ação irá:
            </p>
            <ul className="text-[10px] font-bold text-muted-foreground space-y-1 list-disc list-inside">
              <li>Remover o grupo de carga</li>
              <li>Retornar todos os pedidos para a aba de Montagem</li>
              <li>Limpar os dados de carregamento e entrega</li>
            </ul>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-[9px] font-black uppercase text-red-700">
                ⚠️ Esta ação não pode ser desfeita
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeletarGrupoOpen(false)} className="font-bold text-xs uppercase">Manter Carga</Button>
            <Button onClick={confirmarDeletarGrupo} variant="destructive" className="font-black text-xs uppercase gap-2">
              <X className="w-3.5 h-3.5" /> Cancelar Carga
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}