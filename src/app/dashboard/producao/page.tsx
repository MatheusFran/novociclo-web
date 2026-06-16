import { CategoryButtonsGrid } from '@/components/dashboard/CategoryButtonsGrid';

export default function ProducaoPage() {
  const producaoButtons = [
    {
      label: 'Fila de Produção',
      icon: 'Warehouse',
      path: '/dashboard/producao/fila',
      description: 'Gerenciar fila de produção',
    },
    {
      label: 'Estoque',
      icon: 'Box',
      path: '/dashboard/producao/estoque',
      description: 'Controle de estoque',
    },
    {
      label: 'Carregamento',
      icon: 'BoxesIcon',
      path: '/dashboard/producao/carregamento',
      description: 'Gerenciar carregamentos',
    },
    {
      label: 'Produtos',
      icon: 'ShoppingBag',
      path: '/dashboard/producao/produtos',
      description: 'Catálogo de produtos',
    },
  ];

  return (
    <div className="w-full">
      <CategoryButtonsGrid title="Produção" buttons={producaoButtons} />
    </div>
  );
}
