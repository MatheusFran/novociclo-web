import { useEffect, useState } from 'react';

/**
 * Hook para acessar configurações de regras de negócio do sistema
 * 
 * @example
 * const configs = useSystemConfig();
 * console.log(configs.PEDIDO_MINIMO_KG); // 10
 * 
 * // Com um valor específico
 * const [pedidoMinimo, isLoading, error] = useSystemConfig('PEDIDO_MINIMO_KG');
 */

export function useSystemConfig(key?: string) {
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/system-config');
        if (!response.ok) throw new Error('Falha ao carregar configurações');
        const configs = await response.json();
        setData(configs);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Erro desconhecido'));
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchConfigs();
  }, []);

  if (key) {
    // Retornar valor específico
    return [data?.[key], loading, error] as const;
  }

  // Retornar todos os valores
  return data;
}

/**
 * Hook para acessar uma configuração específica de forma síncrona
 * Requer que useSystemConfig já tenha sido chamado em algum lugar
 */
export function useConfig(key: string): any {
  const [value, setvalue] = useState<any>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/system-config');
        const configs = await response.json();
        setvalue(configs[key]);
      } catch (error) {
        console.error(`Erro ao carregar configuração ${key}:`, error);
      }
    };

    fetchConfig();
  }, [key]);

  return value;
}
