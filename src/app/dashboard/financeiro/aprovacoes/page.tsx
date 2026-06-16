"use client";

import { useState, useMemo } from 'react';
import { useSystemData } from '@/server/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { OrderTable } from '@/components/shared';
import { toast } from '@/hooks/use-toast';
import {
  CheckCircle2, XCircle, Clock, Loader2, CreditCard, Search
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ApprovacoesPage() {
  const { orders, updateOrderStatus, isReady } = useSystemData();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderToReject, setOrderToReject] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Filtro pedidos em aprovação financeira (vendas a prazo)
  const pendingApproval = useMemo(() => {
    return orders.filter(o => o.status === 'FINANCEIRO');
  }, [orders]);

  // Pesquisa
  const filtered = useMemo(() => {
    if (!searchTerm) return pendingApproval;
    const s = searchTerm.toLowerCase();
    return pendingApproval.filter(o =>
      o.customerName.toLowerCase().includes(s) ||
      o.id.toLowerCase().includes(s) ||
      (o.city && o.city.toLowerCase().includes(s))
    );
  }, [pendingApproval, searchTerm]);

  const handleApprove = async (orderId: string) => {
    setLoading(true);
    try {
      // Aprovar financeira e enviar para produção
      await updateOrderStatus(orderId, 'PRODUCAO', {
        productionStage: 'FILA',
        approvedByFinance: new Date().toISOString(),
        approvedByFinanceUser: 'Admin' // Será obtido do contexto do usuário
      });
      toast({ title: 'Pedido Aprovado', description: 'Enviado para fila de produção.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao aprovar pedido', description: (error as Error)?.message });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (orderId: string) => {
    if (!rejectionReason.trim()) {
      toast({ variant: 'destructive', title: 'Motivo obrigatório', description: 'Informe o motivo da rejeição.' });
      return;
    }

    setLoading(true);
    try {
      await updateOrderStatus(orderId, 'REJEITADO', {
        rejectedAt: new Date().toISOString(),
        rejectedBy: 'Admin', // Será obtido do contexto do usuário
        rejectionReason: rejectionReason
      });
      toast({ title: 'Pedido Rejeitado', description: 'Motivo registrado no sistema.' });
      setOrderToReject(null);
      setRejectionReason('');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao rejeitar pedido', description: (error as Error)?.message });
    } finally {
      setLoading(false);
    }
  };

  const totalValue = filtered.reduce((sum, o) => sum + o.totalValue, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-primary uppercase tracking-tight">Aprovação Financeira</h1>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
          Analise e aprove pedidos de venda a prazo para liberação da produção
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-[8px] sm:text-[9px] font-black uppercase text-muted-foreground mb-2">Pendentes de Aprovação</p>
            <p className="text-2xl font-black text-yellow-600">{filtered.length}</p>
            <p className="text-[8px] text-muted-foreground mt-1">pedidos</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-[8px] sm:text-[9px] font-black uppercase text-muted-foreground mb-2">Valor Total</p>
            <p className="text-2xl font-black text-blue-600">R$ {(totalValue / 1000).toFixed(0)}k</p>
            <p className="text-[8px] text-muted-foreground mt-1">em análise</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-[8px] sm:text-[9px] font-black uppercase text-muted-foreground mb-2">Ticket Médio</p>
            <p className="text-2xl font-black text-slate-600">R$ {filtered.length > 0 ? (totalValue / filtered.length / 1000).toFixed(0) : 0}k</p>
            <p className="text-[8px] text-muted-foreground mt-1">por pedido</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="PESQUISAR CLIENTE, PEDIDO, CIDADE..."
          className="pl-10 h-10 text-xs font-bold uppercase"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabela */}
      <OrderTable
        orders={filtered}
        showSearch={false}
        columns={[
          {
            key: 'id',
            header: 'Pedido',
            render: o => (
              <span className="text-[11px] font-black uppercase text-slate-700">
                {o.id}
              </span>
            ),
          },
          {
            key: 'customerName',
            header: 'Cliente',
            render: o => (
              <span className="text-[11px] font-black uppercase text-slate-700 max-w-[180px] truncate block">
                {o.customerName}
              </span>
            ),
          },
          {
            key: 'paymentCondition',
            header: 'Condição Pagto',
            render: o => (
              <span className="text-[10px] font-semibold text-slate-700 uppercase">
                {o.paymentCondition?.replace(/_/g, ' ') || '---'}
              </span>
            ),
          },
          {
            key: 'city',
            header: 'Cidade',
            render: o => (
              <span className="text-[10px] font-black text-slate-700 uppercase">
                {o.city || '---'}
              </span>
            ),
          },
          {
            key: 'totalValue',
            header: 'Valor',
            render: o => (
              <span className="text-[11px] font-black text-primary">
                R$ {(o.totalValue / 1000).toFixed(1)}k
              </span>
            ),
          },
          {
            key: 'createdAt',
            header: 'Data Pedido',
            render: o => (
              <span className="text-[10px] text-muted-foreground">
                {format(new Date(o.createdAt), 'dd/MM/yy', { locale: ptBR })}
              </span>
            ),
          },
        ]}
        actions={[
          {
            label: 'Aprovar',
            icon: <CheckCircle2 className="w-3.5 h-3.5" />,
            variant: 'ghost',
            className: 'text-green-600 hover:text-green-700 hover:bg-green-50',
            onClick: o => handleApprove(o.id),
            // disabled: loading,
          },
          {
            label: 'Rejeitar',
            icon: <XCircle className="w-3.5 h-3.5" />,
            variant: 'ghost',
            className: 'text-red-600 hover:text-red-700 hover:bg-red-50',
            onClick: o => setOrderToReject(o.id),
            // disabled: loading,
          },
        ]}
        emptyMessage="Nenhum pedido aguardando aprovação financeira"
      />

      {/* Modal de Rejeição */}
      <AlertDialog open={!!orderToReject} onOpenChange={open => !open && (setOrderToReject(null), setRejectionReason(''))}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar Pedido</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da rejeição para o pedido {orderToReject}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Ex: Cliente inadimplente, limite de crédito excedido, dados incompletos..."
            value={rejectionReason}
            onChange={e => setRejectionReason(e.target.value)}
            className="min-h-[100px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={!rejectionReason.trim() || loading}
              onClick={() => orderToReject && handleReject(orderToReject)}
            >
              {loading ? 'Rejeitando...' : 'Confirmar Rejeição'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
