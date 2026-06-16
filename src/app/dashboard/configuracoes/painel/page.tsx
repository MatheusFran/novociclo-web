"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from '@/hooks/use-toast';
import { Save, AlertCircle, Trash2, Eye, Plus } from 'lucide-react';
import { ConfigSectionComponent, type ConfigSection } from '@/components/dashboard/ConfigSectionComponent';
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSystemData } from '@/server/store';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';

export default function PainelPage() {
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const { orders, isReady, deleteOrder } = useSystemData();
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Definir as seções de configuração
  const configSections: ConfigSection[] = [
    {
      id: 'vendas',
      title: 'Configurações de Vendas',
      description: 'Regras de negócio para pedidos, clientes e cotações',
      fields: [
        {
          key: 'PEDIDO_MINIMO_KG',
          label: 'Pedido Mínimo (kg)',
          description: 'Peso mínimo para aceitar um pedido',
          type: 'number',
          value: configs.PEDIDO_MINIMO_KG ?? 10,
          placeholder: '10',
          min: 0,
        },
        {
          key: 'PEDIDO_MINIMO_VALOR',
          label: 'Pedido Mínimo (R$)',
          description: 'Valor mínimo para aceitar um pedido',
          type: 'number',
          value: configs.PEDIDO_MINIMO_VALOR ?? 100,
          placeholder: '100',
          min: 0,
        },
        {
          key: 'BLOQUEAR_PEDIDO_CLIENTE_INADIMPLENTE',
          label: 'Bloquear Pedido de Cliente Inadimplente',
          description: 'Impede pedidos de clientes com problemas de pagamento',
          type: 'boolean',
          value: configs.BLOQUEAR_PEDIDO_CLIENTE_INADIMPLENTE ?? true,
        },
        {
          key: 'PRAZO_PAGAMENTO_PADRAO',
          label: 'Prazo de Pagamento Padrão (dias)',
          description: 'Prazo padrão para pagamento de pedidos',
          type: 'number',
          value: configs.PRAZO_PAGAMENTO_PADRAO ?? 30,
          placeholder: '30',
          min: 0,
          max: 365,
        },
        {
          key: 'DESCONTO_MAXIMO_VENDEDOR',
          label: 'Desconto Máximo do Vendedor (%)',
          description: 'Desconto máximo que um vendedor pode aplicar',
          type: 'number',
          value: configs.DESCONTO_MAXIMO_VENDEDOR ?? 5,
          placeholder: '5',
          min: 0,
          max: 100,
        },
      ],
    },
    {
      id: 'producao',
      title: 'Configurações de Produção',
      description: 'Regras para fila de produção, estoque e carregamento',
      fields: [
        {
          key: 'PRODUCAO_ATIVA',
          label: 'Produção Ativa',
          description: 'Habilita ou desabilita o módulo de produção',
          type: 'boolean',
          value: configs.PRODUCAO_ATIVA ?? true,
        },
        {
          key: 'TEMPO_PRODUCAO_PADRAO',
          label: 'Tempo de Produção Padrão (horas)',
          description: 'Tempo estimado para produzir um lote',
          type: 'number',
          value: configs.TEMPO_PRODUCAO_PADRAO ?? 24,
          placeholder: '24',
          min: 1,
          max: 168,
        },
        {
          key: 'LOTE_MINIMO_PRODUCAO',
          label: 'Lote Mínimo (kg)',
          description: 'Quantidade mínima para iniciar uma produção',
          type: 'number',
          value: configs.LOTE_MINIMO_PRODUCAO ?? 50,
          placeholder: '50',
          min: 0,
        },
        {
          key: 'BLOQUEAR_PRODUCAO_SEM_ESTOQUE',
          label: 'Bloquear Produção Sem Matéria-Prima',
          description: 'Impede iniciar produção sem estoque suficiente',
          type: 'boolean',
          value: configs.BLOQUEAR_PRODUCAO_SEM_ESTOQUE ?? true,
        },
        {
          key: 'ESTOQUE_MINIMO_ALERTA',
          label: 'Estoque Mínimo para Alerta (kg)',
          description: 'Quantidade para alertar sobre baixo estoque',
          type: 'number',
          value: configs.ESTOQUE_MINIMO_ALERTA ?? 50,
          placeholder: '50',
          min: 0,
        },
      ],
    },
    {
      id: 'logistica',
      title: 'Configurações de Logística',
      description: 'Regras para entrega, veículos e roteirização',
      fields: [
        {
          key: 'AGRUPAR_PEDIDOS_AUTOMATICAMENTE',
          label: 'Agrupar Pedidos Automaticamente',
          description: 'Agrupa pedidos por rota de entrega automaticamente',
          type: 'boolean',
          value: configs.AGRUPAR_PEDIDOS_AUTOMATICAMENTE ?? true,
        },
        {
          key: 'DISTANCIA_MAXIMA_ROTA',
          label: 'Distância Máxima da Rota (km)',
          description: 'Distância máxima para uma rota de entrega',
          type: 'number',
          value: configs.DISTANCIA_MAXIMA_ROTA ?? 100,
          placeholder: '100',
          min: 10,
          max: 1000,
        },
        {
          key: 'PRAZO_ENTREGA_PADRAO',
          label: 'Prazo de Entrega Padrão (dias)',
          description: 'Prazo padrão para entrega dos pedidos',
          type: 'number',
          value: configs.PRAZO_ENTREGA_PADRAO ?? 3,
          placeholder: '3',
          min: 1,
          max: 30,
        },
        {
          key: 'PERMITIR_ENTREGA_ATRASO',
          label: 'Permitir Marcar Entrega com Atraso',
          description: 'Permite registrar entrega mesmo fora do prazo',
          type: 'boolean',
          value: configs.PERMITIR_ENTREGA_ATRASO ?? true,
        },
        {
          key: 'VALIDAR_CAPACIDADE_VEICULO',
          label: 'Validar Capacidade do Veículo',
          description: 'Verifica se a carga não ultrapassa capacidade do veículo',
          type: 'boolean',
          value: configs.VALIDAR_CAPACIDADE_VEICULO ?? true,
        },
      ],
    },
    {
      id: 'financeiro',
      title: 'Configurações Financeiras',
      description: 'Regras para aprovações, cobrança e pagamentos',
      fields: [
        {
          key: 'EXIGIR_APROVACAO_PEDIDOS',
          label: 'Exigir Aprovação de Pedidos',
          description: 'Pedidos precisam ser aprovados antes de processar',
          type: 'boolean',
          value: configs.EXIGIR_APROVACAO_PEDIDOS ?? false,
        },
        {
          key: 'LIMITE_CREDITO_CLIENTE',
          label: 'Limite de Crédito Padrão (R$)',
          description: 'Limite de crédito padrão para novos clientes',
          type: 'number',
          value: configs.LIMITE_CREDITO_CLIENTE ?? 5000,
          placeholder: '5000',
          min: 0,
        },
        {
          key: 'JUROS_ATRASO_DIARIO',
          label: 'Juros por Atraso (% a.d.)',
          description: 'Juros diários por pagamento atrasado',
          type: 'number',
          value: configs.JUROS_ATRASO_DIARIO ?? 0.5,
          placeholder: '0.5',
          min: 0,
          max: 10,
        },
      ],
    },
    {
      id: 'geral',
      title: 'Configurações Gerais',
      description: 'Informações da empresa e preferências do sistema',
      fields: [
        {
          key: 'EMPRESA_NOME',
          label: 'Nome da Empresa',
          type: 'string',
          value: configs.EMPRESA_NOME ?? 'Novo Ciclo',
          placeholder: 'Nome da empresa',
        },
        {
          key: 'EMPRESA_CNPJ',
          label: 'CNPJ',
          type: 'string',
          value: configs.EMPRESA_CNPJ ?? '',
          placeholder: '00.000.000/0000-00',
        },
        {
          key: 'EMPRESA_EMAIL',
          label: 'Email da Empresa',
          type: 'string',
          value: configs.EMPRESA_EMAIL ?? 'contato@novociclo.com.br',
          placeholder: 'email@empresa.com.br',
        },
        {
          key: 'EMPRESA_TELEFONE',
          label: 'Telefone da Empresa',
          type: 'string',
          value: configs.EMPRESA_TELEFONE ?? '(11) 0000-0000',
          placeholder: '(11) 0000-0000',
        },
      ],
    },
  ];

  useEffect(() => {
    fetchConfigs();
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      const response = await fetch('/api/users/me');
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.role);
      }
    } catch (error) {
      console.error('Erro ao carregar role do usuário:', error);
      setUserRole('COMERCIAL'); // Default role
    }
  };

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/system-config');
      if (!response.ok) throw new Error('Erro ao carregar configurações');
      const data = await response.json();
      setConfigs(data);
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Erro", 
        description: (error as Error).message 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (key: string, value: any) => {
    setConfigs(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/system-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configs),
      });

      if (!response.ok) throw new Error('Erro ao salvar configurações');
      toast({ title: "Configurações salvas com sucesso!" });
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Erro", 
        description: (error as Error).message 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await deleteOrder(orderId);
      toast({ title: "Pedido deletado com sucesso", description: `${orderId} foi removido do sistema.` });
      setOrderToDelete(null);
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Erro ao deletar pedido", 
        description: (error as Error).message 
      });
    }
  };

  const isAdmin = userRole === 'ADMIN';

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Painel de Controle</h1>
          <p className="text-gray-600 mt-1">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Painel de Controle</h1>
        <p className="text-gray-600 mt-1">Configure as regras de negócio do sistema</p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Todas as alterações feitas aqui afetarão o comportamento do sistema. Salve suas mudanças após realizar as alterações.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="vendas" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="producao">Produção</TabsTrigger>
          <TabsTrigger value="logistica">Logística</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          {isAdmin && <TabsTrigger value="admin">Administração</TabsTrigger>}
        </TabsList>

        {configSections.map(section => (
          <TabsContent key={section.id} value={section.id} className="space-y-6">
            <ConfigSectionComponent
              section={section}
              onFieldChange={handleFieldChange}
              disabled={isSaving}
            />
          </TabsContent>
        ))}

        {/* ── ABA DE ADMINISTRAÇÃO (SOMENTE ADMIN) ── */}
        {isAdmin && (
          <TabsContent value="admin" className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Funções administrativas. Use com cuidado - as operações aqui podem afetar dados críticos do sistema.
              </AlertDescription>
            </Alert>

            {/* Gerenciamento de Pedidos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Gerenciamento de Pedidos de Venda
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Visualize e delete pedidos de venda. Útil para remover registros duplicados ou errados.
                </p>
                
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted">
                        <TableHead className="text-xs font-bold">ID Pedido</TableHead>
                        <TableHead className="text-xs font-bold">Cliente</TableHead>
                        <TableHead className="text-xs font-bold">Data</TableHead>
                        <TableHead className="text-xs font-bold">Status</TableHead>
                        <TableHead className="text-xs font-bold text-right">Valor</TableHead>
                        <TableHead className="text-xs font-bold text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.slice(0, 10).map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="text-xs font-mono">{order.id}</TableCell>
                          <TableCell className="text-xs">{order.customerName}</TableCell>
                          <TableCell className="text-xs">{format(new Date(order.createdAt), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-right font-semibold">
                            R$ {order.totalValue.toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:bg-red-50 h-8 px-2"
                              onClick={() => setOrderToDelete(order.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {orders.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Nenhum pedido encontrado
                    </div>
                  )}
                </div>
                {orders.length > 10 && (
                  <p className="text-xs text-muted-foreground">
                    Mostrando 10 de {orders.length} pedidos. Acesse Vendas → Pedidos para gerenciar todos.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Gerenciamento de Estoque */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Limpeza de Estoque
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Delete movimentações de estoque erradas ou duplicadas. Acesse a página de Estoque em Produção para gerenciar registros.
                </p>
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Para manter a integridade dos dados, recomenda-se usar a página de Estoque no módulo de Produção para gerenciar movimentações. Esta seção é apenas para admin limpar erros críticos.
                  </AlertDescription>
                </Alert>

                <Button 
                  variant="outline" 
                  size="sm"
                  className="gap-2"
                  onClick={() => window.location.href = '/dashboard/producao'}
                >
                  <Plus className="w-4 h-4" />
                  Ir para Gerenciamento de Estoque
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button 
          variant="outline" 
          onClick={fetchConfigs}
          disabled={isSaving}
        >
          Descartar Alterações
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="gap-2"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>

      {/* ── ALERT DIALOG: CONFIRMAÇÃO DE EXCLUSÃO ── */}
      <AlertDialog open={!!orderToDelete} onOpenChange={open => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Pedido</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o pedido <strong>{orderToDelete}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => orderToDelete && handleDeleteOrder(orderToDelete)}
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
