import { prisma } from '@/server/prisma';
import { OrderStatus } from '@/lib/types';

interface NotificationPayload {
  orderId: string;
  userId: string;
  oldStatus: OrderStatus;
  newStatus: OrderStatus;
  customerName?: string;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDENTE: 'Pendente',
  FINANCEIRO: 'Aprovação Financeira',
  PRODUCAO: 'Produção',
  PRONTO_LOGISTICA: 'Pronto para Logística',
  ENTREGA: 'Em Entrega',
  AGUARDANDO_FATURAMENTO: 'Aguardando Faturamento',
  FATURADO: 'Faturado',
  REJEITADO: 'Rejeitado',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

export async function createOrderStatusNotification(payload: NotificationPayload) {
  try {
    // Verificar preferências do usuário
    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId: payload.userId },
    });

    // Se não tiver preferências, criar com valores padrão
    if (!preferences) {
      await prisma.notificationPreference.create({
        data: {
          userId: payload.userId,
          orderStatusChanged: true,
          orderApprovedFinance: true,
          orderRejected: true,
          orderDelivered: true,
          orderInProduction: true,
          orderInDelivery: true,
        },
      });
    }

    // Determinar tipo de notificação baseado no status novo
    let notificationType = 'ORDER_STATUS_CHANGED';
    let shouldNotify = preferences?.orderStatusChanged ?? true;

    if (payload.newStatus === 'FINANCEIRO' && preferences?.orderApprovedFinance) {
      notificationType = 'ORDER_IN_PRODUCTION';
      shouldNotify = preferences.orderApprovedFinance;
    } else if (payload.newStatus === 'PRODUCAO' && preferences?.orderInProduction) {
      notificationType = 'ORDER_IN_PRODUCTION';
      shouldNotify = preferences.orderInProduction;
    } else if (payload.newStatus === 'ENTREGA' && preferences?.orderInDelivery) {
      notificationType = 'ORDER_IN_DELIVERY';
      shouldNotify = preferences.orderInDelivery;
    } else if (payload.newStatus === 'ENTREGUE' && preferences?.orderDelivered) {
      notificationType = 'ORDER_DELIVERED';
      shouldNotify = preferences.orderDelivered;
    } else if (payload.newStatus === 'REJEITADO' && preferences?.orderRejected) {
      notificationType = 'ORDER_REJECTED';
      shouldNotify = preferences.orderRejected;
    }

    // Criar notificação apenas se o usuário quiser ser notificado
    if (shouldNotify) {
      await prisma.notification.create({
        data: {
          userId: payload.userId,
          orderId: payload.orderId,
          type: notificationType as any,
          title: `Pedido ${payload.orderId} - ${STATUS_LABELS[payload.newStatus]}`,
          message: `O pedido de ${payload.customerName} mudou de "${STATUS_LABELS[payload.oldStatus]}" para "${STATUS_LABELS[payload.newStatus]}"`,
          data: {
            orderId: payload.orderId,
            oldStatus: payload.oldStatus,
            newStatus: payload.newStatus,
            customerName: payload.customerName,
          },
        },
      });
    }

    return true;
  } catch (error) {
    console.error('Error creating order status notification:', error);
    return false;
  }
}

export async function notifyOrderApprovedByFinance(orderId: string, userId: string, customerName?: string) {
  try {
    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (preferences?.orderApprovedFinance ?? true) {
      await prisma.notification.create({
        data: {
          userId,
          orderId,
          type: 'ORDER_APPROVED_FINANCE',
          title: `Pedido ${orderId} Aprovado Financeiramente`,
          message: `O pedido de ${customerName} foi aprovado pelo financeiro`,
          data: { orderId, customerName },
        },
      });
    }

    return true;
  } catch (error) {
    console.error('Error creating approved notification:', error);
    return false;
  }
}

export async function notifyOrderRejected(orderId: string, userId: string, reason?: string, rejectedBy?: string) {
  try {
    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (preferences?.orderRejected ?? true) {
      await prisma.notification.create({
        data: {
          userId,
          orderId,
          type: 'ORDER_REJECTED',
          title: `Pedido ${orderId} Rejeitado`,
          message: `O pedido foi rejeitado${reason ? `: ${reason}` : ''}`,
          data: { orderId, reason, rejectedBy },
        },
      });
    }

    return true;
  } catch (error) {
    console.error('Error creating rejection notification:', error);
    return false;
  }
}
