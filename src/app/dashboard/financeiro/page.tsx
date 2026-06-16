import { CategoryButtonsGrid } from '@/components/dashboard/CategoryButtonsGrid';

export default function FinanceiroPage() {
  const financeiroButtons = [
    {
      label: 'Aprovações',
      icon: 'CheckCircle2',
      path: '/dashboard/financeiro/aprovacoes',
      description: 'Aprovar pedidos de venda a prazo',
    },
    {
      label: 'Cobrança',
      icon: 'DollarSign',
      path: '/dashboard/financeiro/cobranca',
      description: 'Gestão de cobrança e recebimentos',
    },
  ];

  return (
    <div className="w-full">
      <CategoryButtonsGrid title="Financeiro" buttons={financeiroButtons} />
    </div>
  );
}
