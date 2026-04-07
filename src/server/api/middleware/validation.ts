/**
 * Middleware de validação de entrada
 */

export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'email' | 'array';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export type ValidationSchema = Record<string, ValidationRule>;

/**
 * Valida um objeto contra um schema
 */
export function validate(data: any, schema: ValidationSchema): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const field in schema) {
    const rule = schema[field];
    const value = data[field];

    // Verifica se é obrigatório
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors[field] = `${field} é obrigatório`;
      continue;
    }

    // Se não é obrigatório e não tem valor, passa
    if (!rule.required && (value === undefined || value === null || value === '')) {
      continue;
    }

    // Valida tipo
    if (rule.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      
      if (rule.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors[field] = `${field} deve ser um email válido`;
          continue;
        }
      } else if (actualType !== rule.type) {
        errors[field] = `${field} deve ser do tipo ${rule.type}`;
        continue;
      }
    }

    // Valida string
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors[field] = `${field} deve ter no mínimo ${rule.minLength} caracteres`;
        continue;
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors[field] = `${field} deve ter no máximo ${rule.maxLength} caracteres`;
        continue;
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        errors[field] = `${field} tem formato inválido`;
        continue;
      }
    }

    // Valida número
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors[field] = `${field} deve ser no mínimo ${rule.min}`;
        continue;
      }
      if (rule.max !== undefined && value > rule.max) {
        errors[field] = `${field} deve ser no máximo ${rule.max}`;
        continue;
      }
    }

    // Validação customizada
    if (rule.custom) {
      const result = rule.custom(value);
      if (result !== true) {
        errors[field] = typeof result === 'string' ? result : `${field} é inválido`;
        continue;
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Middleware para validar body de requisição
 */
export async function withValidation(
  request: Request,
  schema: ValidationSchema,
  onError?: (errors: Record<string, string>) => Response
): Promise<{ valid: boolean; data?: any; error?: Response }> {
  try {
    const data = await request.json();
    const validation = validate(data, schema);

    if (!validation.valid) {
      const errorResponse = onError
        ? onError(validation.errors)
        : new Response(
            JSON.stringify({
              error: 'Validação falhou',
              details: validation.errors,
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          );

      return { valid: false, error: errorResponse };
    }

    return { valid: true, data };
  } catch (error) {
    const errorResponse = new Response(
      JSON.stringify({
        error: 'JSON inválido',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    return { valid: false, error: errorResponse };
  }
}
