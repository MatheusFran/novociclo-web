'use client';

import { useSystemData } from '@/server/store';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Download, Package, TrendingUp } from 'lucide-react';
import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

export default function CarregamentoPage() {
  const { orders, isReady } = useSystemData();
  const [sortBy, setSortBy] = useState('data');

  // Agrupa pedidos por grupo de carga
  const carregamentosData = useMemo(() => {
    const map = new Map<string, {
      grupoCarga: string;
      pedidos: any[];
      totalPedidos: number;
      totalValor: number;
      totalPeso: number;
      totalQuantidade: number;
      dataCarregamento?: string;
    }>();

    orders.forEach(o => {
      if (o.status === 'PRONTO_LOGISTICA' || o.status === 'ENTREGA' || o.status === 'ENTREGUE') {
        const grupo = o.grupoCarga || 'Não Agrupado';
        const current = map.get(grupo) || {
          grupoCarga: grupo,
          pedidos: [],
          totalPedidos: 0,
          totalValor: 0,
          totalPeso: 0,
          totalQuantidade: 0,
          dataCarregamento: o.dataCarregamento,
        };
        current.pedidos.push(o);
        current.totalPedidos += 1;
        current.totalValor += o.totalValue || 0;
        current.totalPeso += o.totalWeight || 0;
        current.totalQuantidade += (o.items || []).reduce((s, i) => s + i.quantity, 0);
        map.set(grupo, current);
      }
    });

    let result = Array.from(map.values());
    
    if (sortBy === 'valor') {
      result.sort((a, b) => b.totalValor - a.totalValor);
    } else if (sortBy === 'peso') {
      result.sort((a, b) => b.totalPeso - a.totalPeso);
    } else {
      result.sort((a, b) => (b.dataCarregamento || '').localeCompare(a.dataCarregamento || ''));
    }

    return result;
  }, [orders, sortBy]);

  const stats = useMemo(() => {
    const totalCarregamentos = carregamentosData.length;
    const totalPedidos = carregamentosData.reduce((acc, c) => acc + c.totalPedidos, 0);
    const totalValor = carregamentosData.reduce((acc, c) => acc + c.totalValor, 0);
    const totalPeso = carregamentosData.reduce((acc, c) => acc + c.totalPeso, 0);
    const pesoMedio = totalCarregamentos > 0 ? totalPeso / totalCarregamentos : 0;
    const valorMedio = totalCarregamentos > 0 ? totalValor / totalCarregamentos : 0;

    return {
      totalCarregamentos,
      totalPedidos,
      totalValor,
      totalPeso,
      pesoMedio,
      valorMedio,
    };
  }, [carregamentosData]);

  const handleExport = () => {
    const exportData: any[] = [];

    carregamentosData.forEach(carga => {
      carga.pedidos.forEach((order, idx) => {
        exportData.push({
          'Grupo Carga': carga.grupoCarga,
          'Total Grupo': idx === 0 ? carga.totalPedidos : '',
          'ID Pedido': order.id,
          'Data': format(parseISO(order.createdAt), 'dd/MM/yyyy'),
          'Cliente': order.customerName,
          'Cidade': order.city || '---',
          'Valor': order.totalValue,
          'Peso': order.totalWeight,
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Carregamentos');
    XLSX.writeFile(wb, `Relatorio_Carregamento_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
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
            Relatório de Carregamento
          </h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
            Grupos de carga e movimentação logística
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
            <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Carregamentos</p>
            <p className="text-2xl font-black text-primary">{stats.totalCarregamentos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Pedidos</p>
            <p className="text-2xl font-black text-primary">{stats.totalPedidos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Valor Total</p>
            <p className="text-2xl font-black text-primary">R$ {stats.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Peso Total</p>
            <p className="text-2xl font-black text-primary">{stats.totalPeso.toFixed(2)} kg</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Peso Médio</p>
            <p className="text-2xl font-black text-primary">{stats.pesoMedio.toFixed(2)} kg</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtro de Ordenação */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: 'data', label: 'Por Data' },
          { value: 'valor', label: 'Por Valor' },
          { value: 'peso', label: 'Por Peso' },
        ].map(option => (
          <Button
            key={option.value}
            variant={sortBy === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy(option.value)}
            className="uppercase text-[10px] font-bold"
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Carregamentos */}
      <div className="space-y-4">
        {carregamentosData.map((carga) => (
          <Card key={carga.grupoCarga} className="border-2">
            <CardHeader className="bg-primary/5 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle className="text-sm font-black text-primary">{carga.grupoCarga}</CardTitle>
                    {carga.dataCarregamento && (
                      <p className="text-[9px] text-muted-foreground">
                        Data: {format(parseISO(carga.dataCarregamento), 'dd/MM/yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {/* Resumo */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 pb-4 border-b">
                <div>
                  <p className="text-[8px] text-muted-foreground font-bold uppercase">Pedidos</p>
                  <p className="text-lg font-black text-primary">{carga.totalPedidos}</p>
                </div>
                <div>
                  <p className="text-[8px] text-muted-foreground font-bold uppercase">Valor</p>
                  <p className="text-lg font-black text-primary">R$ {carga.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                </div>
                <div>
                  <p className="text-[8px] text-muted-foreground font-bold uppercase">Peso</p>
                  <p className="text-lg font-black text-primary">{carga.totalPeso.toFixed(2)} kg</p>
                </div>
                <div>
                  <p className="text-[8px] text-muted-foreground font-bold uppercase">Qtd.</p>
                  <p className="text-lg font-black text-primary">{carga.totalQuantidade} un.</p>
                </div>
              </div>

              {/* Pedidos */}
              <div className="space-y-2">
                {carga.pedidos.map(order => (
                  <div key={order.id} className="flex justify-between items-center p-2 bg-slate-50 rounded border">
                    <div>
                      <p className="text-[9px] font-mono font-bold text-primary">{order.id}</p>
                      <p className="text-[8px] text-muted-foreground">{order.customerName} - {order.city}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold">R$ {order.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <p className="text-[8px] text-muted-foreground">{order.totalWeight.toFixed(2)} kg</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {carregamentosData.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Nenhum carregamento encontrado
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
