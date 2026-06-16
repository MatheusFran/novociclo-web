import { CategoryButtonsGrid } from '@/components/dashboard/CategoryButtonsGrid';

export default function ConfiguracoesPage() {
  const configButtons = [
    {
      label: 'Usuários',
      icon: 'Users',
      path: '/dashboard/configuracoes/usuarios',
      description: 'Gerenciar usuários do sistema',
    },
    {
      label: 'Painel de Controle',
      icon: 'BarChart3',
      path: '/dashboard/configuracoes/painel',
      description: 'Configurações gerais do sistema',
    },
    {
      label: 'Meu Perfil',
      icon: 'User',
      path: '/dashboard/configuracoes/perfil',
      description: 'Editar informações pessoais',
    },
    {
      label: 'Notificações',
      icon: 'Bell',
      path: '/dashboard/configuracoes/notificacoes',
      description: 'Configurar preferências de notificações',
    },
    {
      label: 'Logs de Atividades',
      icon: 'Activity',
      path: '/dashboard/configuracoes/logs',
      description: 'Rastrear ações dos usuários',
    },
  ];

  return (
    <div className="w-full">
      <CategoryButtonsGrid title="Configurações" buttons={configButtons} />
    </div>
  );
}
