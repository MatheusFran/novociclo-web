import { CategoryButtonsGrid } from '@/components/dashboard/CategoryButtonsGrid';

export default function LogisticaPage() {
  const logisticaButtons = [
    {
      label: 'Montagem de Carga',
      icon: 'Package',
      path: '/dashboard/logistica/montagem',
      description: 'Selecione e organize pedidos em cargas',
    },
    {
      label: 'Liberado / Em Entrega',
      icon: 'Truck',
      path: '/dashboard/logistica/liberado',
      description: 'Gerenciar transportes e entregas',
    },
    {
      label: 'Veículos',
      icon: 'Truck',
      path: '/dashboard/logistica/veiculos',
      description: 'Gestão de caminhões e veículos de entrega',
    },
    {
      label: 'Ocorrências',
      icon: 'AlertTriangle',
      path: '/dashboard/logistica/ocorrencias',
      description: 'Registro e gestão de ocorrências nas entregas',
    },
    {
      label: 'Calculadora de Frete',
      icon: 'Calculator',
      path: '/dashboard/logistica/calculadora',
      description: 'Comparativo Próprio vs Terceirizado',
    },
  ];

  return (
    <div className="w-full">
      <CategoryButtonsGrid title="Logística" buttons={logisticaButtons} />
    </div>
  );
}
