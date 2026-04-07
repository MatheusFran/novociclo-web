/**
 * Utilitários de validação e hash de senhas
 */

import bcrypt from 'bcryptjs';
import { PASSWORD_RULES } from './constants';
import { PasswordValidationResult } from './types';

/**
 * Valida uma senha contra as regras de segurança
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < PASSWORD_RULES.MIN_LENGTH) {
    errors.push(`Mínimo de ${PASSWORD_RULES.MIN_LENGTH} caracteres`);
  }

  if (PASSWORD_RULES.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('Deve conter pelo menos uma letra maiúscula');
  }

  if (PASSWORD_RULES.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('Deve conter pelo menos uma letra minúscula');
  }

  if (PASSWORD_RULES.REQUIRE_NUMBERS && !/[0-9]/.test(password)) {
    errors.push('Deve conter pelo menos um número');
  }

  if (PASSWORD_RULES.REQUIRE_SPECIAL_CHARS && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Deve conter pelo menos um caractere especial');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Cria um hash da senha
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compara uma senha com seu hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Gera uma senha temporária aleatória
 */
export function generateTemporaryPassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}';

  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  const all = uppercase + lowercase + numbers + special;
  for (let i = password.length; i < 12; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  return password.split('').sort(() => Math.random() - 0.5).join('');
}
