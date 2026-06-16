'use client';

import { useAuth } from '@/hooks/use-auth';
import { AuditLogsViewer } from '@/components/audit/AuditLogsViewer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Clock, Activity } from 'lucide-react';

export default function LogsPage() {
  const { user } = useAuth();

  if (!user) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Logs de Atividades</h1>
        <p className="text-gray-600 mt-1">Rastreie todas as ações dos usuários no sistema</p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              Último Login
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user.lastLogin ? (
              <p className="text-2xl font-bold">
                {new Date(user.lastLogin).toLocaleString('pt-BR')}
              </p>
            ) : (
              <p className="text-2xl font-bold text-gray-500">Nunca</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              Seu Papel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold capitalize">{user.role}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-600" />
              Membro Desde
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {new Date(user.createdAt).toLocaleDateString('pt-BR')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visualizador de Logs */}
      <AuditLogsViewer />
    </div>
  );
}
