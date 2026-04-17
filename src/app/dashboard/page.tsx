"use client";

import { useSystemData } from '@/server/store';
import { useAuth } from '@/hooks/use-auth';
import { ProtectedRoute } from '@/frontend/protected-route';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import {
  TrendingUp, ShoppingCart, Clock, FileCheck, ArrowRight,
  Wallet, PackageCheck, Factory, Truck, Package, CheckCircle2, CreditCard,
  MapPin, Weight, Users, ChevronRight, AlertTriangle, LogOut
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

const STATUS_FLOW = [
  { key: 'PENDENTE', label: 'Pendente', color: 'bg-yellow-400', textColor: 'text-yellow-700', icon: Clock },
  { key: 'PRODUCAO', label: 'Produção', color: 'bg-orange-400', textColor: 'text-orange-700', icon: Factory },
  { key: 'PRONTO_LOGISTICA', label: 'Expedição', color: 'bg-blue-400', textColor: 'text-blue-700', icon: Package },
  { key: 'AGUARDANDO_FATURAMENTO', label: 'Financeiro', color: 'bg-indigo-400', textColor: 'text-indigo-700', icon: CreditCard },
  { key: 'FATURADO', label: 'Lib. Entrega', color: 'bg-teal-400', textColor: 'text-teal-700', icon: CheckCircle2 },
  { key: 'ENTREGA', label: 'Em Rota', color: 'bg-purple-400', textColor: 'text-purple-700', icon: Truck },
];

function DashboardContent() {
  const { orders, vehicles, drivers, isReady, hasError, error } = useSystemData();

  if (!isReady) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white/80 p-10 text-center text-sm text-slate-500">
        Carregando dados do dashboard...
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-sm text-red-700 space-y-2">
        <p className="text-xs font-black uppercase">Falha ao carregar dados do dashboard</p>
        <p>{error ?? 'Verifique se os endpoints das APIs do dashboard estão disponíveis.'}</p>
        <p>O painel será exibido com dados vazios até que a API esteja pronta.</p>
      </div>
    );
  }

  // Métricas principais
  const totalVendas = orders.filter(o => o.status === 'FATURADO').reduce((acc, o) => acc + o.totalValue, 0);
  const totalPendente = orders.filter(o => o.status === 'PENDENTE').reduce((acc, o) => acc + o.totalValue, 0);
  const totalEmRota = orders.filter(o => o.status === 'ENTREGA').reduce((acc, o) => acc + o.totalValue, 0);
  const totalSacosExpedicao = orders.filter(o => o.status === 'PRONTO_LOGISTICA').reduce((acc, o) => acc + o.items.reduce((s, i) => s + i.quantity, 0), 0);
  const totalPesoExpedicao = orders.filter(o => o.status === 'PRONTO_LOGISTICA').reduce((acc, o) => acc + (o.totalWeight || 0), 0);

  // Funil
  const funnelData = STATUS_FLOW.map(s => ({
    ...s,
    count: orders.filter(o => o.status === s.key).length,
    value: orders.filter(o => o.status === s.key).reduce((acc, o) => acc + o.totalValue, 0),
  }));

  // Top cidades (por valor de pedidos ativos)
  const activeOrders = orders.filter(o => !['FATURADO', 'REJEITADO'].includes(o.status));
  const cidadeMap: Record<string, { count: number; value: number; peso: number }> = {};
  activeOrders.forEach(o => {
    const c = o.city || 'Sem Cidade';
    if (!cidadeMap[c]) cidadeMap[c] = { count: 0, value: 0, peso: 0 };
    cidadeMap[c].count++;
    cidadeMap[c].value += o.totalValue || 0;
    cidadeMap[c].peso += o.totalWeight || 0;
  });
  const topCidades = Object.entries(cidadeMap).sort((a, b) => b[1].value - a[1].value).slice(0, 5);

  // Pedidos recentes
  const recentOrders = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6);

  const statusColors: Record<string, string> = {
    PENDENTE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    PRODUCAO: 'bg-orange-100 text-orange-800 border-orange-200',
    PRONTO_LOGISTICA: 'bg-blue-100 text-blue-800 border-blue-200',
    AGUARDANDO_FATURAMENTO: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    FATURADO: 'bg-teal-100 text-teal-800 border-teal-200',
    ENTREGA: 'bg-purple-100 text-purple-800 border-purple-200',
    REJEITADO: 'bg-red-100 text-red-800 border-red-200',
  };
  const statusLabels: Record<string, string> = {
    PENDENTE: 'Pendente', PRODUCAO: 'Produção', PRONTO_LOGISTICA: 'Expedição',
    AGUARDANDO_FATURAMENTO: 'Financeiro', FATURADO: 'Lib. Entrega',
    ENTREGA: 'Em Rota', REJEITADO: 'Rejeitado',
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-primary uppercase tracking-tight">Dashboard</h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
            {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="default" size="sm" className="gap-2 font-black uppercase text-[9px] sm:text-[10px]">
            <Link href="/dashboard/cockpit">
              🚀 Cockpit
            </Link>
          </Button>
          <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Sistema operacional
          </div>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        <Card className="border-none shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[8px] sm:text-[9px] font-black uppercase text-muted-foreground mb-2">Faturado</p>
            <p className="text-lg sm:text-2xl font-black text-green-600">R$ {(totalVendas / 1000).toFixed(0)}k</p>
            <p className="text-[8px] text-muted-foreground mt-1">{orders.filter(o => o.status === 'FATURADO').length} ped</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[8px] sm:text-[9px] font-black uppercase text-muted-foreground mb-2">Pendente</p>
            <p className="text-lg sm:text-2xl font-black text-yellow-600">R$ {(totalPendente / 1000).toFixed(0)}k</p>
            <p className="text-[8px] text-muted-foreground mt-1">{orders.filter(o => o.status === 'PENDENTE').length} ped</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[8px] sm:text-[9px] font-black uppercase text-muted-foreground mb-2">Em Rota</p>
            <p className="text-lg sm:text-2xl font-black text-purple-600">R$ {(totalEmRota / 1000).toFixed(0)}k</p>
            <p className="text-[8px] text-muted-foreground mt-1">{orders.filter(o => o.status === 'ENTREGA').length} ped</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[8px] sm:text-[9px] font-black uppercase text-muted-foreground mb-2">Expedição</p>
            <p className="text-lg sm:text-2xl font-black text-blue-600">{totalSacosExpedicao}</p>
            <p className="text-[8px] text-muted-foreground mt-1">{(totalPesoExpedicao / 1000).toFixed(1)} ton</p>
          </CardContent>
        </Card>
      </div>

      {/* Funil de Status */}
      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-4 sm:p-6">
          <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-4">📊 Funil de Pedidos — Fluxo Completo</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {funnelData.map((stage, idx) => {
              const Icon = stage.icon;
              const isAlert = stage.count > 0 && (stage.key === 'PENDENTE' || stage.key === 'AGUARDANDO_FATURAMENTO');
              return (
                <div key={stage.key} className="flex flex-col items-center gap-2">
                  <div className={`w-full rounded-lg p-3 text-center transition-all ${stage.count > 0 ? stage.color.replace('bg-', 'bg-') + '/10 border border-' + stage.color.replace('bg-', '') + '/30' : 'bg-zinc-50 border border-zinc-100'}`}>
                    <Icon className={`w-4 h-4 mx-auto mb-1 ${stage.count > 0 ? stage.textColor : 'text-zinc-300'}`} />
                    <p className={`text-xl sm:text-2xl font-black ${stage.count > 0 ? stage.textColor : 'text-zinc-300'}`}>{stage.count}</p>
                    {isAlert && stage.count > 0 && <div className="w-1.5 h-1.5 rounded-full bg-red-500 mx-auto mt-1 animate-pulse" />}
                  </div>
                  <div className="text-center">
                    <p className={`text-[7px] sm:text-[8px] font-black uppercase leading-tight ${stage.count > 0 ? stage.textColor : 'text-zinc-400'}`}>{stage.label}</p>
                    {stage.value > 0 && <p className="text-[7px] text-muted-foreground mt-0.5">R$ {(stage.value / 1000).toFixed(0)}k</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Cidades + Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top Cidades */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">📍 Top Cidades — Pedidos Ativos</p>
              <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
            </div>
            <div className="space-y-3">
              {topCidades.map(([city, data], idx) => (
                <div key={city} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[9px] font-black text-muted-foreground w-5">{idx + 1}.</span>
                      <span className="text-[11px] font-black uppercase truncate">{city}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-[10px] font-black text-primary">R$ {(data.value / 1000).toFixed(0)}k</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full"
                        style={{ width: `${(data.value / topCidades[0][1].value) * 100}%` }} />
                    </div>
                    <span className="text-[8px] font-bold text-muted-foreground whitespace-nowrap">{data.count}p · {(data.peso / 1000).toFixed(1)}t</span>
                  </div>
                </div>
              ))}
              {topCidades.length === 0 && (
                <p className="text-center py-8 text-[10px] text-muted-foreground opacity-40 uppercase font-bold">Sem pedidos ativos</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pedidos Recentes */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">📋 Pedidos Recentes</p>
              <Button variant="ghost" size="sm" className="h-7 gap-1 font-black text-[8px] sm:text-[9px] uppercase text-primary p-1 sm:px-2" asChild>
                <Link href="/dashboard/pedidos">Ver todos <ChevronRight className="w-3 h-3" /></Link>
              </Button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {recentOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between gap-2 py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors border border-transparent hover:border-muted">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-xs flex-shrink-0">
                      {order.customerName[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-[11px] font-black uppercase truncate">{order.customerName}</p>
                      <p className="text-[8px] text-muted-foreground truncate">{order.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[9px] sm:text-[10px] font-black whitespace-nowrap">R$ {(order.totalValue || 0) > 999 ? (order.totalValue / 1000).toFixed(0) + 'k' : order.totalValue}</span>
                    <Badge variant="outline" className={`${statusColors[order.status] || ''} text-[7px] font-black uppercase px-1 h-4 flex-shrink-0`}>
                      {statusLabels[order.status]?.substring(0, 3) || order.status.substring(0, 3)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Alertas */}
      {(orders.filter(o => o.status === 'PENDENTE').length > 0 || orders.filter(o => o.status === 'AGUARDANDO_FATURAMENTO').length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {orders.filter(o => o.status === 'PENDENTE').length > 0 && (
            <Link href="/dashboard/pedidos" className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 hover:bg-yellow-100 transition-colors group">
              <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 group-hover:scale-110 transition-transform" />
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase text-yellow-700">⚠️ Aprovação Pendente</p>
                <p className="text-[11px] font-black text-yellow-800">{orders.filter(o => o.status === 'PENDENTE').length} pedidos aguardando</p>
              </div>
            </Link>
          )}
          {orders.filter(o => o.status === 'AGUARDANDO_FATURAMENTO').length > 0 && (
            <Link href="/dashboard/faturamento" className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 hover:bg-indigo-100 transition-colors group">
              <CreditCard className="w-5 h-5 text-indigo-600 shrink-0 group-hover:scale-110 transition-transform" />
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase text-indigo-700">💳 Faturamento Pendente</p>
                <p className="text-[11px] font-black text-indigo-800">{orders.filter(o => o.status === 'AGUARDANDO_FATURAMENTO').length} pedidos para faturar</p>
              </div>
            </Link>
          )}
        </div>
      )}

    </div>
  );
}

export default function DashboardOverview() {
  const { user, signOut } = useAuth();

  const getAvailableModules = (role: string) => {
    const modules = {
      ADMIN: ['pedidos', 'producao', 'faturamento', 'logistica', 'vendas', 'usuarios'],
      COMERCIAL: ['pedidos'],
      PRODUCAO: ['producao'],
      LOGISTICA: ['logistica'],
    };
    return modules[role as keyof typeof modules] || [];
  };

  const availableModules = user ? getAvailableModules(user.role) : [];

  return (
    <ProtectedRoute requireAuth={true}>
      <div className="min-h-screen bg-gray-50">


        {/* Content */}
        <div className="p-6">
          <DashboardContent />
        </div>
      </div>
    </ProtectedRoute>
  );
}