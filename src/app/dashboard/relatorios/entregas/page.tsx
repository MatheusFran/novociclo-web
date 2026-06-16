'use client';

import { useSystemData } from '@/server/store';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Download, CheckCircle2, Clock, AlertCircle, Truck } from 'lucide-react';
import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

const STATUS_COLORS: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  'ENTREGUE': { label: 'Entregue', color: 'text-green-600', bgColor: 'bg-green-50', icon: CheckCircle2 },
  'ENTREGA': { label: 'Em Entrega', color: 'text-blue-600', bgColor: 'bg-blue-50', icon: Truck },
  'PRONTO_LOGISTICA': { label: 'Pronto', color: 'text-orange-600', bgColor: 'bg-orange-50', icon: AlertCircle },
  'PRODUCAO': { label: 'Em Produção', color: 'text-yellow-600', bgColor: 'bg-yellow-50', icon: Clock },
  'PENDENTE': { label: 'Pendente', color: 'text-gray-600', bgColor: 'bg-gray-50', icon: Clock },
};

export default function EntregasPage() {
  const { orders, isReady } = useSystemData();
  const [statusFilter, setStatusFilter] = useState('TODOS');

  const deliveriesData = useMemo(() => {
    const logisticaOrders = orders.filter(o => 
      ['PRONTO_LOGISTICA', 'ENTREGA', 'ENTREGUE'].includes(o.status)
    );

    if (statusFilter !== 'TODOS') {
      return logisticaOrders.filter(o => o.status === statusFilter);
    }
    return logisticaOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, statusFilter]);

  // Estatísticas
  const stats = useMemo(() => {
    const entregues = orders.filter(o => o.status === 'ENTREGUE').length;
    const emEntrega = orders.filter(o => o.status === 'ENTREGA').length;
    const prontos = orders.filter(o => o.status === 'PRONTO_LOGISTICA').length;
    const totalPendentes = emEntrega + prontos;

    const totalEntregueValue = orders
      .filter(o => o.status === 'ENTREGUE')
      .reduce((acc, o) => acc + (o.totalValue || 0), 0);

    const totalEmEntregaValue = orders
      .filter(o => o.status === 'ENTREGA')
      .reduce((acc, o) => acc + (o.totalValue || 0), 0);

    return {
      entregues,
      emEntrega,
      prontos,
      totalPendentes,
      totalEntregueValue,
      totalEmEntregaValue,
    };
  }, [orders]);

  const handleExport = () => {
    const exportData = deliveriesData.map(o => ({
      'ID': o.id,
      'Data': format(parseISO(o.createdAt), 'dd/MM/yyyy'),
      'Cliente': o.customerName,
      'Cidade': o.city || '---',
      'Motorista': o.assignedDriverId || '---',
      'Veículo': o.assignedVehicleId || '---',
      'Status': o.status,
      'Saída': o.departureTime ? format(parseISO(o.departureTime), 'dd/MM/yyyy HH:mm') : '---',
      'Entrega': o.deliveredAt ? format(parseISO(o.deliveredAt), 'dd/MM/yyyy HH:mm') : '---',
      'Valor': o.totalValue,
      'Peso': o.totalWeight,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Entregas');
    XLSX.writeFile(wb, `Relatorio_Entregas_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
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
            Relatório de Entregas
          </h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
            Acompanhamento de entregas e logística
          </p>
        </div>
        <Button onClick={handleExport} className="gap-2 font-black uppercase text-[10px]">
          <Download className="w-4 h-4" /> Exportar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Entregues</p>
            <p className="text-2xl font-black text-green-600">{stats.entregues}</p>
            <p className="text-[9px] mt-1">R$ {stats.totalEntregueValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Em Entrega</p>
            <p className="text-2xl font-black text-blue-600">{stats.emEntrega}</p>
            <p className="text-[9px] mt-1">R$ {stats.totalEmEntregaValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Prontos p/ Entrega</p>
            <p className="text-2xl font-black text-orange-600">{stats.prontos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Pendentes</p>
            <p className="text-2xl font-black text-yellow-600">{stats.totalPendentes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Taxa Entrega</p>
            <p className="text-2xl font-black text-primary">
              {orders.length > 0 ? Math.round((stats.entregues / orders.length) * 100) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtro */}
      <div className="flex gap-2 flex-wrap">
        {['TODOS', 'ENTREGUE', 'ENTREGA', 'PRONTO_LOGISTICA'].map(status => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status)}
            className="uppercase text-[10px] font-bold"
          >
            {status === 'TODOS' ? 'Todos' : STATUS_COLORS[status]?.label || status}
          </Button>
        ))}
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-black">Listagem de Entregas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-[9px] font-black uppercase">ID</TableHead>
                  <TableHead className="text-[9px] font-black uppercase">Data</TableHead>
                  <TableHead className="text-[9px] font-black uppercase">Cliente</TableHead>
                  <TableHead className="text-[9px] font-black uppercase">Cidade</TableHead>
                  <TableHead className="text-[9px] font-black uppercase">Status</TableHead>
                  <TableHead className="text-[9px] font-black uppercase">Motorista</TableHead>
                  <TableHead className="text-[9px] font-black uppercase">Veículo</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-right">Valor</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-right">Kg</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveriesData.map(order => {
                  const statusInfo = STATUS_COLORS[order.status] || { label: 'Desconhecido', color: 'text-gray-600', bgColor: 'bg-gray-50' };
                  const Icon = statusInfo.icon;
                  return (
                    <TableRow key={order.id} className="hover:bg-muted/5">
                      <TableCell className="text-[9px] font-mono font-bold text-primary">{order.id}</TableCell>
                      <TableCell className="text-[9px]">{format(parseISO(order.createdAt), 'dd/MM/yy')}</TableCell>
                      <TableCell className="text-[9px] font-bold">{order.customerName}</TableCell>
                      <TableCell className="text-[9px]">{order.city || '---'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${statusInfo.bgColor} text-[8px] font-black`}>
                          <Icon className="w-2.5 h-2.5 mr-1" />
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[9px]">{order.assignedDriverId || '---'}</TableCell>
                      <TableCell className="text-[9px]">{order.assignedVehicleId || '---'}</TableCell>
                      <TableCell className="text-[9px] font-black text-right">R$ {(order.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-[9px] font-black text-right">{(order.totalWeight || 0).toFixed(2)} kg</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {deliveriesData.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma entrega encontrada</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
