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
import { Order } from '@/lib/types';
import { ReactNode, useMemo, useState, useEffect } from 'react';
import { Filter, ChevronDown, FileDown, Search, Truck } from 'lucide-react';
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
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t text-[10px] font-black uppercase">
      <span className="text-muted-foreground">
        {total} registro{total !== 1 ? 's' : ''}
      </span>
      <div className="flex items-center gap-2">
        <Select value={String(pageSize)} onValueChange={v => { onPageSizeChange(Number(v)); onPageChange(1); }}>
          <SelectTrigger className="h-7 w-16 text-[10px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[10, 20, 50, 100].map(s => (
              <SelectItem key={s} value={String(s)}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-7 px-2 text-[10px]" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>«</Button>
        <span>{page} / {totalPages}</span>
        <Button variant="outline" size="sm" className="h-7 px-2 text-[10px]" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>»</Button>
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
  // Funcionalidades extras
  members?: { name: string }[];
  statusMap?: Record<string, StatusMapEntry>;
  showTotals?: boolean;
  showSearch?: boolean;
  showFilters?: boolean;
  showGroupByCity?: boolean;
  showExport?: boolean;
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
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sellerFilter, setSellerFilter] = useState('ALL');
  const [closingPersonFilter, setClosingPersonFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [groupByCity, setGroupByCity] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const allSellers = members.map(m => m.name).filter(Boolean);
  const allClosingPeople = members.map(m => m.name).filter(Boolean);

  // ── Filtros ─────────────────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (!o) return false;
      const orderDate = new Date(o.createdAt);
      return (
        ((o.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
          (o.id || '').toLowerCase().includes(search.toLowerCase())) &&
        (statusFilter === 'ALL' || o.status === statusFilter) &&
        (sellerFilter === 'ALL' || o.seller === sellerFilter) &&
        (closingPersonFilter === 'ALL' || (o as any).closingPerson === closingPersonFilter) &&
        (!dateRange.from || orderDate >= new Date(dateRange.from)) &&
        (!dateRange.to || orderDate <= new Date(dateRange.to))
      );
    });
  }, [orders, search, statusFilter, sellerFilter, closingPersonFilter, dateRange]);

  useEffect(() => { setPage(1); }, [search, statusFilter, sellerFilter, closingPersonFilter, dateRange, groupByCity]);

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

  // ── Totais ──────────────────────────────────────────────────────────────────
  const totalFaturamento = filteredOrders.reduce((acc, o) => acc + (o.totalValue || 0), 0);
  const totalQuantidade = filteredOrders.reduce((acc, o) => acc + (o.items || []).reduce((s, i) => s + i.quantity, 0), 0);
  const totalKg = filteredOrders.reduce((acc, o) => acc + (o.totalWeight || 0), 0);

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
      {showTotals && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Faturamento Total', value: `R$ ${totalFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
            { label: 'Quantidade Total', value: `${totalQuantidade.toLocaleString()} sc` },
            { label: 'Peso Total', value: `${totalKg.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg` },
          ].map(({ label, value }) => (
            <Card key={label} className="border shadow-sm">
              <CardContent className="p-4">
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">{label}</p>
                <p className="text-xl font-black text-primary">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Barra de ações: filtros / agrupamento / exportação */}
      {(showFilters || showGroupByCity || showExport) && (
        <div className="flex flex-wrap gap-2 justify-end">
          {showFilters && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 font-bold uppercase text-[10px]">
                  <Filter className="w-3.5 h-3.5" /> Filtros Avançados
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 sm:w-80 p-4">
                <div className="space-y-4">
                  {Object.keys(statusMap).length > 0 && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase">Status</label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">Todos os Status</SelectItem>
                          {Object.entries(statusMap).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {allSellers.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase">Vendedor</label>
                      <Select value={sellerFilter} onValueChange={setSellerFilter}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">Todos</SelectItem>
                          {allSellers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {allClosingPeople.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase">Fechamento</label>
                      <Select value={closingPersonFilter} onValueChange={setClosingPersonFilter}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">Todos</SelectItem>
                          {allClosingPeople.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase">De</label>
                      <Input type="date" className="h-8 text-xs" value={dateRange.from}
                        onChange={e => setDateRange({ ...dateRange, from: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase">Até</label>
                      <Input type="date" className="h-8 text-xs" value={dateRange.to}
                        onChange={e => setDateRange({ ...dateRange, to: e.target.value })} />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {showGroupByCity && (
            <Button variant="outline" size="sm"
              className={`gap-2 font-bold uppercase text-[10px] ${groupByCity ? 'bg-primary/10 border-primary text-primary' : ''}`}
              onClick={() => setGroupByCity(!groupByCity)}>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${groupByCity ? 'rotate-180' : ''}`} />
              Agrupar Cidade
            </Button>
          )}

          {showExport && (
            <Button variant="outline" size="sm" className="gap-2 font-bold uppercase text-[10px]" onClick={handleExport}>
              <FileDown className="w-3.5 h-3.5" /> Exportar
            </Button>
          )}
        </div>
      )}

      {/* Busca */}
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por cliente ou código..."
            className="pl-10 h-11 text-xs font-bold uppercase tracking-widest shadow-inner bg-white border-2 focus-visible:ring-primary"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Tabela */}
      <Card className="border-none shadow-md overflow-x-auto">
        <CardContent className="p-0 min-w-full">
          {Object.entries(groupedOrders).map(([groupName, groupOrders], idx) => (
            <div key={groupName} className={idx > 0 ? 'border-t-4 border-primary/10' : ''}>

              {/* Cabeçalho do grupo */}
              {groupByCity && groupName && (
                <div className="bg-primary/5 px-4 py-2 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5" /> {groupName}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[9px] bg-white">{groupOrders.length} PEDIDOS</Badge>
                    <Badge variant="outline" className="text-[9px] bg-white">
                      {groupOrders.reduce((acc, o) => acc + (o.totalValue || 0), 0)
                        .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </Badge>
                    <Badge variant="outline" className="text-[9px] bg-white">
                      {groupOrders.reduce((acc, o) => acc + (o.items || []).reduce((s, i) => s + i.quantity, 0), 0)} UN
                    </Badge>
                    <Badge variant="outline" className="text-[9px] bg-white">
                      {groupOrders.reduce((acc, o) => acc + (o.totalWeight || 0), 0).toFixed(2)} KG
                    </Badge>
                  </div>
                </div>
              )}

              {groupOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground italic text-xs uppercase opacity-40">
                  {emptyMessage}
                </div>
              ) : (
                <Table className={`min-w-full ${className}`}>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      {visibleColumns.map(col => (
                        <TableHead
                          key={col.key}
                          className={`text-[8px] sm:text-[9px] font-black uppercase ${col.hiddenOn ? hiddenClasses[col.hiddenOn] : ''} ${alignClasses[col.align || 'left']}`}
                          style={{ width: col.width }}
                        >
                          {col.header}
                        </TableHead>
                      ))}
                      {hasActions && (
                        <TableHead className="text-[8px] sm:text-[9px] font-black uppercase text-right w-20 sm:w-28">
                          Ações
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupOrders.map((order, idx) => (
                      <TableRow
                        key={order.id}
                        className={`hover:bg-muted/20 h-10 sm:h-12 ${striped && idx % 2 === 0 ? 'bg-muted/5' : ''} ${rowClassName} ${onRowClick ? 'cursor-pointer' : ''}`}
                        onClick={() => onRowClick?.(order)}
                      >
                        {visibleColumns.map(col => (
                          <TableCell
                            key={col.key}
                            className={`py-2 sm:py-3 px-3 sm:px-4 ${col.hiddenOn ? hiddenClasses[col.hiddenOn] : ''} ${alignClasses[col.align || 'left']}`}
                          >
                            {col.render(order)}
                          </TableCell>
                        ))}
                        {hasActions && (
                          <TableCell className="py-2 sm:py-3 px-2 sm:px-4 text-right">
                            <div className="flex flex-col sm:flex-row justify-end gap-1">
                              {actions.filter(action => !action.hidden?.(order)).map((action, actionIdx) => (
                                <Button
                                  key={actionIdx}
                                  variant={action.variant || 'outline'}
                                  size="sm"
                                  className={`h-7 sm:h-8 gap-1 sm:gap-1.5 font-black text-[7px] sm:text-[9px] uppercase text-nowrap ${action.className || ''}`}
                                  onClick={e => {
                                    e.stopPropagation();
                                    action.onClick(order);
                                  }}
                                >
                                  {action.icon}
                                  {/* <span className="hidden sm:inline">{action.label}</span> */}
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