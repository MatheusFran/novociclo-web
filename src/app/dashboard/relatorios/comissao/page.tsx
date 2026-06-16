'use client';

import { useSystemData } from '@/server/store';
import { format, parseISO, addDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Download, DollarSign, TrendingUp } from 'lucide-react';
import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

// Mapeamento de condições de pagamento e seus prazos
const PAYMENT_TERMS: Record<string, { label: string; installments: number[] }> = {
  'A_VISTA_ENTREGA': { label: 'À Vista na Entrega', installments: [0] },
  'BOLETO_15_DIAS': { label: 'Boleto 15 Dias', installments: [15] },
  'BOLETO_30_DIAS': { label: 'Boleto 30 Dias', installments: [30] },
  'BOLETO_30_60': { label: 'Boleto 30/60', installments: [30, 60] },
  'BOLETO_30_60_90': { label: 'Boleto 30/60/90', installments: [30, 60, 90] },
  'CARTAO': { label: 'Cartão', installments: [0] },
  'CARTAO2X': { label: 'Cartão 2X', installments: [0, 30] },
  'PIX': { label: 'PIX', installments: [0] },
  'BONIFICADO': { label: 'Bonificado', installments: [] },
  'OUTRO': { label: 'Outro', installments: [30] },
};

interface CommissionProjection {
  vendedor: string;
  pedidos: number;
  valorTotal: number;
  comissao: number; // percentual
  projecao: {
    data: string;
    valor: number;
    installmentNumber: number;
    totalInstallments: number;
  }[];
}

export default function ComissaoPage() {
  const { orders, members, isReady } = useSystemData();
  const [vendedorFilter, setVendedorFilter] = useState('TODOS');
  const [comissaoPercentual, setComissaoPercentual] = useState(5); // 5% padrão

  // Calcula projeção por vendedor
  const commissionsData = useMemo(() => {
    const now = new Date();
    const map = new Map<string, CommissionProjection>();

    orders.forEach(order => {
      if (['CANCELADO', 'REJEITADO'].includes(order.status)) return;

      const vendedor = order.seller || 'Sem Vendedor';
      const paymentTerms = PAYMENT_TERMS[order.paymentCondition] || PAYMENT_TERMS['OUTRO'];
      
      const current = map.get(vendedor) || {
        vendedor,
        pedidos: 0,
        valorTotal: 0,
        comissao: comissaoPercentual,
        projecao: [],
      };

      current.pedidos += 1;
      current.valorTotal += order.totalValue || 0;

      // Calcula as parcelas
      if (paymentTerms.installments.length === 0) {
        // Bonificado - sem recebimento
        return;
      }

      const valorParcela = (order.totalValue || 0) / paymentTerms.installments.length;
      const orderDate = parseISO(order.createdAt);

      paymentTerms.installments.forEach((days, idx) => {
        const dueDate = addDays(orderDate, days);
        current.projecao.push({
          data: format(dueDate, 'dd/MM/yyyy'),
          valor: valorParcela,
          installmentNumber: idx + 1,
          totalInstallments: paymentTerms.installments.length,
        });
      });

      map.set(vendedor, current);
    });

    let result = Array.from(map.values());
    if (vendedorFilter !== 'TODOS') {
      result = result.filter(c => c.vendedor === vendedorFilter);
    }

    return result.sort((a, b) => b.valorTotal - a.valorTotal);
  }, [orders, vendedorFilter, comissaoPercentual]);

  // Projeção agregada por data
  const projecaoAgregada = useMemo(() => {
    const map = new Map<string, number>();

    commissionsData.forEach(commission => {
      commission.projecao.forEach(proj => {
        const current = map.get(proj.data) || 0;
        map.set(proj.data, current + proj.valor);
      });
    });

    return Array.from(map.entries())
      .map(([data, valor]) => ({ data, valor }))
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [commissionsData]);

  const stats = useMemo(() => {
    const totalVendedores = commissionsData.length;
    const totalValor = commissionsData.reduce((acc, c) => acc + c.valorTotal, 0);
    const totalComissao = commissionsData.reduce((acc, c) => acc + (c.valorTotal * c.comissao / 100), 0);
    const totalProjecao = projecaoAgregada.reduce((acc, p) => acc + p.valor, 0);

    return {
      totalVendedores,
      totalValor,
      totalComissao,
      totalProjecao,
    };
  }, [commissionsData, projecaoAgregada]);

  const handleExport = () => {
    const exportData: any[] = [];

    commissionsData.forEach(commission => {
      const comissaoValue = commission.valorTotal * commission.comissao / 100;
      
      // Linha do vendedor
      exportData.push({
        'Vendedor': commission.vendedor,
        'Pedidos': commission.pedidos,
        'Valor Total': commission.valorTotal,
        'Comissão %': commission.comissao,
        'Comissão R$': comissaoValue,
        'Data Recebimento': '',
        'Valor Recebimento': '',
      });

      // Linhas de projeção
      commission.projecao.forEach(proj => {
        exportData.push({
          'Vendedor': '',
          'Pedidos': '',
          'Valor Total': '',
          'Comissão %': '',
          'Comissão R$': '',
          'Data Recebimento': proj.data,
          'Valor Recebimento': proj.valor,
        });
      });

      exportData.push({
        'Vendedor': '',
        'Pedidos': '',
        'Valor Total': '',
        'Comissão %': '',
        'Comissão R$': '',
        'Data Recebimento': '',
        'Valor Recebimento': '',
      });
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comissões');
    XLSX.writeFile(wb, `Relatorio_Comissoes_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
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
            Relatório de Comissões
          </h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
            Projeção de recebimento e comissões por vendedor
          </p>
        </div>
        <Button onClick={handleExport} className="gap-2 font-black uppercase text-[10px]">
          <Download className="w-4 h-4" /> Exportar
        </Button>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase text-muted-foreground">Vendedor</label>
          <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
            <SelectTrigger className="w-48 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os Vendedores</SelectItem>
              {commissionsData.map(c => (
                <SelectItem key={c.vendedor} value={c.vendedor}>{c.vendedor}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase text-muted-foreground">Comissão (%)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={comissaoPercentual}
              onChange={(e) => setComissaoPercentual(parseFloat(e.target.value) || 0)}
              className="w-20 h-9 px-2 border rounded text-xs font-bold"
            />
            <span className="text-[9px] font-bold">%</span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Vendedores</p>
            <p className="text-2xl font-black text-primary">{stats.totalVendedores}</p>
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
            <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Comissão Total</p>
            <p className="text-2xl font-black text-emerald-600">R$ {stats.totalComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Projeção Recebimento</p>
            <p className="text-2xl font-black text-blue-600">R$ {stats.totalProjecao.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
      </div>

      {/* Projeção Agregada por Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-black">Projeção Agregada de Recebimento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-[9px] font-black uppercase">Data</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-right">Valor Projetado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projecaoAgregada.map(proj => (
                  <TableRow key={proj.data} className="hover:bg-muted/5">
                    <TableCell className="text-[9px] font-bold">{proj.data}</TableCell>
                    <TableCell className="text-[9px] font-black text-right text-blue-600">
                      R$ {proj.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detalhes por Vendedor */}
      <div className="space-y-4">
        {commissionsData.map(commission => {
          const comissaoValue = commission.valorTotal * commission.comissao / 100;
          return (
            <Card key={commission.vendedor} className="border-2">
              <CardHeader className="bg-primary/5 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-black text-primary">{commission.vendedor}</CardTitle>
                    <p className="text-[9px] text-muted-foreground mt-1">
                      {commission.pedidos} pedidos • Total: R$ {commission.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Comissão</p>
                    <p className="text-xl font-black text-emerald-600">
                      R$ {comissaoValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {commission.projecao.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase mb-3">Projeção de Recebimento</p>
                    {commission.projecao.map((proj, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 rounded border">
                        <div>
                          <p className="text-[9px] font-bold">
                            Parcela {proj.installmentNumber} de {proj.totalInstallments}
                          </p>
                          <p className="text-[8px] text-muted-foreground">{proj.data}</p>
                        </div>
                        <p className="text-[9px] font-bold text-blue-600">
                          R$ {proj.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-[9px]">
                    Nenhuma projeção de recebimento (vendas bonificadas ou sem prazo)
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {commissionsData.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Nenhum vendedor encontrado
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
