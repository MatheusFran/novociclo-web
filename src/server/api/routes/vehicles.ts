/**
 * Handlers para API de Veículos
 */

import { NextRequest } from 'next/server';
import { requireRole, auditLog } from '@/server/auth/utils';
import { prisma } from '@/server/prisma';
import { UserRole } from '@/server/auth';
import { jsonResponse, errorResponse } from '@/server/api/routes/handlers';

export async function GET(req: NextRequest) {
  const auth = await requireRole(UserRole.LOGISTICA, 'GET /api/v1/vehicles');
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    const status = url.searchParams.get('status');

    const where: any = {};
    if (status && status !== 'ALL') where.status = status;

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          driver: true,
          orders: { take: 3, orderBy: { deliveryDate: 'desc' } },
        },
      }),
      prisma.vehicle.count({ where }),
    ]);

    return jsonResponse({
      data: vehicles,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return errorResponse('Erro ao buscar veículos', 500, error);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(UserRole.LOGISTICA, 'POST /api/v1/vehicles');
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  try {
    const body = await req.json();

    if (!body.plate || !body.model) {
      return errorResponse('plate e model são obrigatórios', 400);
    }

    // Verifica duplicata
    const existing = await prisma.vehicle.findUnique({
      where: { plate: body.plate.toUpperCase() },
    });
    if (existing) {
      return errorResponse('Veículo com esta placa já existe', 409);
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        id: body.id || `VH-${Date.now()}`,
        plate: body.plate.toUpperCase(),
        model: body.model,
        year: parseInt(body.year) || new Date().getFullYear(),
        capacity: parseFloat(body.capacity) || 0,
        driverId: body.driverId,
        status: body.status || 'DISPONIVEL',
        lastMaintenance: body.lastMaintenance ? new Date(body.lastMaintenance) : null,
      },
      include: { driver: true },
    });

    auditLog('VEHICLE_CREATED', (auth.session?.user as any).id, {
      vehicleId: vehicle.id,
      plate: vehicle.plate,
      model: vehicle.model,
    });

    return jsonResponse(vehicle, 201);
  } catch (error) {
    return errorResponse('Erro ao criar veículo', 500, error);
  }
}

export async function PUT(req: NextRequest, params?: { id: string }) {
  const auth = await requireRole(UserRole.LOGISTICA, `PUT /api/v1/vehicles/${params?.id}`);
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  if (!params?.id) return errorResponse('ID é obrigatório', 400);

  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
    });
    if (!vehicle) return errorResponse('Veículo não encontrado', 404);

    const body = await req.json();

    const updated = await prisma.vehicle.update({
      where: { id: params.id },
      data: {
        plate: body.plate ? body.plate.toUpperCase() : vehicle.plate,
        model: body.model || vehicle.model,
        year: body.year !== undefined ? parseInt(body.year) : vehicle.year,
        capacity: body.capacity !== undefined ? parseFloat(body.capacity) : vehicle.capacity,
        driverId: body.driverId !== undefined ? body.driverId : vehicle.driverId,
        status: body.status || vehicle.status,
        lastMaintenance: body.lastMaintenance ? new Date(body.lastMaintenance) : vehicle.lastMaintenance,
      },
      include: { driver: true },
    });

    auditLog('VEHICLE_UPDATED', (auth.session?.user as any).id, {
      vehicleId: params.id,
      changes: body,
    });

    return jsonResponse(updated);
  } catch (error) {
    return errorResponse('Erro ao atualizar veículo', 500, error);
  }
}

export async function DELETE(req: NextRequest, params?: { id: string }) {
  const auth = await requireRole(UserRole.ADMIN, `DELETE /api/v1/vehicles/${params?.id}`);
  if (!auth.success) {
    return errorResponse(auth.body.error, auth.status);
  }

  if (!params?.id) return errorResponse('ID é obrigatório', 400);

  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
    });
    if (!vehicle) return errorResponse('Veículo não encontrado', 404);

    await prisma.vehicle.delete({
      where: { id: params.id },
    });

    auditLog('VEHICLE_DELETED', (auth.session?.user as any).id, {
      vehicleId: params.id,
      plate: vehicle.plate,
    });

    return jsonResponse({ message: 'Veículo deletado com sucesso' });
  } catch (error) {
    return errorResponse('Erro ao deletar veículo', 500, error);
  }
}
