/**
 * Handlers para API de Clientes
 */

import { NextRequest } from 'next/server';
import { requireAuth, requireAnyRole, auditLog } from '@/server/auth/utils';
import { prisma } from '@/server/prisma';
import { UserRole } from '@/server/auth';
import { jsonResponse, errorResponse } from '@/server/api/routes/handlers';

export async function GET(req: NextRequest) {
  const auth = await requireAuth('GET /api/v1/customers');
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    const city = url.searchParams.get('city');
    const search = url.searchParams.get('search')?.toLowerCase();

    const where: any = {};
    if (city) where.city = city;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { document: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { orders: { take: 3, orderBy: { createdAt: 'desc' } } },
      }),
      prisma.customer.count({ where }),
    ]);

    return jsonResponse({
      data: customers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return errorResponse('Erro ao buscar clientes', 500, error);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(UserRole.COMERCIAL, 'POST /api/v1/customers');
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  try {
    const body = await req.json();

    if (!body.name || !body.document) {
      return errorResponse('Name e document são obrigatórios', 400);
    }

    // Verifica duplicata
    const existing = await prisma.customer.findFirst({
      where: { document: body.document },
    });
    if (existing) {
      return errorResponse('Cliente com este documento já existe', 409);
    }

    const customer = await prisma.customer.create({
      data: {
        name: body.name,
        document: body.document,
        phone: body.phone,
        email: body.email,
        address: body.address,
        city: body.city,
      },
    });

    auditLog('CUSTOMER_CREATED', (auth.session?.user as any).id, {
      customerId: customer.id,
      name: customer.name,
      document: customer.document,
    });

    return jsonResponse(customer, 201);
  } catch (error) {
    return errorResponse('Erro ao criar cliente', 500, error);
  }
}

export async function PUT(req: NextRequest, params?: { id: string }) {
  const auth = await requireRole(UserRole.COMERCIAL, `PUT /api/v1/customers/${params?.id}`);
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  if (!params?.id) return errorResponse('ID é obrigatório', 400);

  try {
    const body = await req.json();
    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
    });
    if (!customer) return errorResponse('Cliente não encontrado', 404);

    const updated = await prisma.customer.update({
      where: { id: params.id },
      data: {
        name: body.name || customer.name,
        document: body.document || customer.document,
        phone: body.phone !== undefined ? body.phone : customer.phone,
        email: body.email !== undefined ? body.email : customer.email,
        address: body.address !== undefined ? body.address : customer.address,
        city: body.city !== undefined ? body.city : customer.city,
      },
    });

    auditLog('CUSTOMER_UPDATED', (auth.session?.user as any).id, {
      customerId: params.id,
      changes: body,
    });

    return jsonResponse(updated);
  } catch (error) {
    return errorResponse('Erro ao atualizar cliente', 500, error);
  }
}

export async function DELETE(req: NextRequest, params?: { id: string }) {
  const auth = await requireAnyRole(
    [UserRole.ADMIN],
    `DELETE /api/v1/customers/${params?.id}`
  );
  if (!auth.success) {Role(UserRole.ADMIN, `DELETE /api/v1/customers/${params?.id}`
  if (!params?.id) return errorResponse('ID é obrigatório', 400);

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
    });
    if (!customer) return errorResponse('Cliente não encontrado', 404);

    await prisma.customer.delete({
      where: { id: params.id },
    });

    auditLog('CUSTOMER_DELETED', (auth.session?.user as any).id, {
      customerId: params.id,
      name: customer.name,
    });

    return jsonResponse({ message: 'Cliente deletado com sucesso' });
  } catch (error) {
    return errorResponse('Erro ao deletar cliente', 500, error);
  }
}
