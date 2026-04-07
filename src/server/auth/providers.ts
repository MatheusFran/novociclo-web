/**
 * Providers de autenticação
 */

import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '../prisma';
import { comparePassword } from './password';
import { AUTH_ERRORS } from './constants';

export const credentialsProvider = CredentialsProvider({
  name: 'credentials',
  credentials: {
    email: { label: 'Email', type: 'email', placeholder: 'seu@email.com' },
    password: { label: 'Senha', type: 'password' },
  },
  async authorize(credentials, req) {
    try {
      if (!credentials?.email || !credentials?.password) {
        throw new Error(AUTH_ERRORS.INVALID_CREDENTIALS);
      }

      // Busca o usuário no banco de dados
      const user = await prisma.user.findUnique({
        where: { email: credentials.email },
        select: {
          id: true,
          email: true,
          name: true,
          password: true,
          role: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new Error(AUTH_ERRORS.INVALID_CREDENTIALS);
      }

      // Verifica se o usuário está ativo
      if (!user.active) {
        throw new Error(AUTH_ERRORS.USER_INACTIVE);
      }

      // Valida a senha
      const isPasswordValid = await comparePassword(credentials.password, user.password);
      if (!isPasswordValid) {
        throw new Error(AUTH_ERRORS.INVALID_CREDENTIALS);
      }

      // Log de sucesso
      console.log(`[AUTH] Login bem-sucedido para ${user.email}`);

      // Retorna o usuário autenticado
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        active: user.active,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : AUTH_ERRORS.INVALID_CREDENTIALS;
      console.error(`[AUTH] Erro de autenticação:`, message);
      throw new Error(message);
    }
  },
});
