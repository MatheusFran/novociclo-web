import { AlertCircle, CheckCircle2, Clock, CreditCard, Package, Truck } from 'lucide-react';
import { OrderStatus } from '@/lib/types';

export const ORDER_STATUS_MAP: Record<OrderStatus, { label: string; color: string; icon: typeof Clock }> = {
    PENDENTE: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
    PRODUCAO: { label: 'Produção', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Package },
    PRONTO_LOGISTICA: { label: 'Expedição', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Truck },
    ENTREGA: { label: 'Em Entrega', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Truck },
    AGUARDANDO_FATURAMENTO: { label: 'Financeiro', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: CreditCard },
    FATURADO: { label: 'Finalizado', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
    REJEITADO: { label: 'Rejeitado', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle },
};
