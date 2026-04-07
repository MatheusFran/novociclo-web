/**
 * Constantes de autenticação e autorização
 */

export enum UserRole {
  ADMIN = 'ADMIN',
  COMERCIAL = 'COMERCIAL',
  PRODUCAO = 'PRODUCAO',
  LOGISTICA = 'LOGISTICA',
  FINANCEIRO = 'FINANCEIRO',
  RH = 'RH',
}

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.ADMIN]: [
    'users:read',
    'users:create',
    'users:update',
    'users:delete',
    'settings:read',
    'settings:write',
    'reports:read',
    'analytics:read',
  ],
  [UserRole.COMERCIAL]: [
    'orders:read',
    'orders:create',
    'orders:update',
    'customers:read',
    'customers:create',
    'products:read',
    'pricing:read',
  ],
  [UserRole.PRODUCAO]: [
    'orders:read',
    'orders:update',
    'products:read',
    'production:read',
    'production:write',
    'stock:read',
  ],
  [UserRole.LOGISTICA]: [
    'orders:read',
    'orders:update',
    'drivers:read',
    'drivers:write',
    'vehicles:read',
    'vehicles:write',
    'deliveries:read',
    'deliveries:write',
  ],
  [UserRole.FINANCEIRO]: [
    'orders:read',
    'customers:read',
    'payments:read',
    'payments:write',
    'reports:read',
    'invoices:read',
    'invoices:write',
  ],
  [UserRole.RH]: [
    'users:read',
    'users:update',
    'settings:read',
  ],
};

export const PUBLIC_ROUTES = [
  '/login',
  '/api/auth',
  '/api/auth/signin',
  '/api/auth/callback',
  '/api/auth/session',
  '/api/auth/signout',
];

export const PASSWORD_RULES = {
  MIN_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SPECIAL_CHARS: true,
};

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Email ou senha inválidos',
  USER_INACTIVE: 'Usuário inativo',
  USER_NOT_FOUND: 'Usuário não encontrado',
  PASSWORD_INVALID: 'Senha inválida',
  UNAUTHORIZED: 'Não autenticado',
  FORBIDDEN: 'Sem permissão',
  SESSION_EXPIRED: 'Sessão expirada',
  INVALID_TOKEN: 'Token inválido',
} as const;
