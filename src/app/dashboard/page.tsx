"use client";

import { useSystemData } from '@/server/store';
import { useAuth } from '@/hooks/use-auth';
import { ProtectedRoute } from '@/frontend/protected-route';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, LineChart, Line, PieChart, Pie
} from 'recharts';
import {
  TrendingUp, ShoppingCart, AlertCircle, Clock, FileCheck, ArrowRight,
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
  const { orders, products, vehicles, drivers, isReady, hasError, error } = useSystemData();
  // const { user, signOut } = useAuth();

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
  const valorEstoque = products.reduce((acc, p) => acc + (p.stock * p.avgCost), 0);
  const totalSacosExpedicao = orders.filter(o => o.status === 'PRONTO_LOGISTICA').reduce((acc, o) => acc + o.items.reduce((s, i) => s + i.quantity, 0), 0);
  const totalPesoExpedicao = orders.filter(o => o.status === 'PRONTO_LOGISTICA').reduce((acc, o) => acc + (o.totalWeight || 0), 0);

  // Funil
  const funnelData = STATUS_FLOW.map(s => ({
    ...s,
    count: orders.filter(o => o.status === s.key).length,
    value: orders.filter(o => o.status === s.key).reduce((acc, o) => acc + o.totalValue, 0),
  }));

  // Estoque crítico
  const criticalStock = products.filter(p => p.stock <= p.minStock && !p.isRawMaterial).slice(0, 5);

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

  // Gráfico estoque
  const stockChart = products.filter(p => !p.isRawMaterial).map(p => ({
    name: p.name.split(' ')[0],
    stock: p.stock,
    min: p.minStock,
  })).slice(0, 8);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-primary uppercase tracking-tight">Dashboard</h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Sistema operacional
        </div>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Vendas Faturadas', value: `R$ ${totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, sub: `${orders.filter(o => o.status === 'FATURADO').length} pedidos`, color: 'border-green-400', icon: TrendingUp, iconColor: 'text-green-600' },
          { label: 'Pipeline Comercial', value: `R$ ${totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, sub: `${orders.filter(o => o.status === 'PENDENTE').length} aguardando`, color: 'border-yellow-400', icon: ShoppingCart, iconColor: 'text-yellow-600' },
          { label: 'Em Trânsito', value: `R$ ${totalEmRota.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, sub: `${orders.filter(o => o.status === 'ENTREGA').length} entregas ativas`, color: 'border-purple-400', icon: Truck, iconColor: 'text-purple-600' },
          { label: 'Valor do Estoque', value: `R$ ${valorEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, sub: `${products.filter(p => p.stock <= p.minStock).length} em ruptura`, color: 'border-blue-400', icon: Wallet, iconColor: 'text-blue-600' },
        ].map((kpi, i) => (
          <Card key={i} className={`border-none shadow-sm bg-white border-l-4 ${kpi.color} overflow-hidden`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">{kpi.label}</p>
                  <p className="text-xl font-black">{kpi.value}</p>
                  <p className="text-[9px] font-bold text-muted-foreground mt-0.5">{kpi.sub}</p>
                </div>
                <kpi.icon className={`w-5 h-5 ${kpi.iconColor} mt-1`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Funil de status */}
      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-4">
          <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-4">Funil de Pedidos — Visão Geral do Fluxo</p>
          <div className="grid grid-cols-6 gap-2">
            {funnelData.map((stage, idx) => {
              const Icon = stage.icon;
              const isAlert = stage.count > 0 && (stage.key === 'PENDENTE' || stage.key === 'AGUARDANDO_FATURAMENTO');
              return (
                <div key={stage.key} className="flex flex-col items-center gap-2 relative">
                  {idx < funnelData.length - 1 && (
                    <div className="absolute right-0 top-5 w-2 h-px bg-zinc-200 translate-x-1 z-10" />
                  )}
                  <div className={`w-full rounded-xl p-3 text-center ${stage.count > 0 ? stage.color.replace('bg-', 'bg-') + '/10 border border-' + stage.color.replace('bg-', '') + '/30' : 'bg-zinc-50 border border-zinc-100'}`}>
                    <Icon className={`w-4 h-4 mx-auto mb-1 ${stage.count > 0 ? stage.textColor : 'text-zinc-300'}`} />
                    <p className={`text-2xl font-black ${stage.count > 0 ? stage.textColor : 'text-zinc-300'}`}>{stage.count}</p>
                    {isAlert && stage.count > 0 && <div className="w-1.5 h-1.5 rounded-full bg-red-500 mx-auto mt-1 animate-pulse" />}
                  </div>
                  <p className={`text-[8px] font-black uppercase text-center leading-tight ${stage.count > 0 ? stage.textColor : 'text-zinc-400'}`}>{stage.label}</p>
                  {stage.value > 0 && (
                    <p className="text-[8px] font-bold text-muted-foreground">R$ {(stage.value / 1000).toFixed(0)}k</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Linha 3: Gráfico + Cidades + Estoque crítico */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Gráfico estoque */}
        <Card className="border-none shadow-sm bg-white lg:col-span-1">
          <CardContent className="p-4">
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-4">Estoque por Produto</p>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stockChart} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" fontSize={8} axisLine={false} tickLine={false} />
                  <YAxis fontSize={8} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ fontSize: 10 }} />
                  <Bar dataKey="stock" radius={[4, 4, 0, 0]}>
                    {stockChart.map((entry, i) => (
                      <Cell key={i} fill={entry.stock <= entry.min ? '#ef4444' : '#156135'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {criticalStock.length > 0 && (
              <div className="mt-3 pt-3 border-t space-y-1.5">
                <p className="text-[8px] font-black uppercase text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Ruptura de Estoque
                </p>
                {criticalStock.map(p => (
                  <div key={p.id} className="flex justify-between text-[9px]">
                    <span className="font-bold truncate max-w-[120px]">{p.name}</span>
                    <span className="font-black text-red-600">{p.stock}/{p.minStock}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top cidades */}
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Top Cidades — Pedidos Ativos</p>
              <MapPin className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="space-y-3">
              {topCidades.map(([city, data], idx) => (
                <div key={city} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-muted-foreground w-4">{idx + 1}</span>
                      <span className="text-[11px] font-black uppercase">{city}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-primary">R$ {data.value.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-6">
                    <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full"
                        style={{ width: `${(data.value / topCidades[0][1].value) * 100}%` }} />
                    </div>
                    <span className="text-[8px] font-bold text-muted-foreground whitespace-nowrap">{data.count} ped · {data.peso.toFixed(0)}kg</span>
                  </div>
                </div>
              ))}
              {topCidades.length === 0 && (
                <p className="text-center py-8 text-[10px] text-muted-foreground opacity-40 uppercase font-bold">Sem pedidos ativos</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expedição */}
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4 space-y-4">
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Expedição & Logística</p>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Sacos p/ Expedir', value: `${totalSacosExpedicao} un`, color: 'bg-blue-50 text-blue-700' },
                { label: 'Peso p/ Expedir', value: `${totalPesoExpedicao.toFixed(0)} kg`, color: 'bg-blue-50 text-blue-700' },
                { label: 'Veíc. Disponíveis', value: `${vehicles.filter(v => v.status === 'DISPONIVEL').length}`, color: 'bg-green-50 text-green-700' },
                { label: 'Motoristas Livres', value: `${drivers.filter(d => d.status === 'DISPONIVEL').length}`, color: 'bg-green-50 text-green-700' },
              ].map((item, i) => (
                <div key={i} className={`rounded-lg p-3 ${item.color}`}>
                  <p className="text-[8px] font-black uppercase opacity-60">{item.label}</p>
                  <p className="text-lg font-black">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 pt-1">
              <p className="text-[8px] font-black uppercase text-muted-foreground">Pedidos liberados p/ entrega</p>
              {orders.filter(o => o.status === 'FATURADO').slice(0, 3).map(o => (
                <div key={o.id} className="flex items-center justify-between bg-teal-50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-[10px] font-black text-teal-700">{o.id}</p>
                    <p className="text-[8px] font-bold text-teal-600 uppercase">{o.customerName} · {o.city}</p>
                  </div>
                  <span className="text-[9px] font-black text-teal-700">{o.items.reduce((s, i) => s + i.quantity, 0)} un</span>
                </div>
              ))}
              {orders.filter(o => o.status === 'FATURADO').length === 0 && (
                <p className="text-[9px] text-muted-foreground italic text-center py-3 opacity-40">Nenhum pedido liberado</p>
              )}
            </div>

            <Button variant="outline" size="sm" className="w-full font-black uppercase text-[9px] gap-2" asChild>
              <Link href="/dashboard/logistica">Ver Logística <ChevronRight className="w-3.5 h-3.5" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Linha 4: Produção + Pedidos recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Produção */}
        <Card className="border-none shadow-sm bg-primary text-primary-foreground lg:col-span-2">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-black uppercase opacity-70 tracking-widest">Fábrica — PCP</p>
              <Factory className="w-4 h-4 opacity-70" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Na Fila', value: orders.filter(o => o.productionStage === 'FILA' && o.status === 'PRODUCAO').length },
                { label: 'Em Processo', value: orders.filter(o => o.productionStage === 'PROCESSO' && o.status === 'PRODUCAO').length },
                { label: 'Qualidade', value: orders.filter(o => o.productionStage === 'QUALIDADE' && o.status === 'PRODUCAO').length },
                { label: 'Total OPs', value: orders.filter(o => o.status === 'PRODUCAO').length },
              ].map((item, i) => (
                <div key={i} className="bg-white/10 rounded-xl p-3 border border-white/20">
                  <p className="text-[8px] font-black uppercase opacity-60">{item.label}</p>
                  <p className="text-2xl font-black">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              {orders.filter(o => o.status === 'PRODUCAO').slice(0, 3).map(o => (
                <div key={o.id} className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2">
                  <span className="text-[10px] font-black font-mono">OP-{o.id.split('-')[1]}</span>
                  <span className="text-[9px] font-bold opacity-70 uppercase truncate max-w-[100px]">{o.customerName}</span>
                  <Badge className="bg-white/20 text-white border-none text-[7px] font-black uppercase">
                    {o.productionStage || 'FILA'}
                  </Badge>
                </div>
              ))}
            </div>
            <Button variant="secondary" size="sm" className="w-full font-black uppercase text-[9px] gap-2" asChild>
              <Link href="/dashboard/producao">Gerenciar Produção <ChevronRight className="w-3.5 h-3.5" /></Link>
            </Button>
          </CardContent>
        </Card>

        {/* Pedidos recentes */}
        <Card className="border-none shadow-sm bg-white lg:col-span-3">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Pedidos Recentes</p>
              <Button variant="ghost" size="sm" className="h-7 gap-1 font-black text-[9px] uppercase text-primary" asChild>
                <Link href="/dashboard/pedidos">Ver todos <ChevronRight className="w-3 h-3" /></Link>
              </Button>
            </div>
            <div className="space-y-2">
              {recentOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors border border-transparent hover:border-muted">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                      {order.customerName[0]}
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase">{order.customerName}</p>
                      <p className="text-[8px] font-bold text-muted-foreground">{order.id} · {order.city} · {format(new Date(order.createdAt), 'dd/MM/yy')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black">R$ {(order.totalValue || 0).toLocaleString()}</span>
                    <Badge variant="outline" className={`${statusColors[order.status] || ''} text-[7px] font-black uppercase px-1.5 h-4`}>
                      {statusLabels[order.status] || order.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Alertas */}
            {(orders.filter(o => o.status === 'PENDENTE').length > 0 || orders.filter(o => o.status === 'AGUARDANDO_FATURAMENTO').length > 0) && (
              <div className="mt-4 pt-3 border-t grid grid-cols-2 gap-2">
                {orders.filter(o => o.status === 'PENDENTE').length > 0 && (
                  <Link href="/dashboard/pedidos" className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 hover:bg-yellow-100 transition-colors">
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-600 shrink-0" />
                    <div>
                      <p className="text-[8px] font-black uppercase text-yellow-700">Aprovação Pendente</p>
                      <p className="text-[10px] font-black text-yellow-800">{orders.filter(o => o.status === 'PENDENTE').length} pedidos</p>
                    </div>
                  </Link>
                )}
                {orders.filter(o => o.status === 'AGUARDANDO_FATURAMENTO').length > 0 && (
                  <Link href="/dashboard/faturamento" className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 hover:bg-indigo-100 transition-colors">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <div>
                      <p className="text-[8px] font-black uppercase text-indigo-700">Faturamento</p>
                      <p className="text-[10px] font-black text-indigo-800">{orders.filter(o => o.status === 'AGUARDANDO_FATURAMENTO').length} pedidos</p>
                    </div>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardOverview() {
  const { user, signOut } = useAuth();

  // Definir módulos disponíveis por role
  const getAvailableModules = (role: string) => {
    const modules = {
      ADMIN: ['pedidos', 'producao', 'estoque', 'faturamento', 'logistica', 'vendas', 'usuarios'],
      COMERCIAL: ['pedidos', 'estoque'],
      PRODUCAO: ['producao', 'estoque'],
      LOGISTICA: ['logistica', 'estoque'],
    };
    return modules[role as keyof typeof modules] || [];
  };

  const availableModules = user ? getAvailableModules(user.role) : [];

  return (
    <ProtectedRoute requireAuth={true}>
      <div className="min-h-screen bg-gray-50">
        {/* Header com logout */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-black text-primary uppercase">NovoCiclo</h1>
              {user && (
                <Badge variant="outline" className="text-xs">
                  {user.role}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <span className="text-sm text-muted-foreground">
                  Olá, {user.name}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <nav className="flex gap-6">
            <Link href="/dashboard" className="text-sm font-medium text-primary border-b-2 border-primary pb-2">
              Dashboard
            </Link>
            {availableModules.includes('pedidos') && (
              <Link href="/dashboard/pedidos" className="text-sm font-medium text-muted-foreground hover:text-foreground pb-2">
                Pedidos
              </Link>
            )}
            {availableModules.includes('producao') && (
              <Link href="/dashboard/producao" className="text-sm font-medium text-muted-foreground hover:text-foreground pb-2">
                Produção
              </Link>
            )}
            {availableModules.includes('estoque') && (
              <Link href="/dashboard/estoque" className="text-sm font-medium text-muted-foreground hover:text-foreground pb-2">
                Estoque
              </Link>
            )}
            {availableModules.includes('faturamento') && (
              <Link href="/dashboard/faturamento" className="text-sm font-medium text-muted-foreground hover:text-foreground pb-2">
                Faturamento
              </Link>
            )}
            {availableModules.includes('logistica') && (
              <Link href="/dashboard/logistica" className="text-sm font-medium text-muted-foreground hover:text-foreground pb-2">
                Logística
              </Link>
            )}
            {availableModules.includes('vendas') && (
              <Link href="/dashboard/vendas" className="text-sm font-medium text-muted-foreground hover:text-foreground pb-2">
                Vendas
              </Link>
            )}
            {availableModules.includes('usuarios') && (
              <Link href="/dashboard/usuarios" className="text-sm font-medium text-muted-foreground hover:text-foreground pb-2">
                Usuários
              </Link>
            )}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          <DashboardContent />
        </div>
      </div>
    </ProtectedRoute>
  );
}