import { CategoryButtonsGrid } from '@/components/dashboard/CategoryButtonsGrid';

export default function VendasPage() {
  const vendasButtons = [
    {
      label: 'Pedidos de Venda',
      icon: 'ShoppingCart',
      path: '/dashboard/vendas/pedidos',
      description: 'Gerenciar pedidos',
    },
    {
      label: 'CRM',
      icon: 'Handshake',
      path: '/dashboard/vendas/crm',
      description: 'Relacionamento com clientes',
    },
    {
      label: 'Cotação',
      icon: 'FileCheck',
      path: '/dashboard/vendas/cotacao',
      description: 'Gerenciar cotações',
    },
    {
      label: 'Clientes',
      icon: 'Users',
      path: '/dashboard/vendas/clientes',
      description: 'Base de clientes',
    },
    {
      label: 'Configurações',
      icon: 'Settings',
      path: '/dashboard/vendas/configuracoes',
      description: 'Configurações comerciais, usuários, preços e equipe',
    },
  ];

  return (
    <div className="w-full">
      <CategoryButtonsGrid title="Vendas" buttons={vendasButtons} />
    </div>
  );
}
