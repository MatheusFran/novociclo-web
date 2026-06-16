'use client';

import { useSystemData } from '@/server/store';
import { format, startOfMonth, endOfMonth, parseISO, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, Download, TrendingUp } from 'lucide-react';
import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

export default function RelatorioComercialPage() {
  const { orders, products, members, isReady } = useSystemData();
  const [period, setPeriod] = useState('mes'); // 'mes', 'trimestre', 'ano'
  const [statusFilter, setStatusFilter] = useState('TODOS');

  const now = new Date();
  const [dateRange, setDateRange] = useState({
    start: period === 'mes' ? startOfMonth(now) : period === 'trimestre' ? new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1) : startOfYear(now),
    end: period === 'mes' ? endOfMonth(now) : period === 'trimestre' ? endOfMonth(new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 2, 1)) : endOfYear(now),
  });

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const orderDate = parseISO(o.createdAt);
      const inRange = orderDate >= dateRange.start && orderDate <= dateRange.end;
      const statusMatch = statusFilter === 'TODOS' || o.status === statusFilter;
      return inRange && statusMatch && o.status !== 'CANCELADO' && o.status !== 'REJEITADO';
    });
  }, [orders, dateRange, statusFilter]);

  // Cálculos básicos
  const totalFaturamento = filteredOrders.reduce((acc, o) => acc + (o.totalValue || 0), 0);
  const totalPedidos = filteredOrders.length;
  const ticketMedio = totalPedidos > 0 ? totalFaturamento / totalPedidos : 0;
  const totalQuantidade = filteredOrders.reduce((acc, o) => acc + (o.items || []).reduce((s, i) => s + i.quantity, 0), 0);

  // Por vendedor
  const vendedoresStat = useMemo(() => {
    const map = new Map<string, { vendedor: string; pedidos: number; faturamento: number }>();
    filteredOrders.forEach(o => {
      const seller = o.seller || 'Sem Vendedor';
      const current = map.get(seller) || { vendedor: seller, pedidos: 0, faturamento: 0 };
      current.pedidos += 1;
      current.faturamento += o.totalValue || 0;
      map.set(seller, current);
    });
    return Array.from(map.values()).sort((a, b) => b.faturamento - a.faturamento);
  }, [filteredOrders]);

  // Por status
  const statusStat = useMemo(() => {
    const map = new Map<string, { status: string; pedidos: number; faturamento: number }>();
    filteredOrders.forEach(o => {
      const current = map.get(o.status) || { status: o.status, pedidos: 0, faturamento: 0 };
      current.pedidos += 1;
      current.faturamento += o.totalValue || 0;
      map.set(o.status, current);
    });
    return Array.from(map.values());
  }, [filteredOrders]);

  // Por cidade
  const cidadeStat = useMemo(() => {
    const map = new Map<string, { cidade: string; pedidos: number; faturamento: number }>();
    filteredOrders.forEach(o => {
      const city = o.city || 'Sem Cidade';
      const current = map.get(city) || { cidade: city, pedidos: 0, faturamento: 0 };
      current.pedidos += 1;
      current.faturamento += o.totalValue || 0;
      map.set(city, current);
    });
    return Array.from(map.values()).sort((a, b) => b.faturamento - a.faturamento);
  }, [filteredOrders]);

  // Linha do tempo diária
  const dailyData = useMemo(() => {
    const map = new Map<string, { data: string; faturamento: number; pedidos: number }>();
    filteredOrders.forEach(o => {
      const date = format(parseISO(o.createdAt), 'dd/MM');
      const current = map.get(date) || { data: date, faturamento: 0, pedidos: 0 };
      current.faturamento += o.totalValue || 0;
      current.pedidos += 1;
      map.set(date, current);
    });
    return Array.from(map.values()).sort((a, b) => a.data.localeCompare(b.data));
  }, [filteredOrders]);

  const handleExport = () => {
    const exportData = filteredOrders.map(o => ({
      'ID': o.id,
      'Data': format(parseISO(o.createdAt), 'dd/MM/yyyy'),
      'Cliente': o.customerName,
      'Cidade': o.city || '---',
      'Vendedor': o.seller || '---',
      'Quantidade': (o.items || []).reduce((s, i) => s + i.quantity, 0),
      'Valor Total': o.totalValue,
      'Status': o.status,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comercial');
    XLSX.writeFile(wb, `Relatorio_Comercial_${format(now, 'dd-MM-yyyy')}.xlsx`);
  };

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-2 sm:px-0">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-primary uppercase tracking-tight">
            Relatório Comercial
          </h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
            Análise de vendas e faturamento
          </p>
        </div>
        <Button onClick={handleExport} className="gap-2 font-black uppercase text-[10px]">
          <Download className="w-4 h-4" /> Exportar
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-2">
          {['mes', 'trimestre', 'ano'].map(p => (
            <Button
              key={p}
              variant={period === p ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(p as any)}
              className="uppercase text-[10px] font-bold"
            >
              {p === 'mes' ? 'Este Mês' : p === 'trimestre' ? 'Este Trimestre' : 'Este Ano'}
            </Button>
          ))}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos os Status</SelectItem>
            <SelectItem value="ENTREGUE">Entregue</SelectItem>
            <SelectItem value="FATURADO">Faturado</SelectItem>
            <SelectItem value="PRODUCAO">Produção</SelectItem>
            <SelectItem value="PENDENTE">Pendente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Faturamento Total</p>
            <p className="text-2xl font-black text-primary">R$ {totalFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Pedidos</p>
            <p className="text-2xl font-black text-primary">{totalPedidos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Ticket Médio</p>
            <p className="text-2xl font-black text-primary">R$ {ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Quantidade</p>
            <p className="text-2xl font-black text-primary">{totalQuantidade} un.</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Linha - Faturamento por Dia */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-black">Faturamento Diário</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" />
                  <YAxis />
                  <Tooltip formatter={(value) => `R$ ${value.toLocaleString()}`} />
                  <Line type="monotone" dataKey="faturamento" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">Sem dados</div>
            )}
          </CardContent>
        </Card>

        {/* Pizza - Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-black">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusStat.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusStat}
                    dataKey="pedidos"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {statusStat.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">Sem dados</div>
            )}
          </CardContent>
        </Card>

        {/* Barras - Top Vendedores */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-black">Top Vendedores</CardTitle>
          </CardHeader>
          <CardContent>
            {vendedoresStat.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={vendedoresStat}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="vendedor" angle={-45} textAnchor="end" height={80} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip formatter={(value) => value.toLocaleString()} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="faturamento" fill="#3b82f6" name="Faturamento (R$)" />
                  <Bar yAxisId="right" dataKey="pedidos" fill="#10b981" name="Pedidos" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">Sem dados</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cidades */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-black">Faturamento por Cidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cidadeStat.map(city => (
                <div key={city.cidade} className="flex justify-between items-center p-2 border rounded bg-slate-50">
                  <span className="text-[10px] font-bold">{city.cidade}</span>
                  <div className="flex gap-4">
                    <span className="text-[10px]">{city.pedidos} ped.</span>
                    <span className="text-[10px] font-black">R$ {city.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-black">Detalhes por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {statusStat.map(s => (
                <div key={s.status} className="flex justify-between items-center p-2 border rounded bg-slate-50">
                  <span className="text-[10px] font-bold">{s.status}</span>
                  <div className="flex gap-4">
                    <span className="text-[10px]">{s.pedidos} ped.</span>
                    <span className="text-[10px] font-black">R$ {s.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
