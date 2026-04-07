/**
 * Tipos de autenticação
 */

import { UserRole } from './constants';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: AuthUser & {
    id: string;
    role: UserRole;
    active: boolean;
  };
  expires: string;
}

export interface JWTToken {
  sub?: string;
  name?: string;
  email?: string;
  picture?: string;
  iat?: number;
  exp?: number;
  jti?: string;
  id?: string;
  role?: UserRole;
  active?: boolean;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: AuthUser;
  error?: string;
}

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}
