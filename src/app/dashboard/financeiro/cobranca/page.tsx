"use client";

import { useState, useMemo } from 'react';
import { useSystemData } from '@/server/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { OrderTable } from '@/components/shared';
import { toast } from '@/hooks/use-toast';
import {
  Loader2, DollarSign, AlertTriangle, Search, CheckCircle2, Clock, Trash2
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CobrancaPage() {
  const { orders, isReady } = useSystemData();
  const [searchTerm, setSearchTerm] = useState('');

  // Filtro: apenas pedidos entregues (devem ser cobrados)
  const deliveredOrders = useMemo(() => {
    return orders.filter(o => o.status === 'ENTREGUE');
  }, [orders]);

  // Pesquisa
  const filtered = useMemo(() => {
    if (!searchTerm) return deliveredOrders;
    const s = searchTerm.toLowerCase();
    return deliveredOrders.filter(o =>
      o.customerName.toLowerCase().includes(s) ||
      o.id.toLowerCase().includes(s) ||
      (o.city && o.city.toLowerCase().includes(s))
    );
  }, [deliveredOrders, searchTerm]);

  // Análise de atrasos
  const analyzed = filtered.map(o => {
    let daysOverdue = 0;
    let daysToPayment = 0;

    if (o.deliveredAt) {
      daysToPayment = differenceInDays(new Date(), new Date(o.deliveredAt));
    }

    // Simular prazo padrão de 30 dias
    const expectedPaymentDate = o.deliveredAt ?
      new Date(new Date(o.deliveredAt).getTime() + 30 * 24 * 60 * 60 * 1000) :
      null;

    if (expectedPaymentDate && new Date() > expectedPaymentDate) {
      daysOverdue = differenceInDays(new Date(), expectedPaymentDate);
    }

    return {
      ...o,
      daysToPayment,
      daysOverdue,
      isOverdue: daysOverdue > 0,
    };
  });

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalValue = analyzed.reduce((sum, o) => sum + o.totalValue, 0);
  const overdueCount = analyzed.filter(o => o.isOverdue).length;
  const overdueValue = analyzed.filter(o => o.isOverdue).reduce((sum, o) => sum + o.totalValue, 0);

  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <Clock className="w-12 h-12 text-muted-foreground opacity-40" />
      <div className="text-center">
        <h2 className="text-lg font-black uppercase text-muted-foreground">Em Desenvolvimento</h2>
        <p className="text-xs text-muted-foreground mt-1">Esta funcionalidade estará disponível em breve</p>
      </div>
    </div>
  );

  // return (
  //   <div className="space-y-6">
  //     <div>
  //       <h1 className="text-2xl font-black text-primary uppercase tracking-tight">Gestão de Cobrança</h1>
  //       <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
  //         Acompanhamento de pedidos entregues e controle de recebimentos
  //       </p>
  //     </div>

  //     {/* KPIs */}
  //     <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
  //       <Card className="border-none shadow-sm">
  //         <CardContent className="p-4">
  //           <p className="text-[8px] sm:text-[9px] font-black uppercase text-muted-foreground mb-2">Total a Receber</p>
  //           <p className="text-2xl font-black text-blue-600">R$ {(totalValue / 1000).toFixed(0)}k</p>
  //           <p className="text-[8px] text-muted-foreground mt-1">{analyzed.length} pedidos</p>
  //         </CardContent>
  //       </Card>
  //       <Card className="border-none shadow-sm">
  //         <CardContent className="p-4">
  //           <p className="text-[8px] sm:text-[9px] font-black uppercase text-muted-foreground mb-2">Vencidos</p>
  //           <p className="text-2xl font-black text-red-600">{overdueCount}</p>
  //           <p className="text-[8px] text-muted-foreground mt-1">R$ {(overdueValue / 1000).toFixed(0)}k</p>
  //         </CardContent>
  //       </Card>
  //       <Card className="border-none shadow-sm">
  //         <CardContent className="p-4">
  //           <p className="text-[8px] sm:text-[9px] font-black uppercase text-muted-foreground mb-2">No Prazo</p>
  //           <p className="text-2xl font-black text-green-600">{analyzed.length - overdueCount}</p>
  //           <p className="text-[8px] text-muted-foreground mt-1">em dia</p>
  //         </CardContent>
  //       </Card>
  //       <Card className="border-none shadow-sm">
  //         <CardContent className="p-4">
  //           <p className="text-[8px] sm:text-[9px] font-black uppercase text-muted-foreground mb-2">Ticket Médio</p>
  //           <p className="text-2xl font-black text-slate-600">R$ {analyzed.length > 0 ? (totalValue / analyzed.length / 1000).toFixed(0) : 0}k</p>
  //           <p className="text-[8px] text-muted-foreground mt-1">por entrega</p>
  //         </CardContent>
  //       </Card>
  //     </div>

  //     {/* Alert */}
  //     {overdueCount > 0 && (
  //       <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
  //         <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
  //         <div>
  //           <p className="text-[9px] font-black uppercase text-red-700">⚠️ Cobranças em Atraso</p>
  //           <p className="text-[11px] font-black text-red-800">{overdueCount} pedido(s) com vencimento ultrapassado</p>
  //         </div>
  //       </div>
  //     )}

  //     {/* Search */}
  //     <div className="relative">
  //       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
  //       <Input
  //         placeholder="PESQUISAR CLIENTE, PEDIDO, CIDADE..."
  //         className="pl-10 h-10 text-xs font-bold uppercase"
  //         value={searchTerm}
  //         onChange={e => setSearchTerm(e.target.value)}
  //       />
  //     </div>

  //     {/* Tabela */}
  //     <OrderTable
  //       orders={analyzed}
  //       showSearch={false}
  //       columns={[
  //         {
  //           key: 'id',
  //           header: 'Pedido',
  //           render: o => (
  //             <span className="text-[11px] font-black uppercase text-slate-700">
  //               {o.id.substring(0, 8)}...
  //             </span>
  //           ),
  //         },
  //         {
  //           key: 'customerName',
  //           header: 'Cliente',
  //           render: o => (
  //             <span className="text-[11px] font-black uppercase text-slate-700 max-w-[180px] truncate block">
  //               {o.customerName}
  //             </span>
  //           ),
  //         },
  //         {
  //           key: 'city',
  //           header: 'Cidade',
  //           render: o => (
  //             <span className="text-[10px] font-black text-slate-700 uppercase">
  //               {o.city || '---'}
  //             </span>
  //           ),
  //         },
  //         {
  //           key: 'totalValue',
  //           header: 'Valor',
  //           render: o => (
  //             <span className="text-[11px] font-black text-primary">
  //               R$ {(o.totalValue / 1000).toFixed(1)}k
  //             </span>
  //           ),
  //         },
  //         {
  //           key: 'deliveryStatus',
  //           header: 'Status Pagto',
  //           align: 'center',
  //           render: (o: any) => (
  //             <Badge
  //               variant="outline"
  //               className={`text-[8px] font-black uppercase px-2 h-5 flex items-center justify-center ${
  //                 o.isOverdue
  //                   ? 'bg-red-100 text-red-700 border-red-200'
  //                   : 'bg-green-100 text-green-700 border-green-200'
  //               }`}
  //             >
  //               {o.isOverdue ? `Vencido ${o.daysOverdue}d` : `${o.daysToPayment}d`}
  //             </Badge>
  //           ),
  //         },
  //         {
  //           key: 'deliveredAt',
  //           header: 'Data Entrega',
  //           render: o => (
  //             <span className="text-[10px] text-muted-foreground">
  //               {o.deliveredAt ? format(new Date(o.deliveredAt), 'dd/MM/yy', { locale: ptBR }) : '---'}
  //             </span>
  //           ),
  //         },
  //       ]}
  //       actions={[
  //         {
  //           label: 'Registrar Pagto',
  //           icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  //           variant: 'ghost',
  //           className: 'text-green-600 hover:text-green-700 hover:bg-green-50',
  //           onClick: o => {
  //             toast({ title: 'Funcionalidade em desenvolvimento', description: 'Registro de pagamento será implementado em breve' });
  //           },
  //         },
  //       ]}
  //       emptyMessage="Nenhum pedido entregue aguardando cobrança"
  //     />
  //   </div>
  // );
}
