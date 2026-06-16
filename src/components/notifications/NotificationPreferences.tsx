'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';

interface NotificationPreferences {
  id: string;
  userId: string;
  orderStatusChanged: boolean;
  orderApprovedFinance: boolean;
  orderRejected: boolean;
  orderDelivered: boolean;
  orderInProduction: boolean;
  orderInDelivery: boolean;
}

interface NotificationPreferencesProps {
  userId: string;
}

export function NotificationPreferences({ userId }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/notifications/preferences', {
        headers: { 'x-user-id': userId },
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
      toast({ title: 'Erro ao carregar preferências', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof Omit<NotificationPreferences, 'id' | 'userId'>) => {
    if (preferences) {
      setPreferences({
        ...preferences,
        [key]: !preferences[key],
      });
    }
  };

  const handleSave = async () => {
    if (!preferences) return;

    setSaving(true);
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          orderStatusChanged: preferences.orderStatusChanged,
          orderApprovedFinance: preferences.orderApprovedFinance,
          orderRejected: preferences.orderRejected,
          orderDelivered: preferences.orderDelivered,
          orderInProduction: preferences.orderInProduction,
          orderInDelivery: preferences.orderInDelivery,
        }),
      });

      if (response.ok) {
        toast({ title: 'Preferências salvas com sucesso!' });
      } else {
        toast({ title: 'Erro ao salvar preferências', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast({ title: 'Erro ao salvar preferências', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preferências de Notificações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preferências de Notificações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <p>Erro ao carregar preferências</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const notificationOptions = [
    {
      key: 'orderStatusChanged' as const,
      label: 'Mudança de Status de Pedido',
      description: 'Receber notificação quando o status de um pedido mudar',
    },
    {
      key: 'orderApprovedFinance' as const,
      label: 'Pedido Aprovado Financeiramente',
      description: 'Receber notificação quando um pedido for aprovado pelo financeiro',
    },
    {
      key: 'orderRejected' as const,
      label: 'Pedido Rejeitado',
      description: 'Receber notificação quando um pedido for rejeitado',
    },
    {
      key: 'orderDelivered' as const,
      label: 'Pedido Entregue',
      description: 'Receber notificação quando um pedido for entregue',
    },
    {
      key: 'orderInProduction' as const,
      label: 'Pedido em Produção',
      description: 'Receber notificação quando um pedido entrar em produção',
    },
    {
      key: 'orderInDelivery' as const,
      label: 'Pedido em Entrega',
      description: 'Receber notificação quando um pedido sair para entrega',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferências de Notificações</CardTitle>
        <CardDescription>
          Configure quais tipos de notificações você deseja receber
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {notificationOptions.map((option) => (
          <div key={option.key} className="flex items-start gap-3 py-3 border-b last:border-0">
            <Checkbox
              id={option.key}
              checked={preferences[option.key]}
              onCheckedChange={() => handleToggle(option.key)}
              className="mt-1"
            />
            <div className="flex-1">
              <label
                htmlFor={option.key}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {option.label}
              </label>
              <p className="text-xs text-gray-500 mt-1">{option.description}</p>
            </div>
          </div>
        ))}

        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={fetchPreferences}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar Preferências
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
