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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Truck, MapPin, Navigation, CheckSquare, Package,
  Route, ChevronDown, ChevronUp, X, History, Printer, PlayCircle, Calendar, Clock, Plus, Play, Edit
} from 'lucide-react';
import { DeliverySchedule } from '@/lib/types';
import { useState, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

const statusColors: Record<string, string> = {
  AGUARDANDO_FATURAMENTO: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  FATURADO: 'bg-green-100 text-green-800 border-green-200',
  ENTREGA: 'bg-purple-100 text-purple-800 border-purple-200',
};
const statusLabels: Record<string, string> = {
  AGUARDANDO_FATURAMENTO: 'Ag. Faturamento',
  FATURADO: 'Faturado — Lib. Entrega',
  ENTREGA: 'Em Entrega',
};

const scheduleStatusColors: Record<string, string> = {
  AGENDADO: 'bg-blue-100 text-blue-800 border-blue-200',
  EM_ANDAMENTO: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  CONCLUIDO: 'bg-green-100 text-green-800 border-green-200',
};

const scheduleStatusLabels: Record<string, string> = {
  AGENDADO: 'Agendado',
  EM_ANDAMENTO: 'Em Andamento',
  CONCLUIDO: 'Concluído',
};

export default function LogisticaPage() {
  const { orders, products, vehicles, drivers, members, updateOrderStatus, confirmDelivery, isReady, deliverySchedules, createDeliverySchedule, updateDeliverySchedule, deleteDeliverySchedule, startDeliverySchedule, completeDeliverySchedule } = useSystemData();

  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [isFecharCargaOpen, setIsFecharCargaOpen] = useState(false);
  const [isFecharRotaOpen, setIsFecharRotaOpen] = useState(false);
  const [isRomaneioOpen, setIsRomaneioOpen] = useState(false);
  const [isAceitarOpen, setIsAceitarOpen] = useState(false);
  const [aceitarOrderIds, setAceitarOrderIds] = useState<string[]>([]);
  const [aceitarData, setAceitarData] = useState({ vehicleId: '', driverId: '', scheduledDeliveryDate: '' });
  const [romaneioOrders, setRomaneioOrders] = useState<string[]>([]);
  const [shipmentData, setShipmentData] = useState({ vehicleId: '', driverId: '' });
  const [expandedCities, setExpandedCities] = useState<Record<string, boolean>>({});
  const romaneioRef = useRef<HTMLDivElement>(null);

  // Estados para agendamentos
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleData, setScheduleData] = useState({
    scheduledDate: '',
    vehicleId: '',
    driverId: '',
    orders: [] as string[],
    notes: ''
  });
  const [selectedSchedule, setSelectedSchedule] = useState<DeliverySchedule | null>(null);
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [scheduleStatus, setScheduleStatus] = useState('ALL');
  const [scheduleVeiculo, setScheduleVeiculo] = useState('ALL');

  // Filtros histórico
  const [histSearch, setHistSearch] = useState('');
  const [histStatus, setHistStatus] = useState('ALL');
  const [histCidade, setHistCidade] = useState('ALL');
  const [histDe, setHistDe] = useState('');
  const [histAte, setHistAte] = useState('');

  const expedicaoOrders = orders.filter(o => o.status === 'PRONTO_LOGISTICA');
  const aguardandoFaturamentoOrders = orders.filter(o => o.status === 'AGUARDANDO_FATURAMENTO');
  const faturadosOrders = orders.filter(o => o.status === 'FATURADO');
  const emRotaOrders = orders.filter(o => o.status === 'ENTREGA');
  const historicoOrders = orders.filter(o => ['ENTREGA', 'FATURADO'].includes(o.status));

  const groupedByCity = useMemo(() => {
    return expedicaoOrders.reduce((acc, order) => {
      const city = order.city || 'Sem Cidade';
      if (!acc[city]) acc[city] = [];
      acc[city].push(order);
      return acc;
    }, {} as Record<string, typeof expedicaoOrders>);
  }, [expedicaoOrders]);

  const groupedFaturamento = useMemo(() => {
    return aguardandoFaturamentoOrders.reduce((acc, order) => {
      const city = order.city || 'Sem Cidade';
      if (!acc[city]) acc[city] = [];
      acc[city].push(order);
      return acc;
    }, {} as Record<string, typeof aguardandoFaturamentoOrders>);
  }, [aguardandoFaturamentoOrders]);

  const groupedFaturados = useMemo(() => {
    return faturadosOrders.reduce((acc, order) => {
      const city = order.city || 'Sem Cidade';
      if (!acc[city]) acc[city] = [];
      acc[city].push(order);
      return acc;
    }, {} as Record<string, typeof faturadosOrders>);
  }, [faturadosOrders]);

  const historicoFiltered = useMemo(() => {
    return historicoOrders.filter(o => {
      const matchSearch = !histSearch ||
        o.customerName?.toLowerCase().includes(histSearch.toLowerCase()) ||
        o.id?.toLowerCase().includes(histSearch.toLowerCase());
      const matchStatus = histStatus === 'ALL' || o.status === histStatus;
      const matchCidade = histCidade === 'ALL' || o.city === histCidade;
      const orderDate = new Date(o.createdAt);
      const matchDe = !histDe || orderDate >= new Date(histDe);
      const matchAte = !histAte || orderDate <= new Date(histAte);
      return matchSearch && matchStatus && matchCidade && matchDe && matchAte;
    });
  }, [historicoOrders, histSearch, histStatus, histCidade, histDe, histAte]);

  const cidadesDisponiveis = useMemo(() => [...new Set(historicoOrders.map(o => o.city).filter(Boolean))], [historicoOrders]);

  const scheduleFiltered = useMemo(() => {
    return deliverySchedules.filter(s => {
      const vehicle = vehicles.find(v => v.id === s.vehicleId);
      const driver = drivers.find(d => d.id === s.driverId);
      const matchSearch = !scheduleSearch ||
        vehicle?.model?.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
        driver?.name?.toLowerCase().includes(scheduleSearch.toLowerCase());
      const matchStatus = scheduleStatus === 'ALL' || s.status === scheduleStatus;
      const matchVeiculo = scheduleVeiculo === 'ALL' || s.vehicleId === scheduleVeiculo;
      return matchSearch && matchStatus && matchVeiculo;
    });
  }, [deliverySchedules, scheduleSearch, scheduleStatus, scheduleVeiculo, vehicles, drivers]);

  if (!isReady) return null;

  const toggleOrder = (orderId: string) => {
    setSelectedOrders(prev => prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]);
  };

  const toggleCity = (city: string) => {
    const cityOrderIds = groupedByCity[city].map(o => o.id);
    const allSelected = cityOrderIds.every(id => selectedOrders.includes(id));
    setSelectedOrders(prev =>
      allSelected ? prev.filter(id => !cityOrderIds.includes(id)) : [...new Set([...prev, ...cityOrderIds])]
    );
  };

  const selectedOrdersData = orders.filter(o => selectedOrders.includes(o.id));
  const totalSacosSelected = selectedOrdersData.reduce((acc, o) => acc + o.items.reduce((s, i) => s + i.quantity, 0), 0);
  const totalPesoSelected = selectedOrdersData.reduce((acc, o) => acc + (o.totalWeight || 0), 0);
  const totalValorSelected = selectedOrdersData.reduce((acc, o) => acc + (o.totalValue || 0), 0);
  const citiesSelected = [...new Set(selectedOrdersData.map(o => o.city).filter(Boolean))];

  const handleAceitarCarga = () => {
    if (!aceitarData.vehicleId || !aceitarData.scheduledDeliveryDate) {
      toast({ variant: "destructive", title: "Campos incompletos", description: "Preencha todos os campos." });
      return;
    }
    aceitarOrderIds.forEach(id => {
      updateOrderStatus(id, 'AGUARDANDO_FATURAMENTO', {
        assignedVehicleId: aceitarData.vehicleId,
        assignedDriverId: '',
        scheduledDeliveryDate: aceitarData.scheduledDeliveryDate,
      } as any);
    });
    toast({ title: "Pedidos Aceitos", description: `${aceitarOrderIds.length} pedido(s) enviados para faturamento.` });
    setSelectedOrders([]);
    setAceitarData({ vehicleId: '', driverId: '', scheduledDeliveryDate: '' });
    setAceitarOrderIds([]);
    setIsAceitarOpen(false);
  };

  const handleIniciarEntrega = (orderIds: string[]) => {
    orderIds.forEach(id => {
      updateOrderStatus(id, 'ENTREGA', { departureTime: new Date().toISOString() } as any);
    });
    setRomaneioOrders(orderIds);
    setIsRomaneioOpen(true);
    toast({ title: "Entrega Iniciada", description: `${orderIds.length} pedido(s) em rota.` });
  };

  const romaneioData = orders.filter(o => romaneioOrders.includes(o.id));

  const handleIniciarAgendamento = (scheduleId: string) => {
    startDeliverySchedule(scheduleId);
    toast({ title: "Agendamento Iniciado", description: "Entrega iniciada com sucesso." });
  };

  const handleConcluirAgendamento = (scheduleId: string) => {
    completeDeliverySchedule(scheduleId);
    toast({ title: "Agendamento Concluído", description: "Entrega finalizada com sucesso." });
  };

  const handleEditarAgendamento = (schedule: DeliverySchedule) => {
    setSelectedSchedule(schedule);
    setIsScheduleOpen(true);
  };

  const setIsNovoAgendamentoOpen = (open: boolean) => {
    if (!open) {
      setSelectedSchedule(null);
      setScheduleData({
        scheduledDate: '',
        vehicleId: '',
        driverId: '',
        orders: [],
        notes: ''
      });
    }
    setIsScheduleOpen(open);
  };

  const CityGroup = ({ city, cityOrders, colorClass, badgeClass, onAceitar, onIniciar, expandKey }: any) => {
    const totalSacos = cityOrders.reduce((acc: number, o: any) => acc + o.items.reduce((s: number, i: any) => s + i.quantity, 0), 0);
    const totalPeso = cityOrders.reduce((acc: number, o: any) => acc + (o.totalWeight || 0), 0);
    const isExpanded = expandedCities[expandKey] !== false;
    const vehicle = cityOrders[0]?.assignedVehicleId ? vehicles.find((v: any) => v.id === cityOrders[0].assignedVehicleId) : null;
    const driver = cityOrders[0]?.assignedDriverId ? drivers.find((d: any) => d.id === cityOrders[0].assignedDriverId) : null;

    return (
      <div>
        <div className={`${colorClass} px-4 py-3 border rounded-t-lg flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <MapPin className="w-3.5 h-3.5" />
            <h3 className="text-[10px] font-black uppercase tracking-widest">{city}</h3>
            {vehicle && <span className="text-[9px] font-bold opacity-60">{vehicle.model} · {driver?.name}</span>}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-[9px] bg-white ${badgeClass}`}>{cityOrders.length} pedidos</Badge>
            <Badge variant="outline" className={`text-[9px] bg-white ${badgeClass}`}>{totalSacos} UN</Badge>
            <Badge variant="outline" className={`text-[9px] bg-white ${badgeClass}`}>{totalPeso.toFixed(2)} KG</Badge>
            {onAceitar && (
              <Button size="sm" className="h-7 gap-1.5 font-black text-[9px] uppercase bg-primary hover:bg-primary/90"
                onClick={onAceitar}>
                <Calendar className="w-3 h-3" /> Aceitar Pedidos
              </Button>
            )}
            {onIniciar && (
              <Button size="sm" className="h-7 gap-1.5 font-black text-[9px] uppercase bg-green-600 hover:bg-green-700"
                onClick={onIniciar}>
                <PlayCircle className="w-3 h-3" /> Iniciar Entrega
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cityOrders.map((order: any) => (
                    <TableRow key={order.id} className="h-12 hover:bg-muted/20">
                      <TableCell className="font-mono text-[11px] font-black text-primary">{order.id}</TableCell>
                      <TableCell className="text-[11px] font-black uppercase">{order.customerName}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">{order.customerAddress || '---'}</TableCell>
                      <TableCell className="text-center text-[11px] font-black">{order.items.reduce((acc: number, i: any) => acc + i.quantity, 0)}</TableCell>
                      <TableCell className="text-center text-[11px] font-black">{order.totalWeight?.toFixed(2)}</TableCell>
                      <TableCell className="text-center text-[9px] font-bold text-muted-foreground">
                        {(order as any).scheduledDeliveryDate ? format(new Date((order as any).scheduledDeliveryDate), 'dd/MM/yyyy') : order.deliveryDate ? format(new Date(order.deliveryDate), 'dd/MM/yy') : '---'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`${statusColors[order.status] || ''} text-[8px] font-black uppercase px-2 h-5`}>
                          {statusLabels[order.status] || order.status}
                        </Badge>
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

  return (
    <div className="space-y-6">
      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4">
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Aguardando Aceite</p>
            <p className="text-2xl font-black">{expedicaoOrders.length} pedidos</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4">
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Ag. Faturamento</p>
            <p className="text-2xl font-black text-indigo-600">{aguardandoFaturamentoOrders.length} pedidos</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4">
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Lib. para Entrega</p>
            <p className="text-2xl font-black text-green-600">{faturadosOrders.length} pedidos</p>
          </CardContent>
        </Card>
        <Card className="bg-primary text-primary-foreground border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-[9px] font-black uppercase opacity-70 tracking-widest mb-1">Em Trânsito</p>
            <p className="text-2xl font-black">{emRotaOrders.length} pedidos</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="expedicao" className="w-full">
        <TabsList className="grid w-full max-w-[800px] grid-cols-3">
          <TabsTrigger value="expedicao" className="gap-2 font-bold text-xs uppercase">
            <Package className="w-4 h-4" /> Expedição
          </TabsTrigger>

          <TabsTrigger value="rota" className="gap-2 font-bold text-xs uppercase">
            <Navigation className="w-4 h-4" /> Em Rota
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2 font-bold text-xs uppercase">
            <History className="w-4 h-4" /> Histórico
          </TabsTrigger>
        </TabsList>

        {/* ABA EXPEDIÇÃO */}
        <TabsContent value="expedicao" className="mt-6 space-y-6">

          {/* Barra de seleção */}
          {selectedOrders.length > 0 && (
            <div className="bg-primary text-primary-foreground rounded-xl px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-6">
                {[
                  { label: 'Selecionados', value: `${selectedOrders.length} pedidos` },
                  { label: 'Sacos', value: `${totalSacosSelected} un` },
                  { label: 'Peso', value: `${totalPesoSelected.toFixed(2)} KG` },
                  { label: 'Valor', value: `R$ ${totalValorSelected.toLocaleString()}` },
                  { label: 'Cidades', value: citiesSelected.join(', ') },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-[9px] font-black uppercase opacity-70">{item.label}</p>
                    <p className="text-sm font-black">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" className="h-8 gap-1.5 font-black text-[9px] uppercase bg-white text-primary hover:bg-white/90"
                  onClick={() => {
                    setAceitarOrderIds(selectedOrders);
                    setIsAceitarOpen(true);
                  }}>
                  <Calendar className="w-3.5 h-3.5" />
                  {citiesSelected.length > 1 ? 'Aceitar Rota' : 'Aceitar Carga'}
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => setSelectedOrders([])}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* PRONTO_LOGISTICA — aguardando aceite */}
          {Object.keys(groupedByCity).length === 0 && Object.keys(groupedFaturamento).length === 0 && Object.keys(groupedFaturados).length === 0 && (
            <Card className="border-none shadow-sm">
              <CardContent className="py-16 text-center text-muted-foreground italic text-xs uppercase opacity-40">
                Nenhum pedido na expedição.
              </CardContent>
            </Card>
          )}

          {Object.entries(groupedByCity).map(([city, cityOrders], idx) => {
            const cityTotalSacos = cityOrders.reduce((acc, o) => acc + o.items.reduce((s, i) => s + i.quantity, 0), 0);
            const cityTotalPeso = cityOrders.reduce((acc, o) => acc + (o.totalWeight || 0), 0);
            const cityTotalValor = cityOrders.reduce((acc, o) => acc + (o.totalValue || 0), 0);
            const allCitySelected = cityOrders.every(o => selectedOrders.includes(o.id));
            const someCitySelected = cityOrders.some(o => selectedOrders.includes(o.id));
            const isExpanded = expandedCities[city] !== false;

            return (
              <div key={city} className={idx > 0 ? 'border-t-4 border-primary/10 pt-4' : ''}>
                <div className="bg-primary/5 px-4 py-3 border rounded-t-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={allCitySelected}
                      ref={el => { if (el) el.indeterminate = someCitySelected && !allCitySelected; }}
                      onChange={() => toggleCity(city)} className="w-4 h-4 accent-primary cursor-pointer" />
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">{city}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] bg-white">{cityOrders.length} pedidos</Badge>
                    <Badge variant="outline" className="text-[9px] bg-white">{cityTotalSacos} UN</Badge>
                    <Badge variant="outline" className="text-[9px] bg-white">{cityTotalPeso.toFixed(2)} KG</Badge>
                    <Badge variant="outline" className="text-[9px] bg-white">R$ {cityTotalValor.toLocaleString()}</Badge>
                    <Button size="sm" variant="outline" className="h-7 gap-1.5 font-black text-[9px] uppercase"
                      onClick={() => { setAceitarOrderIds(cityOrders.map(o => o.id)); setIsAceitarOpen(true); }}>
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
                            <TableHead className="w-10"></TableHead>
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
                            const totalSacos = order.items.reduce((acc, i) => acc + i.quantity, 0);
                            const isSelected = selectedOrders.includes(order.id);
                            return (
                              <TableRow key={order.id}
                                className={`h-12 cursor-pointer ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/20'}`}
                                onClick={() => toggleOrder(order.id)}>
                                <TableCell>
                                  <input type="checkbox" checked={isSelected} onChange={() => toggleOrder(order.id)}
                                    className="w-4 h-4 accent-primary cursor-pointer" onClick={e => e.stopPropagation()} />
                                </TableCell>
                                <TableCell className="font-mono text-[11px] font-black text-primary">{order.id}</TableCell>
                                <TableCell className="text-[11px] font-black uppercase">{order.customerName}</TableCell>
                                <TableCell className="text-[10px] text-muted-foreground">{order.customerAddress || '---'}</TableCell>
                                <TableCell className="text-center text-[11px] font-black">{totalSacos}</TableCell>
                                <TableCell className="text-center text-[11px] font-black">{order.totalWeight?.toFixed(2)}</TableCell>
                                <TableCell className="text-right text-[11px] font-black">R$ {(order.totalValue || 0).toLocaleString()}</TableCell>
                                <TableCell className="text-center text-[9px] font-bold text-muted-foreground">
                                  {order.deliveryDate ? format(new Date(order.deliveryDate), 'dd/MM/yy') : '---'}
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
                <CityGroup key={`fat-${city}`} city={city} cityOrders={cityOrders}
                  colorClass="bg-indigo-50 border-indigo-100 text-indigo-700"
                  badgeClass="border-indigo-200 text-indigo-700"
                  expandKey={`fat-${city}`} />
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
                <CityGroup key={`fat2-${city}`} city={city} cityOrders={cityOrders}
                  colorClass="bg-green-50 border-green-100 text-green-700"
                  badgeClass="border-green-200 text-green-700"
                  onIniciar={() => handleIniciarEntrega(cityOrders.map(o => o.id))}
                  expandKey={`fat2-${city}`} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ABA EM ROTA */}
        <TabsContent value="rota" className="mt-6 space-y-4">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight">Pedidos em Trânsito</h2>
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Confirme a entrega ao receber comprovante</p>
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
                    <TableHead className="text-[9px] font-black uppercase text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emRotaOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-16 text-muted-foreground italic text-xs uppercase opacity-40">
                        Nenhuma entrega em trânsito.
                      </TableCell>
                    </TableRow>
                  )}
                  {emRotaOrders.map(order => {
                    const vehicle = vehicles.find(v => v.id === order.assignedVehicleId);
                    const driver = drivers.find(d => d.id === order.assignedDriverId);
                    const totalSacos = order.items.reduce((acc, i) => acc + i.quantity, 0);
                    return (
                      <TableRow key={order.id} className="h-12 hover:bg-muted/20">
                        <TableCell className="font-mono text-[11px] font-black text-primary">{order.id}</TableCell>
                        <TableCell className="text-[11px] font-black uppercase">{order.customerName}</TableCell>
                        <TableCell className="text-[10px] font-bold text-muted-foreground uppercase">{order.city}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black">{vehicle?.model || '---'} {vehicle?.plate ? `(${vehicle.plate})` : ''}</span>
                            <span className="text-[9px] text-muted-foreground font-bold">{driver?.name || '---'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-[11px] font-black">{totalSacos}</TableCell>
                        <TableCell className="text-center text-[11px] font-black">{order.totalWeight?.toFixed(2)} kg</TableCell>
                        <TableCell className="text-center text-[9px] font-bold text-muted-foreground">
                          {(order as any).departureTime ? format(new Date((order as any).departureTime), 'dd/MM HH:mm') : '---'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline"
                            className="h-8 gap-1.5 font-black text-[9px] uppercase border-2 text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => {
                              confirmDelivery(order.id);
                              toast({ title: "Entrega Confirmada", description: `Pedido ${order.id} finalizado.` });
                            }}>
                            <CheckSquare className="w-3.5 h-3.5" /> Confirmar Entrega
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

        {/* ABA HISTÓRICO */}
        <TabsContent value="historico" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">Histórico de Entregas</h2>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Pedidos em entrega e entregues</p>
            </div>
            <span className="text-[9px] font-bold text-muted-foreground uppercase">{historicoFiltered.length} pedidos</span>
          </div>
          <div className="bg-white border rounded-xl p-4 space-y-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Filtros</p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
              <div className="relative lg:col-span-2">
                <Input placeholder="Pedido ou cliente..." className="h-8 text-xs font-bold pl-3"
                  value={histSearch} onChange={e => setHistSearch(e.target.value)} />
              </div>
              <Select value={histStatus} onValueChange={setHistStatus}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="ENTREGA">Em Entrega</SelectItem>
                  <SelectItem value="FATURADO">Entregue</SelectItem>
                </SelectContent>
              </Select>
              <Select value={histCidade} onValueChange={setHistCidade}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Cidade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as Cidades</SelectItem>
                  {cidadesDisponiveis.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase text-muted-foreground"
                onClick={() => { setHistSearch(''); setHistStatus('ALL'); setHistCidade('ALL'); setHistDe(''); setHistAte(''); }}>
                Limpar
              </Button>
            </div>
            <div className="flex gap-4">
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
                    const totalSacos = order.items.reduce((acc, i) => acc + i.quantity, 0);
                    return (
                      <TableRow key={order.id} className="h-12 hover:bg-muted/20">
                        <TableCell className="font-mono text-[11px] font-black text-primary">{order.id}</TableCell>
                        <TableCell className="text-[11px] font-black uppercase">{order.customerName}</TableCell>
                        <TableCell className="text-[10px] font-bold text-muted-foreground uppercase">{order.city}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black">{vehicle?.model || '---'}</span>
                            <span className="text-[9px] text-muted-foreground font-bold">{driver?.name || '---'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-[11px] font-black">{totalSacos}</TableCell>
                        <TableCell className="text-center text-[9px] font-bold text-muted-foreground">
                          {(order as any).departureTime ? format(new Date((order as any).departureTime), 'dd/MM HH:mm') : '---'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`${statusColors[order.status] || ''} text-[8px] font-black uppercase px-2 h-5`}>
                            {statusLabels[order.status] || order.status}
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

      {/* MODAL ACEITAR PEDIDOS */}
      <Dialog open={isAceitarOpen} onOpenChange={setIsAceitarOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-black uppercase">Aceitar Pedidos para Entrega</DialogTitle>
            <DialogDescription className="text-[10px] uppercase font-bold">
              {aceitarOrderIds.length} pedido(s) · Defina veículo, motorista e data de entrega
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted/30 rounded-lg p-3 space-y-1">
              {orders.filter(o => aceitarOrderIds.includes(o.id)).map(o => (
                <div key={o.id} className="flex justify-between text-[10px] font-bold">
                  <span>{o.id} — {o.customerName} — {o.city}</span>
                  <span className="text-muted-foreground">{o.items.reduce((s, i) => s + i.quantity, 0)} un · {o.totalWeight?.toFixed(2)} kg</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground">Data Programada de Entrega *</label>
              <Input type="date" className="h-9 text-xs"
                value={aceitarData.scheduledDeliveryDate}
                onChange={e => setAceitarData({ ...aceitarData, scheduledDeliveryDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground">Veículo *</label>
              <Select onValueChange={(val) => setAceitarData({ ...aceitarData, vehicleId: val })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione um veículo" /></SelectTrigger>
                <SelectContent>
                  {vehicles.filter(v => v.status === 'DISPONIVEL').map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.model} ({v.plate}) — {v.capacityKg}kg</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground">Motorista *</label>
              <Select onValueChange={(val) => setAceitarData({ ...aceitarData, driverId: val })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione um motorista" /></SelectTrigger>
                <SelectContent>
                  {drivers.filter(d => d.status === 'DISPONIVEL').map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div> */}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAceitarOpen(false)} className="font-bold text-xs uppercase">Cancelar</Button>
            <Button onClick={handleAceitarCarga} className="font-black text-xs uppercase gap-2">
              <Truck className="w-3.5 h-3.5" /> Confirmar Aceite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL ROMANEIO */}
      <Dialog open={isRomaneioOpen} onOpenChange={setIsRomaneioOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">Romaneio de Carga - Documento de Entrega</DialogTitle>
          <div className="bg-white flex flex-col max-h-[90vh]">
            <div className="bg-primary px-6 py-4 flex items-center justify-between shrink-0">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Documento de Entrega</p>
                <h2 className="text-lg font-black uppercase text-white">Romaneio de Carga</h2>
              </div>
              <Button size="sm" variant="ghost" className="h-8 gap-1.5 font-black text-[9px] uppercase text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => window.print()}>
                <Printer className="w-3.5 h-3.5" /> Imprimir
              </Button>
            </div>
            <div ref={romaneioRef} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex justify-between text-[10px] font-bold text-muted-foreground border-b pb-3">
                <span>Data: {format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
                <span>Total de pedidos: {romaneioData.length}</span>
                <span>Total sacos: {romaneioData.reduce((acc, o) => acc + o.items.reduce((s, i) => s + i.quantity, 0), 0)} un</span>
                <span>Peso total: {romaneioData.reduce((acc, o) => acc + (o.totalWeight || 0), 0).toFixed(2)} KG</span>
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
                        <th className="text-center text-[9px] font-black uppercase text-muted-foreground pb-1 w-20">Qtd (sacos)</th>
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
                            <td className="py-1.5 text-right font-black text-[11px]">{((prod?.weight || 0) * item.quantity).toFixed(2)} kg</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-zinc-300">
                        <td className="pt-2 text-[9px] font-black uppercase text-muted-foreground">Total</td>
                        <td className="pt-2 text-center font-black text-[11px]">{order.items.reduce((acc, i) => acc + i.quantity, 0)}</td>
                        <td className="pt-2 text-right font-black text-[11px]">{order.totalWeight?.toFixed(2)} kg</td>
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