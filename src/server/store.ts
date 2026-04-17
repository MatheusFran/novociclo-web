'use client';

import { useState, useEffect, useCallback } from 'react';
import { Order, Product, OrderStatus, ProductionStage, Vehicle, Driver, Member, Activity, Customer, PriceTable, DeliverySchedule, SalesGoal } from '../lib/types';
import { add } from 'date-fns';

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const method = options?.method ?? 'GET';
  let res: Response;

  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (err) {
    console.error(`[API FETCH] ${method} ${url} - network error`, err);
    throw new Error(`[API FETCH] ${method} ${url} - ${(err as Error)?.message ?? 'Network error'}`);
  }

  if (!res.ok) {
    const text = await res.text();
    let payload: any = text;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { error: text || 'Unknown error' };
    }
    console.error(`[API FETCH] ${method} ${url} - ${res.status} ${res.statusText}`, payload);
    
    // Se houver uma razão específica (ex: dependências), passe-a junto com o status
    const error = new Error(`[API ${method} ${url}] ${res.status} ${res.statusText} - ${payload.reason || (payload.error ?? JSON.stringify(payload))}`);
    (error as any).status = res.status;
    (error as any).payload = payload;
    throw error;
  }

  try {
    if (res.status === 204) return undefined as T;
    return await res.json();
  } catch (err) {
    console.error(`[API PARSE] ${method} ${url} - invalid JSON`, err);
    throw new Error(`[API PARSE] ${method} ${url} - invalid JSON response`);
  }
}

export function useSystemData() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [priceTables, setPriceTables] = useState<PriceTable[]>([]);
  const [deliverySchedules, setDeliverySchedules] = useState<DeliverySchedule[]>([]);
  const [salesGoals, setSalesGoals] = useState<SalesGoal[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([
      api<Order[]>('/api/orders'),
      api<Product[]>('/api/products'),
      api<Vehicle[]>('/api/vehicles'),
      api<Driver[]>('/api/drivers'),
      api<Member[]>('/api/members'),
      api<Customer[]>('/api/customers'),
      api<Activity[]>('/api/activities'),
      api<PriceTable[]>('/api/price-tables'),
      api<DeliverySchedule[]>('/api/delivery-schedules'),
      api<SalesGoal[]>('/api/sales-goals'),
    ]).then((results) => {
      const getValue = <T,>(result: PromiseSettledResult<T>, fallback: T) => result.status === 'fulfilled' ? result.value : fallback;
      const [ordersResult, productsResult, vehiclesResult, driversResult, membersResult, customersResult, activitiesResult, priceTablesResult, deliverySchedulesResult, salesGoalsResult] = results;

      setOrders(getValue<Order[]>(ordersResult, []));
      setProducts(getValue<Product[]>(productsResult, []));
      setVehicles(getValue<Vehicle[]>(vehiclesResult, []));
      setDrivers(getValue<Driver[]>(driversResult, []));
      setMembers(getValue<Member[]>(membersResult, []));
      setCustomers(getValue<Customer[]>(customersResult, []));
      setActivities(getValue<Activity[]>(activitiesResult, []));
      setPriceTables(getValue<PriceTable[]>(priceTablesResult, []));
      setDeliverySchedules(getValue<DeliverySchedule[]>(deliverySchedulesResult, []));
      setSalesGoals(getValue<SalesGoal[]>(salesGoalsResult, []));

      const rejected = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
      if (rejected.length > 0) {
        const message = rejected.map((result, index) => `Erro ${index + 1}: ${result.reason?.toString() ?? 'Unknown error'}`).join(' | ');
        console.error('Erro ao carregar dados do dashboard:', message);
        setHasError(true);
        setError(message);
      }
      setIsReady(true);
    }).catch((fetchError) => {
      console.error('Erro inesperado ao carregar dados do dashboard:', fetchError);
      setHasError(true);
      setError(fetchError?.toString() ?? 'Erro desconhecido');
      setIsReady(true);
    });
  }, []);

  const updateOrderStatus = useCallback(async (id: string, status: OrderStatus, extra?: Partial<Order>) => {
    const updated = await api<Order>(`/api/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, ...extra }),
    });
    setOrders(prev => prev.map(o => o.id === id ? updated : o));
    return updated;
  }, []);

  const updateProductionStage = useCallback(async (orderId: string, stage: ProductionStage) => {
    const updated = await api<Order>(`/api/orders/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ productionStage: stage }),
    });
    setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
    return updated;
  }, []);

  const addOrder = useCallback(async (order: Order) => {
    const created = await api<Order>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    });
    setOrders(prev => [created, ...prev]);
    return created;
  }, []);

  const updateOrder = useCallback(async (id: string, updates: Partial<Order>) => {
    const updated = await api<Order>(`/api/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    setOrders(prev => prev.map(o => o.id === id ? updated : o));
    return updated;
  }, []);

  const addMember = useCallback(async (member: Omit<Member, 'id' | 'createdAt' | 'updatedAt'>) => {
    const created = await api<Member>('/api/members', {
      method: 'POST',
      body: JSON.stringify(member),
    });
    setMembers(prev => [...prev, created]);
    return created;
  }, []);

  const updateMember = useCallback(async (id: string, updates: Partial<Member>) => {
    const updated = await api<Member>(`/api/members/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    setMembers(prev => prev.map(m => m.id === id ? updated : m));
    return updated;
  }, []);

  const deleteMember = useCallback(async (id: string) => {
    await api(`/api/members/${id}`, {
      method: 'DELETE',
    });
    setMembers(prev => prev.filter(m => m.id !== id));
  }, []);
  const addProduct = useCallback(async (product: Product) => {
    const created = await api<Product>('/api/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
    setProducts(prev => [...prev, created]);
    return created;
  }, []);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    const updated = await api<Product>(`/api/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });

    setProducts(prev => prev.map(p => p.id === id ? updated : p));
    return updated;
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    await api(`/api/products/${id}`, {
      method: 'DELETE',
    });

    setProducts(prev => prev.filter(p => p.id !== id));
  }, []);

  const assignShipment = useCallback(async (orderId: string, vehicleId: string, driverId: string) => {
    const updated = await api<Order>(`/api/orders/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'ENTREGA', assignedVehicleId: vehicleId, assignedDriverId: driverId, departureTime: new Date().toISOString() }),
    });
    setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
    const updatedVehicle = await api<Vehicle>(`/api/vehicles/${vehicleId}`, { method: 'PATCH', body: JSON.stringify({ status: 'EM_ROTA' }) });
    const updatedDriver = await api<Driver>(`/api/drivers/${driverId}`, { method: 'PATCH', body: JSON.stringify({ status: 'EM_ROTA' }) });
    setVehicles(prev => prev.map(v => v.id === vehicleId ? updatedVehicle : v));
    setDrivers(prev => prev.map(d => d.id === driverId ? updatedDriver : d));
    return updated;
  }, []);

  const confirmDelivery = useCallback(async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    const updated = await api<Order>(`/api/orders/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'FATURADO', deliveredAt: new Date().toISOString() }),
    });
    setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
    if (order?.assignedVehicleId) {
      const updatedVehicle = await api<Vehicle>(`/api/vehicles/${order.assignedVehicleId}`, { method: 'PATCH', body: JSON.stringify({ status: 'DISPONIVEL' }) });
      setVehicles(prev => prev.map(v => v.id === order.assignedVehicleId ? updatedVehicle : v));
    }
    if (order?.assignedDriverId) {
      const updatedDriver = await api<Driver>(`/api/drivers/${order.assignedDriverId}`, { method: 'PATCH', body: JSON.stringify({ status: 'DISPONIVEL' }) });
      setDrivers(prev => prev.map(d => d.id === order.assignedDriverId ? updatedDriver : d));
    }
    return updated;
  }, [orders]);

  const deleteOrder = useCallback(async (orderId: string) => {
    await api(`/api/orders/${orderId}`, { method: 'DELETE' });
    setOrders(prev => prev.filter(o => o.id !== orderId));
  }, []);

  const addVehicle = useCallback(async (vehicle: Vehicle) => {
    const created = await api<Vehicle>('/api/vehicles', { method: 'POST', body: JSON.stringify(vehicle) });
    setVehicles(prev => [...prev, created]);
    return created;
  }, []);

  const updateVehicle = useCallback(async (id: string, updates: Partial<Vehicle>) => {
    const updated = await api<Vehicle>(`/api/vehicles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    setVehicles(prev => prev.map(v => v.id === id ? updated : v));
    return updated;
  }, []);

  const deleteVehicle = useCallback(async (id: string) => {
    await api(`/api/vehicles/${id}`, { method: 'DELETE' });
    setVehicles(prev => prev.filter(v => v.id !== id));
  }, []);

  const addDriver = useCallback(async (driver: Driver) => {
    const created = await api<Driver>('/api/drivers', { method: 'POST', body: JSON.stringify(driver) });
    setDrivers(prev => [...prev, created]);
    return created;
  }, []);

  const updateDriver = useCallback(async (id: string, updates: Partial<Driver>) => {
    const updated = await api<Driver>(`/api/drivers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    setDrivers(prev => prev.map(d => d.id === id ? updated : d));
    return updated;
  }, []);

  const deleteDriver = useCallback(async (id: string) => {
    await api(`/api/drivers/${id}`, { method: 'DELETE' });
    setDrivers(prev => prev.filter(d => d.id !== id));
  }, []);

  const addCustomer = useCallback(async (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    console.log('Customer:', customer);
    const created = await api<Customer>('/api/customers', { method: 'POST', body: JSON.stringify(customer) });
    setCustomers(prev => [...prev, created]);
    return created;
  }, []);

  const updateCustomer = useCallback(async (id: string, updates: Partial<Customer>) => {
    const updated = await api<Customer>(`/api/customers/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
    setCustomers(prev => prev.map(c => c.id === id ? updated : c));
    return updated;
  }, []);

  const deleteCustomer = useCallback(async (id: string) => {
    await api(`/api/customers/${id}`, { method: 'DELETE' });
    setCustomers(prev => prev.filter(c => c.id !== id));
  }, []);

  const addActivity = useCallback(async (activity: Omit<Activity, 'id'>) => {
    const created = await api<Activity>('/api/activities', { method: 'POST', body: JSON.stringify(activity) });
    setActivities(prev => [...prev, created]);
    return created;
  }, []);

  const updateActivity = useCallback(async (id: string, updates: Partial<Activity>) => {
    const updated = await api<Activity>(`/api/activities/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
    setActivities(prev => prev.map(a => a.id === id ? updated : a));
    return updated;
  }, []);

  const deleteActivity = useCallback(async (id: string) => {
    await api(`/api/activities/${id}`, { method: 'DELETE' });
    setActivities(prev => prev.filter(a => a.id !== id));
  }, []);

  const addPriceTable = useCallback(async (table: PriceTable) => {
    const created = await api<PriceTable>('/api/price-tables', { method: 'POST', body: JSON.stringify(table) });
    setPriceTables(prev => [...prev, created]);
    return created;
  }, []);

  const updatePriceTable = useCallback(async (id: string, updates: Partial<PriceTable>) => {
    const updated = await api<PriceTable>(`/api/price-tables/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
    setPriceTables(prev => prev.map(t => t.id === id ? updated : t));
    return updated;
  }, []);

  const deletePriceTable = useCallback(async (id: string) => {
    await api(`/api/price-tables/${id}`, { method: 'DELETE' });
    setPriceTables(prev => prev.filter(t => t.id !== id));
  }, []);

  const createDeliverySchedule = useCallback(async (schedule: Omit<DeliverySchedule, 'id' | 'createdAt'>) => {
    const created = await api<DeliverySchedule>('/api/delivery-schedules', { method: 'POST', body: JSON.stringify(schedule) });
    setDeliverySchedules(prev => [...prev, created]);
    return created.id;
  }, []);

  const updateDeliverySchedule = useCallback(async (scheduleId: string, updates: Partial<DeliverySchedule>) => {
    const updated = await api<DeliverySchedule>(`/api/delivery-schedules/${scheduleId}`, { method: 'PATCH', body: JSON.stringify(updates) });
    setDeliverySchedules(prev => prev.map(s => s.id === scheduleId ? updated : s));
    return updated;
  }, []);

  const deleteDeliverySchedule = useCallback(async (scheduleId: string) => {
    await api(`/api/delivery-schedules/${scheduleId}`, { method: 'DELETE' });
    setDeliverySchedules(prev => prev.filter(s => s.id !== scheduleId));
  }, []);

  const startDeliverySchedule = useCallback(async (scheduleId: string) => {
    const schedule = deliverySchedules.find(s => s.id === scheduleId);
    if (!schedule) return;
    await updateDeliverySchedule(scheduleId, { status: 'EM_ANDAMENTO' });
    for (const orderId of schedule.orders) {
      await updateOrderStatus(orderId, 'ENTREGA', { departureTime: new Date().toISOString() });
    }
    const updatedVehicle = await api<Vehicle>(`/api/vehicles/${schedule.vehicleId}`, { method: 'PATCH', body: JSON.stringify({ status: 'EM_ROTA' }) });
    const updatedDriver = await api<Driver>(`/api/drivers/${schedule.driverId}`, { method: 'PATCH', body: JSON.stringify({ status: 'EM_VIAGEM' }) });
    setVehicles(prev => prev.map(v => v.id === schedule.vehicleId ? updatedVehicle : v));
    setDrivers(prev => prev.map(d => d.id === schedule.driverId ? updatedDriver : d));
  }, [deliverySchedules, updateDeliverySchedule, updateOrderStatus]);

  const completeDeliverySchedule = useCallback(async (scheduleId: string) => {
    const schedule = deliverySchedules.find(s => s.id === scheduleId);
    if (!schedule) return;
    await updateDeliverySchedule(scheduleId, { status: 'CONCLUIDO' });
    for (const orderId of schedule.orders) {
      await updateOrderStatus(orderId, 'FATURADO', { deliveredAt: new Date().toISOString() });
    }
    const updatedVehicle = await api<Vehicle>(`/api/vehicles/${schedule.vehicleId}`, { method: 'PATCH', body: JSON.stringify({ status: 'DISPONIVEL' }) });
    const updatedDriver = await api<Driver>(`/api/drivers/${schedule.driverId}`, { method: 'PATCH', body: JSON.stringify({ status: 'DISPONIVEL' }) });
    setVehicles(prev => prev.map(v => v.id === schedule.vehicleId ? updatedVehicle : v));
    setDrivers(prev => prev.map(d => d.id === schedule.driverId ? updatedDriver : d));
  }, [deliverySchedules, updateDeliverySchedule, updateOrderStatus]);

  return {
    orders, products, vehicles, drivers, customers,
    activities, priceTables, deliverySchedules, members, salesGoals, isReady, hasError, error,
    addOrder, updateOrder, deleteOrder,
    addProduct, updateProduct, deleteProduct,
    addVehicle, updateVehicle, deleteVehicle,
    addDriver, updateDriver, deleteDriver,
    addCustomer, updateCustomer, deleteCustomer,
    addActivity, updateActivity, deleteActivity,
    addPriceTable, updatePriceTable, deletePriceTable,
    updateOrderStatus, updateProductionStage,
    assignShipment, confirmDelivery,
    createDeliverySchedule, updateDeliverySchedule, deleteDeliverySchedule,
    startDeliverySchedule, completeDeliverySchedule, addMember, updateMember, deleteMember
  };
}