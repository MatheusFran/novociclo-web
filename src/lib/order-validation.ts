/**
 * Exemplo de como usar as configurações de regras de negócio
 * em um validador de pedidos
 */

import { useConfig } from '@/hooks/use-system-config';

interface Order {
  totalWeight: number;
  totalValue: number;
  customerId: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Hook para validar um pedido de acordo com as regras de negócio
 */
export function useOrderValidation(order: Order): ValidationResult {
  const pedidoMinimoKg = useConfig('PEDIDO_MINIMO_KG');
  const pedidoMinimoValor = useConfig('PEDIDO_MINIMO_VALOR');
  const bloquearSemEstoque = useConfig('BLOQUEAR_PEDIDO_SEM_ESTOQUE');
  const bloquearInadimplente = useConfig('BLOQUEAR_PEDIDO_CLIENTE_INADIMPLENTE');

  const errors: string[] = [];

  // Validação: Peso mínimo
  if (pedidoMinimoKg && order.totalWeight < pedidoMinimoKg) {
    errors.push(`Peso mínimo do pedido: ${pedidoMinimoKg} kg`);
  }

  // Validação: Valor mínimo
  if (pedidoMinimoValor && order.totalValue < pedidoMinimoValor) {
    errors.push(`Valor mínimo do pedido: R$ ${pedidoMinimoValor}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Exemplo de validação síncrona em um componente
 */
export async function validateOrderRules(order: Order): Promise<ValidationResult> {
  try {
    const response = await fetch('/api/system-config');
    const configs = await response.json();

    const errors: string[] = [];

    // Validar peso mínimo
    if (configs.PEDIDO_MINIMO_KG && order.totalWeight < configs.PEDIDO_MINIMO_KG) {
      errors.push(`Peso mínimo: ${configs.PEDIDO_MINIMO_KG} kg (atual: ${order.totalWeight} kg)`);
    }

    // Validar valor mínimo
    if (configs.PEDIDO_MINIMO_VALOR && order.totalValue < configs.PEDIDO_MINIMO_VALOR) {
      errors.push(`Valor mínimo: R$ ${configs.PEDIDO_MINIMO_VALOR} (atual: R$ ${order.totalValue})`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  } catch (error) {
    console.error('Erro ao validar regras de pedido:', error);
    return { isValid: true, errors: [] }; // Por padrão, permite se houver erro
  }
}

/**
 * Exemplo de uso em um componente de criação de pedido:
 * 
 * function CreateOrderComponent() {
 *   const [order, setOrder] = useState<Order>(...);
 *   const validation = useOrderValidation(order);
 *
 *   return (
 *     <div>
 *       {!validation.isValid && (
 *         <Alert variant="destructive">
 *           {validation.errors.map(err => <p key={err}>{err}</p>)}
 *         </Alert>
 *       )}
 *       <Button disabled={!validation.isValid}>Confirmar Pedido</Button>
 *     </div>
 *   );
 * }
 */
