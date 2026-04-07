/**
 * Validadores reutilizáveis para o sistema
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Valida email
 */
export function validateEmail(email: string): ValidationError | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { field: 'email', message: 'Email inválido' };
  }
  return null;
}

/**
 * Valida URL
 */
export function validateUrl(url: string): ValidationError | null {
  try {
    new URL(url);
    return null;
  } catch {
    return { field: 'url', message: 'URL inválida' };
  }
}

/**
 * Valida documento (CPF/CNPJ)
 */
export function validateDocument(doc: string): ValidationError | null {
  // Remove caracteres não numéricos
  const cleaned = doc.replace(/\D/g, '');

  // CPF: 11 dígitos
  if (cleaned.length === 11) {
    if (!/^\d{11}$/.test(cleaned)) {
      return { field: 'document', message: 'CPF inválido' };
    }
    // Validação de CPF básica
    if (cleaned === cleaned.charAt(0).repeat(11)) {
      return { field: 'document', message: 'CPF inválido' };
    }
    return null;
  }

  // CNPJ: 14 dígitos
  if (cleaned.length === 14) {
    if (!/^\d{14}$/.test(cleaned)) {
      return { field: 'document', message: 'CNPJ inválido' };
    }
    // Validação de CNPJ básica
    if (cleaned === cleaned.charAt(0).repeat(14)) {
      return { field: 'document', message: 'CNPJ inválido' };
    }
    return null;
  }

  return { field: 'document', message: 'Documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos' };
}

/**
 * Valida telefone
 */
export function validatePhone(phone: string): ValidationError | null {
  const cleaned = phone.replace(/\D/g, '');
  
  // Telefone brasileiro: 10 ou 11 dígitos
  if (!/^\d{10,11}$/.test(cleaned)) {
    return { field: 'phone', message: 'Telefone deve ter 10 ou 11 dígitos' };
  }
  
  return null;
}

/**
 * Valida CEP
 */
export function validateZipCode(zipCode: string): ValidationError | null {
  const cleaned = zipCode.replace(/\D/g, '');
  
  if (!/^\d{8}$/.test(cleaned)) {
    return { field: 'zipCode', message: 'CEP deve ter 8 dígitos' };
  }
  
  return null;
}

/**
 * Valida string não vazia
 */
export function validateRequired(value: string, fieldName: string = 'Campo'): ValidationError | null {
  if (!value || !value.trim()) {
    return { field: fieldName, message: `${fieldName} é obrigatório` };
  }
  return null;
}

/**
 * Valida comprimento de string
 */
export function validateLength(value: string, min?: number, max?: number, fieldName: string = 'Campo'): ValidationError | null {
  if (min && value.length < min) {
    return { field: fieldName, message: `${fieldName} deve ter no mínimo ${min} caracteres` };
  }
  
  if (max && value.length > max) {
    return { field: fieldName, message: `${fieldName} deve ter no máximo ${max} caracteres` };
  }
  
  return null;
}

/**
 * Valida número dentro de um intervalo
 */
export function validateRange(value: number, min?: number, max?: number, fieldName: string = 'Campo'): ValidationError | null {
  if (min !== undefined && value < min) {
    return { field: fieldName, message: `${fieldName} deve ser no mínimo ${min}` };
  }
  
  if (max !== undefined && value > max) {
    return { field: fieldName, message: `${fieldName} deve ser no máximo ${max}` };
  }
  
  return null;
}

/**
 * Valida data
 */
export function validateDate(date: string | Date): ValidationError | null {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    return { field: 'date', message: 'Data inválida' };
  }
  
  return null;
}

/**
 * Valida data futura
 */
export function validateFutureDate(date: string | Date): ValidationError | null {
  const dateError = validateDate(date);
  if (dateError) return dateError;
  
  const d = new Date(date);
  const now = new Date();
  
  if (d <= now) {
    return { field: 'date', message: 'Data deve ser no futuro' };
  }
  
  return null;
}

/**
 * Valida um objeto contra múltiplas regras
 */
export function validateObject<T extends Record<string, any>>(
  obj: T,
  rules: Record<keyof T, ValidationError | null>
): ValidationResult {
  const errors = Object.values(rules).filter(Boolean) as ValidationError[];
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Valida enderço
 */
export function validateAddress(address: {
  street?: string;
  number?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!address.street?.trim()) {
    errors.push({ field: 'street', message: 'Rua é obrigatória' });
  }

  if (!address.number?.trim()) {
    errors.push({ field: 'number', message: 'Número é obrigatório' });
  }

  if (!address.city?.trim()) {
    errors.push({ field: 'city', message: 'Cidade é obrigatória' });
  }

  if (!address.state?.trim()) {
    errors.push({ field: 'state', message: 'Estado é obrigatório' });
  }

  if (address.zipCode) {
    const zipError = validateZipCode(address.zipCode);
    if (zipError) errors.push(zipError);
  }

  return errors;
}

/**
 * Validador de cliente
 */
export function validateCustomer(customer: {
  name?: string;
  document?: string;
  email?: string;
  phone?: string;
  city?: string;
}): ValidationResult {
  const errors: ValidationError[] = [];

  if (!customer.name?.trim()) {
    errors.push({ field: 'name', message: 'Nome é obrigatório' });
  } else if (customer.name.length < 3) {
    errors.push({ field: 'name', message: 'Nome deve ter no mínimo 3 caracteres' });
  }

  if (customer.document) {
    const docError = validateDocument(customer.document);
    if (docError) errors.push(docError);
  }

  if (customer.email) {
    const emailError = validateEmail(customer.email);
    if (emailError) errors.push(emailError);
  }

  if (customer.phone) {
    const phoneError = validatePhone(customer.phone);
    if (phoneError) errors.push(phoneError);
  }

  if (!customer.city?.trim()) {
    errors.push({ field: 'city', message: 'Cidade é obrigatória' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validador de produto
 */
export function validateProduct(product: {
  id?: string;
  name?: string;
  price?: number;
  weight?: number;
  category?: string;
}): ValidationResult {
  const errors: ValidationError[] = [];

  if (!product.id?.trim()) {
    errors.push({ field: 'id', message: 'SKU é obrigatório' });
  }

  if (!product.name?.trim()) {
    errors.push({ field: 'name', message: 'Nome é obrigatório' });
  }

  if (product.price === undefined || product.price < 0) {
    errors.push({ field: 'price', message: 'Preço deve ser maior que 0' });
  }

  if (product.weight === undefined || product.weight < 0) {
    errors.push({ field: 'weight', message: 'Peso deve ser maior que 0' });
  }

  if (!product.category?.trim()) {
    errors.push({ field: 'category', message: 'Categoria é obrigatória' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
