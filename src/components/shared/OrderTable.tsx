'use client';

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover, PopoverContent, PopoverTrigger
} from '@/components/ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Order } from '@/lib/types';
import { ReactNode, useMemo, useState, useEffect } from 'react';
import { Filter, ChevronDown, FileDown, Search, Truck, TrendingUp, Package, Weight, CheckCircle2, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

// ─── Paginação ────────────────────────────────────────────────────────────────

function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-t border-zinc-100 bg-zinc-50/60">
      <span className="text-[11px] text-zinc-400 font-medium tracking-wide">
        {total} registro{total !== 1 ? 's' : ''}
      </span>
      <div className="flex items-center gap-2">
        <Select value={String(pageSize)} onValueChange={v => { onPageSizeChange(Number(v)); onPageChange(1); }}>
          <SelectTrigger className="h-7 w-16 text-[11px] border-zinc-200 bg-white text-zinc-600 rounded-md">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 50, 100].map(s => (
              <SelectItem key={s} value={String(s)} className="text-[11px]">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="h-7 w-7 p-0 rounded-md border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-30"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          ‹
        </Button>
        <span className="text-[11px] text-zinc-500 font-medium tabular-nums min-w-[48px] text-center">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 w-7 p-0 rounded-md border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-30"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          ›
        </Button>
      </div>
    </div>
  );
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface TableColumn {
  key: string;
  header: string;
  width?: string;
  hidden?: boolean;
  hiddenOn?: 'mobile' | 'sm' | 'md' | 'lg';
  render: (order: Order) => ReactNode;
  align?: 'left' | 'center' | 'right';
}

export interface OrderTableAction {
  label: string;
  onClick: (order: Order) => void;
  variant?: 'outline' | 'ghost' | 'default';
  icon?: ReactNode;
  className?: string;
  hidden?: (order: Order) => boolean;
}

export interface StatusMapEntry {
  label: string;
  color?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface OrderTableProps {
  orders: Order[];
  columns: TableColumn[];
  actions?: OrderTableAction[];
  emptyMessage?: string;
  className?: string;
  rowClassName?: string;
  striped?: boolean;
  onRowClick?: (order: Order) => void;
  members?: { name: string }[];
  statusMap?: Record<string, StatusMapEntry>;
  showTotals?: boolean;
  showSearch?: boolean;
  showFilters?: boolean;
  showGroupByCity?: boolean;
  showExport?: boolean;
  showAnalytics?: boolean;
  exportFileName?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const hiddenClasses: Record<string, string> = {
  mobile: 'hidden sm:table-cell',
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
};

const alignClasses: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

// ─── Componente principal ────────────────────────────────────────────────────

export function OrderTable({
  orders,
  columns,
  actions = [],
  emptyMessage = 'Nenhum pedido encontrado.',
  className = '',
  rowClassName = '',
  striped = false,
  onRowClick,
  members = [],
  statusMap = {},
  showTotals = false,
  showAnalytics = false,
  showSearch = false,
  showFilters = false,
  showGroupByCity = false,
  showExport = false,
  exportFileName = 'Relatorio_Pedidos',
}: OrderTableProps) {
  const visibleColumns = columns.filter(col => !col.hidden);
  const hasActions = actions.length > 0;

  // ── Estado ──────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState<string[]>([]);
  const [sellerFilter, setSellerFilter] = useState('ALL');
  const [closingPersonFilter, setClosingPersonFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [groupByCity, setGroupByCity] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const allSellers = members.map(m => m.name).filter(Boolean);
  const allClosingPeople = members.map(m => m.name).filter(Boolean);
  const allCities = Array.from(new Set(orders.map(o => o.city).filter((c): c is string => !!c))).sort();

  // ── Filtros ─────────────────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (!o) return false;
      const orderDate = new Date(o.createdAt);
      return (
        ((o.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
          (o.id || '').toLowerCase().includes(search.toLowerCase())) &&
        (statusFilter.length === 0 || statusFilter.includes(o.status)) &&
        (cityFilter.length === 0 || cityFilter.includes(o.city || '')) &&
        (sellerFilter === 'ALL' || o.seller === sellerFilter) &&
        (closingPersonFilter === 'ALL' || o.closedBy === closingPersonFilter) &&
        (!dateRange.from || orderDate >= new Date(dateRange.from)) &&
        (!dateRange.to || orderDate <= new Date(dateRange.to))
      );
    });
  }, [orders, search, statusFilter, cityFilter, sellerFilter, closingPersonFilter, dateRange]);

  useEffect(() => { setPage(1); }, [search, statusFilter, cityFilter, sellerFilter, closingPersonFilter, dateRange, groupByCity]);


  const totalReceita = useMemo(
    () => filteredOrders.reduce((acc, o) => acc + (o.totalValue || 0), 0),
    [filteredOrders]
  );

  const totalQuantidade = useMemo(
    () =>
      filteredOrders.reduce(
        (acc, o) =>
          acc +
          (o.items?.reduce((total, item) => total + item.quantity, 0) || 0),
        0
      ),
    [filteredOrders]
  );

  const totalPeso = useMemo(
    () => filteredOrders.reduce((acc, o) => acc + (o.totalWeight || 0), 0),
    [filteredOrders]
  );
  // ── Agrupamento + Paginação ─────────────────────────────────────────────────
  const groupedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    const paged = filteredOrders.slice(start, start + pageSize);
    if (!groupByCity) return { '': paged };
    return paged.reduce((acc, order) => {
      const city = order.city || 'Sem Cidade';
      if (!acc[city]) acc[city] = [];
      acc[city].push(order);
      return acc;
    }, {} as Record<string, Order[]>);
  }, [filteredOrders, groupByCity, page, pageSize]);

  // ── Totais por Status ───────────────────────────────────────────────────────
  const countPendentes = filteredOrders.filter(o => o.status === 'PENDENTE').length;
  const countProducao = filteredOrders.filter(o => o.status === 'PRODUCAO').length;
  const countExpedicao = filteredOrders.filter(o => o.status === 'PRONTO_LOGISTICA').length;
  const countEntregue = filteredOrders.filter(o => o.status === 'ENTREGUE').length;

  // ── Export ──────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filteredOrders.map(o => ({
      'ID': o.id,
      'Data Emissão': format(new Date(o.createdAt), 'dd/MM/yyyy'),
      'Previsão Entrega': o.deliveryDate ? format(new Date(o.deliveryDate), 'dd/MM/yyyy') : '---',
      'Cliente': o.customerName,
      'Cidade': o.city,
      'Vendedor': o.seller,
      'Valor Total': o.totalValue,
      'Status': statusMap[o.status]?.label || o.status,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
    XLSX.writeFile(wb, `${exportFileName}.xlsx`);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Cards de totais */}
      {showAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase text-muted-foreground">
                Receita Total
              </p>
              <p className="text-2xl font-black text-green-600">
                R$ {totalReceita.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase text-muted-foreground">
                Quantidade Total
              </p>
              <p className="text-2xl font-black">
                {totalQuantidade.toLocaleString('pt-BR')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase text-muted-foreground">
                Peso Total
              </p>
              <p className="text-2xl font-black text-blue-600">
                {totalPeso.toLocaleString('pt-BR', {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}{' '}
                KG
              </p>
            </CardContent>
          </Card>
        </div>
      )}
      {showTotals && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Pendentes',
              value: countPendentes,
              icon: Clock,
              accent: 'text-amber-600',
              bg: 'bg-amber-50',
              border: 'border-amber-200',
            },
            {
              label: 'Em Produção',
              value: countProducao,
              icon: Package,
              accent: 'text-orange-600',
              bg: 'bg-orange-50',
              border: 'border-orange-200',
            },
            {
              label: 'Pronto p/ Logística',
              value: countExpedicao,
              icon: Truck,
              accent: 'text-blue-600',
              bg: 'bg-blue-50',
              border: 'border-blue-200',
            },
            {
              label: 'Entregues',
              value: countEntregue,
              icon: CheckCircle2,
              accent: 'text-emerald-600',
              bg: 'bg-emerald-50',
              border: 'border-emerald-200',
            },
          ].map(({ label, value, icon: Icon, accent, bg, border }) => (
            <Card key={label} className={`border ${border} bg-white shadow-sm rounded-lg overflow-hidden relative`}>
              <div className={`absolute top-0 left-0 bottom-0 w-1 ${bg} border-r ${border}`} />
              <CardContent className="p-4 pl-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">{label}</p>
                  <p className={`text-2xl font-bold ${accent}`}>{value}</p>
                </div>
                <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${accent}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Barra de ações */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        {/* Busca à esquerda */}
        {showSearch && (
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <Input
              placeholder="Buscar por cliente ou código..."
              className="pl-9 h-9 text-[12px] bg-white border-zinc-200 rounded-lg placeholder:text-zinc-400 text-zinc-700 focus-visible:ring-1 focus-visible:ring-zinc-300 focus-visible:border-zinc-400"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        )}

        {/* Ações à direita */}
        {(showFilters || showGroupByCity || showExport) && (
          <div className="flex flex-wrap gap-2 ml-auto">
            {showFilters && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 text-[11px] font-semibold uppercase tracking-wide border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-800 rounded-lg"
                  >
                    <Filter className="w-3.5 h-3.5" /> Filtros
                    {(statusFilter.length > 0 || cityFilter.length > 0 || sellerFilter !== 'ALL' || closingPersonFilter !== 'ALL' || dateRange.from || dateRange.to) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 -ml-0.5" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 sm:w-96 p-5 max-h-[480px] overflow-y-auto rounded-xl shadow-xl border-zinc-100">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-4">Filtros Avançados</p>
                  <div className="space-y-5">
                    {/* Status */}
                    {Object.keys(statusMap).length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">Status</label>
                          {statusFilter.length > 0 && (
                            <button onClick={() => setStatusFilter([])} className="text-[10px] text-blue-500 hover:text-blue-700 font-semibold">
                              Limpar
                            </button>
                          )}
                        </div>
                        <div className="space-y-1 rounded-lg border border-zinc-100 bg-zinc-50 p-2">
                          {Object.entries(statusMap).map(([k, v]) => (
                            <label key={k} className="flex items-center gap-2.5 cursor-pointer hover:bg-white px-2 py-1.5 rounded-md transition-colors">
                              <Checkbox
                                checked={statusFilter.includes(k)}
                                onCheckedChange={(checked) => {
                                  if (checked) setStatusFilter([...statusFilter, k]);
                                  else setStatusFilter(statusFilter.filter(s => s !== k));
                                }}
                              />
                              <span className="text-[11px] font-medium text-zinc-700">{v.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cidade */}
                    {allCities.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">Cidade</label>
                          {cityFilter.length > 0 && (
                            <button onClick={() => setCityFilter([])} className="text-[10px] text-blue-500 hover:text-blue-700 font-semibold">
                              Limpar
                            </button>
                          )}
                        </div>
                        <div className="space-y-1 rounded-lg border border-zinc-100 bg-zinc-50 p-2 max-h-40 overflow-y-auto">
                          {allCities.map(city => (
                            <label key={city} className="flex items-center gap-2.5 cursor-pointer hover:bg-white px-2 py-1.5 rounded-md transition-colors">
                              <Checkbox
                                checked={cityFilter.includes(city)}
                                onCheckedChange={(checked) => {
                                  if (checked) setCityFilter([...cityFilter, city]);
                                  else setCityFilter(cityFilter.filter(c => c !== city));
                                }}
                              />
                              <span className="text-[11px] font-medium text-zinc-700">{city}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Vendedor */}
                    {allSellers.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">Vendedor</label>
                        <Select value={sellerFilter} onValueChange={setSellerFilter}>
                          <SelectTrigger className="h-8 text-[11px] border-zinc-200 rounded-lg"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL" className="text-[11px]">Todos</SelectItem>
                            {allSellers.map(s => <SelectItem key={s} value={s} className="text-[11px]">{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Fechamento */}
                    {allClosingPeople.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">Fechamento</label>
                        <Select value={closingPersonFilter} onValueChange={setClosingPersonFilter}>
                          <SelectTrigger className="h-8 text-[11px] border-zinc-200 rounded-lg"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL" className="text-[11px]">Todos</SelectItem>
                            {allClosingPeople.map(p => <SelectItem key={p} value={p} className="text-[11px]">{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Data */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">De</label>
                        <Input type="date" className="h-8 text-[11px] border-zinc-200 rounded-lg" value={dateRange.from}
                          onChange={e => setDateRange({ ...dateRange, from: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">Até</label>
                        <Input type="date" className="h-8 text-[11px] border-zinc-200 rounded-lg" value={dateRange.to}
                          onChange={e => setDateRange({ ...dateRange, to: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {showGroupByCity && (
              <Button
                variant="outline"
                size="sm"
                className={`h-9 gap-2 text-[11px] font-semibold uppercase tracking-wide rounded-lg transition-colors ${groupByCity
                  ? 'bg-zinc-900 border-zinc-900 text-white hover:bg-zinc-800'
                  : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-800'
                  }`}
                onClick={() => setGroupByCity(!groupByCity)}
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${groupByCity ? 'rotate-180' : ''}`} />
                Agrupar Cidade
              </Button>
            )}

            {showExport && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 text-[11px] font-semibold uppercase tracking-wide border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-800 rounded-lg"
                onClick={handleExport}
              >
                <FileDown className="w-3.5 h-3.5" /> Exportar
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tabela */}
      <Card className="border border-zinc-100 shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0 min-w-full overflow-x-auto">
          {Object.entries(groupedOrders).map(([groupName, groupOrders], idx) => (
            <div key={groupName} className={idx > 0 ? 'border-t-2 border-zinc-100' : ''}>

              {/* Cabeçalho do grupo */}
              {groupByCity && groupName && (
                <div className="bg-zinc-50 border-b border-zinc-100 px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-700 flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5 text-zinc-400" /> {groupName}
                  </h2>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] bg-white border-zinc-200 text-zinc-600 font-semibold px-2.5 py-0.5 rounded-full">
                      {groupOrders.length} pedidos
                    </Badge>
                    <Badge variant="outline" className="text-[10px] bg-white border-zinc-200 text-zinc-600 font-semibold px-2.5 py-0.5 rounded-full">
                      {groupOrders.reduce((acc, o) => acc + (o.totalValue || 0), 0)
                        .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] bg-white border-zinc-200 text-zinc-600 font-semibold px-2.5 py-0.5 rounded-full">
                      {groupOrders.reduce((acc, o) => acc + (o.items || []).reduce((s, i) => s + i.quantity, 0), 0)} un
                    </Badge>
                    <Badge variant="outline" className="text-[10px] bg-white border-zinc-200 text-zinc-600 font-semibold px-2.5 py-0.5 rounded-full">
                      {groupOrders.reduce((acc, o) => acc + (o.totalWeight || 0), 0).toFixed(2)} kg
                    </Badge>
                  </div>
                </div>
              )}

              {groupOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-300">
                  <Package className="w-8 h-8" />
                  <p className="text-[12px] font-medium text-zinc-400">{emptyMessage}</p>
                </div>
              ) : (
                <Table className={`min-w-full relative ${className}`}>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-b-2 border-emerald-500 hover:bg-slate-50 sticky top-0 z-10">
                      {visibleColumns.map(col => (
                        <TableHead
                          key={col.key}
                          className={`
                            text-[11px] font-semibold uppercase tracking-wider text-slate-700
                            py-3 px-4 first:pl-5 last:pr-5
                            ${col.hiddenOn ? hiddenClasses[col.hiddenOn] : ''}
                            ${alignClasses[col.align || 'left']}
                          `}
                          style={{ width: col.width }}
                        >
                          {col.header}
                        </TableHead>
                      ))}
                      {hasActions && (
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 py-3 px-4 last:pr-5 text-right w-[80px]">
                          Ações
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupOrders.map((order, idx) => (
                      <TableRow
                        key={order.id}
                        className={`
                          group border-b border-slate-100 transition-all duration-200
                          hover:bg-slate-50 hover:shadow-[inset_3px_0_0_0_#156135]
                          ${striped && idx % 2 === 0 ? 'bg-slate-50/30' : 'bg-white'}
                          ${rowClassName}
                          ${onRowClick ? 'cursor-pointer' : ''}
                        `}
                        onClick={() => onRowClick?.(order)}
                      >
                        {visibleColumns.map(col => (
                          <TableCell
                            key={col.key}
                            className={`
                              py-3 px-4 first:pl-5 last:pr-5
                              text-[12px] text-zinc-700
                              ${col.hiddenOn ? hiddenClasses[col.hiddenOn] : ''}
                              ${alignClasses[col.align || 'left']}
                            `}
                          >
                            {col.render(order)}
                          </TableCell>
                        ))}
                        {hasActions && (
                          <TableCell className="py-3 px-4 last:pr-5 text-right">
                            <div className="flex flex-col sm:flex-row justify-end gap-1">
                              {actions.filter(action => !action.hidden?.(order)).map((action, actionIdx) => (
                                <Button
                                  key={actionIdx}
                                  variant={action.variant || 'outline'}
                                  size="sm"
                                  className={`h-8 w-8 p-0 rounded-lg border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 ${action.className || ''}`}
                                  onClick={e => {
                                    e.stopPropagation();
                                    action.onClick(order);
                                  }}
                                >
                                  {action.icon}
                                </Button>
                              ))}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          ))}

          <Pagination
            total={filteredOrders.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>
    </div>
  );
}