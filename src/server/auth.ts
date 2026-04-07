/**
 * Configuração centralizada de autenticação
 * Importa toda a estrutura modular do auth
 */

export { authOptions } from './auth/index';
export type { AuthUser, AuthSession, JWTToken, AuthCredentials, AuthResponse, PasswordValidationResult } from './auth/types';
export { UserRole, ROLE_PERMISSIONS, PUBLIC_ROUTES, PASSWORD_RULES, AUTH_ERRORS } from './auth/constants';
export {
  validatePassword,
  hashPassword,
  comparePassword,
  generateTemporaryPassword,
} from './auth/password';
export {
  validateSession,
  requireAuth,
  requireRole,
  requireAnyRole,
  requirePermission,
  apiSuccess,
  apiError,
  auditLog,
  validatePayload,
} from './auth/utils';