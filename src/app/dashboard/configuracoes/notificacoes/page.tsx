'use client';

import { useAuth } from '@/hooks/use-auth';
import { NotificationPreferences } from '@/components/notifications';

export default function NotificacoesPage() {
  const { user } = useAuth();

  if (!user) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configurações de Notificações</h1>
        <p className="text-gray-600 mt-1">Gerencie como você recebe notificações sobre seus pedidos</p>
      </div>

      <NotificationPreferences userId={user.id} />
    </div>
  );
}
