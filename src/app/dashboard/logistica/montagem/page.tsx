"use client"

import React from 'react';
import { useSystemData } from '@/server/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { OrderTable } from '@/components/shared/OrderTable';
import { OrderDetailsModal } from '@/components/shared/OrderDetailsModal';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Truck, Package, Eye
} from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import { format, parse, isAfter, isBefore, startOfDay } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { FilterPanel } from '@/components/shared/FilterPanel';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';

/**
 * Converte string de data (YYYY-MM-DD) para Date, considerando o timezone local
 */
function parseInputDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return startOfDay(date);
}

/**
 * Converte string de datetime-local para Date ISO string
 */
function parseDateTimeLocal(dateTimeStr: string): string {
  if (!dateTimeStr) return new Date().toISOString();
  const date = new Date(dateTimeStr);
  return date.toISOString();
}

/**
 * Valida as datas de carregamento e entrega
 */
function validateDates(dataCarregamento: string, scheduledDeliveryDate: string): { valid: boolean; error?: string } {
  if (!dataCarregamento || !scheduledDeliveryDate) {
    return { valid: false, error: 'Datas de carregamento e entrega são obrigatórias' };
  }

  const dtCarreg = new Date(dataCarregamento);
  const dtEntrega = parseInputDate(scheduledDeliveryDate);

  // Data de entrega deve ser >= data de carregamento
  const dtCarregDate = startOfDay(dtCarreg);
  if (isBefore(dtEntrega, dtCarregDate)) {
    return { valid: false, error: 'Data de entrega deve ser igual ou posterior à data de carregamento' };
  }

  return { valid: true };
}

function calcSacos(order: any) {
  return order.items.reduce((s: number, i: any) => s + i.quantity, 0);
}

function calcPeso(order: any) {
  return order.totalWeight || 0;
}

function calcValor(order: any) {
  return order.totalValue || 0;
}

function fmtDuration(start?: string | null, end?: string | null) {
  if (!start) return '—';
  const endTime = end ? new Date(end).getTime() : new Date().getTime();
  const diffMs = endTime - new Date(start).getTime();
  if (diffMs <= 0) return '0 min';
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const h = hours % 24;
  const m = minutes % 60;
  if (days > 0) return `${days}d ${h}h`;
  if (hours > 0) return `${hours}h ${m}m`;
  return `${minutes}m`;
}

export default function MontagemPage() {
  const router = useRouter();
  const {
    orders, products, vehicles,
    updateOrderStatus, isReady,
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
    frota: 'PROPRIA',      // Novo campo
    formaCarregamento: 'BATIDA', // Novo campo
  });

  const [isVisualizarOpen, setIsVisualizarOpen] = useState(false);
  const [visualizarOrderId, setVisualizarOrderId] = useState<string | null>(null);

  // Orders esperando montagem
  const montagemOrders = useMemo(() =>
    orders.filter(o => o.status === 'PRONTO_LOGISTICA'), [orders]);

  const expCidades = useMemo(() =>
    [...new Set(
      montagemOrders
        .map(o => o.city)
        .filter(Boolean)
    )], [montagemOrders]);

  // Montagem filtrada
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
    const randomGroupId = Math.random().toString(36).substring(2, 7).toUpperCase();
    setAceitarData({
      vehicleId: '',
      scheduledDeliveryDate: '',
      grupoCarga: randomGroupId,
      tipoCarga: '',
      dataCarregamento: '',
      frota: 'PROPRIA',
      formaCarregamento: 'BATIDA',
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

    // Validar datas
    const dateValidation = validateDates(aceitarData.dataCarregamento, aceitarData.scheduledDeliveryDate);
    if (!dateValidation.valid) {
      toast({ variant: 'destructive', title: 'Data inválida', description: dateValidation.error });
      return;
    }

    try {
      // Converter datas corretamente
      const dtEntrega = parseInputDate(aceitarData.scheduledDeliveryDate).toISOString();
      const dtCarreg = parseDateTimeLocal(aceitarData.dataCarregamento);

      aceitarOrderIds.forEach(id => {
        updateOrderStatus(id, 'AGUARDANDO_FATURAMENTO', {
          assignedVehicleId: aceitarData.vehicleId,
          scheduledDeliveryDate: dtEntrega,
          grupoCarga: aceitarData.grupoCarga,
          tipoCarga: aceitarData.tipoCarga,
          dataCarregamento: dtCarreg,
          frota: aceitarData.frota,
          formaCarregamento: aceitarData.formaCarregamento,
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

  const visualizarOrder = useMemo(() =>
    visualizarOrderId ? orders.find(o => o.id === visualizarOrderId) || null : null, [orders, visualizarOrderId]);

  if (!isReady) return null;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 border border-slate-200 rounded-md shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-600" />
            Montagem de Carga
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Selecione e organize os pedidos prontos para entrega.
          </p>
        </div>
      </div>

      {/* Filtros */}
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

      {/* Resumo de Seleção */}
      {selectedOrders.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-md px-5 py-3 flex items-center justify-between flex-wrap gap-3 shadow-sm">
          <div className="flex items-center gap-4 text-[11px] font-semibold uppercase tracking-wider">
            <span>{selectedOrders.length} pedido(s) selecionado(s)</span>
            <span>•</span>
            <span>{totalSacosSelected} sacos</span>
            <span>•</span>
            <span>{totalPesoSelected.toFixed(2)} kg</span>
            <span>•</span>
            <span>R$ {totalValorSelected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <Button
            onClick={() => openAceitar(selectedOrders)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase h-8 shadow-sm"
            size="sm"
          >
            <Truck className="w-4 h-4 mr-2" />
            Montar Carga
          </Button>
        </div>
      )}

      {/* Tabela */}
      <OrderTable
        orders={montagemFiltered}
        columns={[
          {
            key: 'select', header: '', width: '40px',
            render: (o) => (
              <Checkbox
                checked={selectedOrders.includes(o.id)}
                onCheckedChange={() => toggleOrder(o.id)}
                className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
              />
            ),
          },
          { key: 'id', header: 'Pedido', width: '110px', render: (o) => <span className="font-mono text-[11px] font-bold text-slate-800">{o.id}</span> },
          { key: 'customerName', header: 'Cliente', render: (o) => <span className="text-xs font-semibold text-slate-700">{o.customerName}</span> },
          { key: 'city', header: 'Cidade', width: '120px', render: (o) => <span className="text-[11px] font-medium text-slate-500 uppercase">{o.city || '---'}</span> },
          { key: 'sacos', header: 'Sacos', width: '60px', align: 'center', render: (o) => <span className="text-[11px] font-medium text-slate-600">{calcSacos(o)}</span> },
          { key: 'peso', header: 'Peso', width: '70px', align: 'center', render: (o) => <span className="text-[11px] font-medium text-slate-600">{calcPeso(o).toFixed(0)}kg</span> },
          { key: 'valor', header: 'Valor Unit.', width: '90px', align: 'right', render: (o) => <span className="text-[11px] font-bold text-slate-700">R$ {calcValor(o).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
          { key: 'createdAt', header: 'Emissão', width: '80px', align: 'center', render: (o) => <span className="text-[10px] font-medium text-slate-500">{format(new Date(o.createdAt), 'dd/MM/yy')}</span> },
          { key: 'approvedAt', header: 'Aprov. Prod.', width: '90px', align: 'center', render: (o) => <span className="text-[10px] font-medium text-slate-500">{o.approvedAt ? format(new Date(o.approvedAt), 'dd/MM/yy') : '---'}</span> },
          { key: 'leadTime', header: 'Tempo Corrido', width: '100px', align: 'right', render: (o) => <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700 font-bold px-1.5 py-0 rounded">{fmtDuration(o.createdAt)}</Badge> },
        ]}
        actions={[
          { label: 'Visualizar', onClick: (o) => router.push(`/dashboard/vendas/pedidos/${o.id}`), variant: 'ghost', icon: <Eye className="w-3 h-3" /> },
        ]}
        emptyMessage="Nenhum pedido aguardando montagem."
      />

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
            {/* Resumo */}
            <div className="bg-muted/30 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
              {aceitarOrderIds.map(id => {
                const order = orders.find(o => o.id === id);
                return (
                  <div key={id} className="flex justify-between text-[9px] font-bold">
                    <span>{order?.customerName} ({order?.city})</span>
                    <span>{calcSacos(order)!} sacos</span>
                  </div>
                );
              })}
            </div>

            {/* Grupo de Carga */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase">Grupo de Carga (Automático)</label>
              <Input
                readOnly
                className="h-9 text-sm font-mono bg-slate-100 text-slate-600 border-dashed focus-visible:ring-0 cursor-not-allowed"
                value={aceitarData.grupoCarga}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Frota */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase">Tipo de Frota *</label>
                <Select onValueChange={val => setAceitarData({ ...aceitarData, frota: val })} value={aceitarData.frota}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROPRIA">Própria</SelectItem>
                    <SelectItem value="TERCEIRIZADA">Terceirizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Forma de Carregamento */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase">Forma Carregamento *</label>
                <Select onValueChange={val => setAceitarData({ ...aceitarData, formaCarregamento: val })} value={aceitarData.formaCarregamento}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BATIDA">Bateção (Solto)</SelectItem>
                    <SelectItem value="PALETIZADA">Paletizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Tipo de Carga */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase">Volume Ocupado *</label>
                <Select onValueChange={val => setAceitarData({ ...aceitarData, tipoCarga: val })} value={aceitarData.tipoCarga}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CARGA_FECHADA">Carga Fechada</SelectItem>
                    <SelectItem value="CARGA_ABERTA">Carga Aberta</SelectItem>
                    <SelectItem value="FRACIONADA">Fracionada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Data Prevista de Entrega */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase">Previsão de Entrega *</label>
                <Input
                  type="date"
                  className="h-9 text-xs"
                  value={aceitarData.scheduledDeliveryDate}
                  onChange={e => setAceitarData({ ...aceitarData, scheduledDeliveryDate: e.target.value })}
                />
                {aceitarData.scheduledDeliveryDate && (
                  <p className="text-[8px] text-slate-500 font-medium">
                    Será salvo como: {format(parseInputDate(aceitarData.scheduledDeliveryDate), 'dd/MM/yyyy')}
                  </p>
                )}
              </div>
            </div>

            {/* Data de Carregamento */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase">Data/Hora Carregamento *</label>
              <Input
                type="datetime-local"
                className="h-9 text-xs"
                value={aceitarData.dataCarregamento}
                onChange={e => setAceitarData({ ...aceitarData, dataCarregamento: e.target.value })}
              />
              {aceitarData.dataCarregamento && (
                <p className="text-[8px] text-slate-500 font-medium">
                  Será salvo como: {format(new Date(aceitarData.dataCarregamento), 'dd/MM/yyyy HH:mm')}
                </p>
              )}
            </div>

            {/* Validação de Datas */}
            {aceitarData.scheduledDeliveryDate && aceitarData.dataCarregamento && (() => {
              const validation = validateDates(aceitarData.dataCarregamento, aceitarData.scheduledDeliveryDate);
              return !validation.valid ? (
                <div className="bg-red-50 border border-red-200 rounded p-2 text-red-700 text-[9px] font-bold">
                  ⚠️ {validation.error}
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded p-2 text-emerald-700 text-[9px] font-bold">
                  ✓ Datas válidas
                </div>
              );
            })()}

            {/* Veículo */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase">Veículo *</label>
              <Select onValueChange={val => setAceitarData({ ...aceitarData, vehicleId: val })} value={aceitarData.vehicleId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.model} ({v.plate}) - {v.capacityKg}kg
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {vehicleSelected && (
                <div className="text-[9px] text-muted-foreground">
                  Peso: {pesoAceitar.toFixed(2)}kg / Capacidade: {vehicleSelected.capacityKg}kg
                  {!capacidadeOk && <span className="text-red-600 font-bold"> ⚠️ Excede capacidade!</span>}
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
        actions={[]}
      />
    </div>
  );
}
