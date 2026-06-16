import { prisma } from '@/server/prisma';

interface AuditLogPayload {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(payload: AuditLogPayload) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        action: payload.action,
        resource: payload.resource,
        resourceId: payload.resourceId,
        details: payload.details ? JSON.stringify(payload.details) : null,
        ipAddress: payload.ipAddress,
        userAgent: payload.userAgent,
      },
    });

    return true;
  } catch (error) {
    console.error('Error creating audit log:', error);
    return false;
  }
}

export async function logLogin(userId: string, ipAddress?: string, userAgent?: string) {
  try {
    // Atualizar lastLogin do usuário
    await prisma.user.update({
      where: { id: userId },
      data: { lastLogin: new Date() },
    });

    // Criar log de login
    await createAuditLog({
      userId,
      action: 'LOGIN',
      resource: 'Auth',
      ipAddress,
      userAgent,
    });

    return true;
  } catch (error) {
    console.error('Error logging login:', error);
    return false;
  }
}

export async function logOrderAction(
  userId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT',
  orderId: string,
  details?: Record<string, any>
) {
  return createAuditLog({
    userId,
    action: `${action}_ORDER`,
    resource: 'Order',
    resourceId: orderId,
    details,
  });
}

export async function logUserAction(
  userId: string,
  action: string,
  details?: Record<string, any>
) {
  return createAuditLog({
    userId,
    action,
    resource: 'User',
    details,
  });
}

export async function getAuditLogs(
  filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    skip?: number;
  }
) {
  try {
    const where: any = {};

    if (filters?.userId) where.userId = filters.userId;
    if (filters?.action) where.action = filters.action;
    if (filters?.resource) where.resource = filters.resource;

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters?.startDate) where.createdAt.gte = filters.startDate;
      if (filters?.endDate) where.createdAt.lte = filters.endDate;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100,
      skip: filters?.skip || 0,
    });

    const total = await prisma.auditLog.count({ where });

    return { logs, total };
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return { logs: [], total: 0 };
  }
}

export async function getUserLoginHistory(userId: string, limit = 10) {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        userId,
        action: 'LOGIN',
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs;
  } catch (error) {
    console.error('Error fetching login history:', error);
    return [];
  }
}
