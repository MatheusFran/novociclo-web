/**
 * EXEMPLOS PRÁTICOS DE USO DO SISTEMA DE CONFIGURAÇÕES
 * 
 * Este arquivo mostra como integrar as regras de negócio
 * em componentes reais da aplicação
 */

// ============================================
// EXEMPLO 1: VALIDAÇÃO DE PEDIDO AO CRIAR
// ============================================

/*
import { useState } from 'react';
import { useSystemConfig } from '@/hooks/use-system-config';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

interface CreateOrderProps {
  customerId: string;
  items: any[];
  totalWeight: number;
  totalValue: number;
}

function CreateOrderButton({ customerId, items, totalWeight, totalValue }: CreateOrderProps) {
  const configs = useSystemConfig();
  const [errors, setErrors] = useState<string[]>([]);

  const handleCreate = async () => {
    const validationErrors: string[] = [];

    // Validar peso mínimo
    if (configs?.PEDIDO_MINIMO_KG && totalWeight < configs.PEDIDO_MINIMO_KG) {
      validationErrors.push(
        `Peso mínimo: ${configs.PEDIDO_MINIMO_KG} kg (atual: ${totalWeight} kg)`
      );
    }

    // Validar valor mínimo
    if (configs?.PEDIDO_MINIMO_VALOR && totalValue < configs.PEDIDO_MINIMO_VALOR) {
      validationErrors.push(
        `Valor mínimo: R$ ${configs.PEDIDO_MINIMO_VALOR} (atual: R$ ${totalValue.toFixed(2)})`
      );
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Prosseguir com criação do pedido
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({ customerId, items }),
      });
      
      if (response.ok) {
        toast({ title: 'Pedido criado com sucesso!' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao criar pedido' });
    }
  };

  return (
    <div className="space-y-4">
      {errors.length > 0 && (
        <Alert variant="destructive">
          <div className="space-y-2">
            {errors.map(error => (
              <p key={error}>{error}</p>
            ))}
          </div>
        </Alert>
      )}
      <Button 
        onClick={handleCreate}
        disabled={errors.length > 0}
      >
        Criar Pedido
      </Button>
    </div>
  );
}
*/

// ============================================
// EXEMPLO 2: INFORMAR LIMITE DE DESCONTO
// ============================================

/*
import { useConfig } from '@/hooks/use-system-config';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

function DiscountInput() {
  const [discount, setDiscount] = useState<number>(0);
  const maxDiscount = useConfig('DESCONTO_MAXIMO_VENDEDOR');
  const isInvalid = discount > (maxDiscount || 0);

  return (
    <div className="space-y-2">
      <label>Desconto (%)</label>
      <Input
        type="number"
        value={discount}
        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
        className={isInvalid ? 'border-red-500' : ''}
      />
      {maxDiscount && (
        <Alert variant={isInvalid ? 'destructive' : 'default'}>
          Desconto máximo permitido: {maxDiscount}%
        </Alert>
      )}
    </div>
  );
}
*/

// ============================================
// EXEMPLO 3: ALERTA DE BAIXO ESTOQUE
// ============================================

/*
import { useConfig } from '@/hooks/use-system-config';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface StockWarningProps {
  productId: string;
  currentStock: number;
}

function StockWarning({ productId, currentStock }: StockWarningProps) {
  const minAlertLevel = useConfig('ESTOQUE_MINIMO_ALERTA');

  if (!minAlertLevel || currentStock >= minAlertLevel) {
    return null;
  }

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        Estoque baixo: {currentStock} kg (mínimo: {minAlertLevel} kg)
      </AlertDescription>
    </Alert>
  );
}
*/

// ============================================
// EXEMPLO 4: BLOQUEIO AUTOMÁTICO POR STATUS
// ============================================

/*
import { useConfig } from '@/hooks/use-system-config';

interface OrderActionProps {
  customerId: string;
  customerIsinadimplente: boolean;
  onSubmit: () => void;
}

function OrderAction({ customerId, customerIsinadimplente, onSubmit }: OrderActionProps) {
  const blockInadimplent = useConfig('BLOQUEAR_PEDIDO_CLIENTE_INADIMPLENTE');
  
  const isBlocked = blockInadimplent && customerIsinadimplente;

  return (
    <div className="space-y-4">
      {isBlocked && (
        <Alert variant="destructive">
          Este cliente tem problemas de pagamento pendentes e não pode fazer pedidos.
        </Alert>
      )}
      <Button 
        onClick={onSubmit}
        disabled={isBlocked}
      >
        {isBlocked ? 'Cliente Bloqueado' : 'Proceder com Pedido'}
      </Button>
    </div>
  );
}
*/

// ============================================
// EXEMPLO 5: AGRUPAMENTO AUTOMÁTICO DE ROTAS
// ============================================

/*
import { useConfig } from '@/hooks/use-system-config';

interface RouteGroupingProps {
  orders: any[];
}

async function groupOrdersByRoute(orders: any[]): Promise<any[][]> {
  // Buscar configuração
  const response = await fetch('/api/system-config');
  const configs = await response.json();

  if (!configs.AGRUPAR_PEDIDOS_AUTOMATICAMENTE) {
    return [orders]; // Retorna todos em um grupo
  }

  const maxDistance = configs.DISTANCIA_MAXIMA_ROTA || 100;

  // Lógica de agrupamento por distância
  const grouped: any[][] = [];
  let currentGroup: any[] = [];
  let currentDistance = 0;

  orders.forEach(order => {
    const orderDistance = calculateDistance(order.city);
    
    if (currentDistance + orderDistance > maxDistance && currentGroup.length > 0) {
      grouped.push(currentGroup);
      currentGroup = [];
      currentDistance = 0;
    }

    currentGroup.push(order);
    currentDistance += orderDistance;
  });

  if (currentGroup.length > 0) {
    grouped.push(currentGroup);
  }

  return grouped;
}

function calculateDistance(city: string): number {
  // Implementar cálculo real de distância
  return Math.random() * 50;
}
*/

// ============================================
// EXEMPLO 6: PAINEL DE PRODUÇÃO COM CONFIG
// ============================================

/*
import { useSystemConfig } from '@/hooks/use-system-config';

function ProductionDashboard() {
  const configs = useSystemConfig();

  if (!configs) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Status da Produção</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Produção</p>
              <p className="text-2xl font-bold">
                {configs.PRODUCAO_ATIVA ? '✅ Ativa' : '❌ Inativa'}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Tempo Padrão</p>
              <p className="text-2xl font-bold">
                {configs.TEMPO_PRODUCAO_PADRAO}h
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Lote Mínimo</p>
              <p className="text-2xl font-bold">
                {configs.LOTE_MINIMO_PRODUCAO}kg
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Produção Antecipada</p>
              <p className="text-2xl font-bold">
                {configs.PERMITIR_PRODUCAO_SEM_PEDIDO ? '✅ Sim' : '❌ Não'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
*/

// ============================================
// EXEMPLO 7: VALIDAÇÃO COMPLEXA COM MÚLTIPLAS REGRAS
// ============================================

/*
async function validateOrderCompleto(order: {
  weight: number;
  value: number;
  customerId: string;
  customerStatus: string;
}): Promise<{ valid: boolean; messages: string[] }> {
  const response = await fetch('/api/system-config');
  const config = await response.json();

  const messages: string[] = [];

  // Validações
  if (order.weight < config.PEDIDO_MINIMO_KG) {
    messages.push(`❌ Peso: ${order.weight} kg < Mínimo: ${config.PEDIDO_MINIMO_KG} kg`);
  }

  if (order.value < config.PEDIDO_MINIMO_VALOR) {
    messages.push(`❌ Valor: R$ ${order.value} < Mínimo: R$ ${config.PEDIDO_MINIMO_VALOR}`);
  }

  if (config.BLOQUEAR_PEDIDO_CLIENTE_INADIMPLENTE && order.customerStatus === 'inadimplente') {
    messages.push('❌ Cliente com problemas de pagamento');
  }

  if (config.BLOQUEAR_PEDIDO_SEM_ESTOQUE && !temEstoqueDisponivel(order)) {
    messages.push('❌ Sem estoque disponível para este pedido');
  }

  return {
    valid: messages.length === 0,
    messages,
  };
}
*/

// ============================================
// EXEMPLO 8: INTEGRAÇÃO COM API DE CRIAÇÃO
// ============================================

/*
// POST /api/orders
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Buscar configurações
    const configsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/system-config`);
    const configs = await configsResponse.json();

    // Validar pedido contra regras
    if (configs.PEDIDO_MINIMO_KG && body.totalWeight < configs.PEDIDO_MINIMO_KG) {
      return NextResponse.json(
        { error: `Peso mínimo: ${configs.PEDIDO_MINIMO_KG} kg` },
        { status: 400 }
      );
    }

    if (configs.PEDIDO_MINIMO_VALOR && body.totalValue < configs.PEDIDO_MINIMO_VALOR) {
      return NextResponse.json(
        { error: `Valor mínimo: R$ ${configs.PEDIDO_MINIMO_VALOR}` },
        { status: 400 }
      );
    }

    // Criar pedido...
    const order = await prisma.order.create({
      data: {
        customerId: body.customerId,
        totalWeight: body.totalWeight,
        totalValue: body.totalValue,
        // ... outros campos
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao criar pedido' },
      { status: 500 }
    );
  }
}
*/

export {};
