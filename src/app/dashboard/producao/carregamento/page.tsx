"use client";

import { useSystemData } from '@/server/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrderDetailsModal } from '@/components/shared/OrderDetailsModal';
import { FilterPanel } from '@/components/shared/FilterPanel';
import { SummaryCard } from '@/components/shared/SummaryCard';
import { format } from 'date-fns';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  MapPin, Truck, Plus, Trash2, Download, CheckCircle2,
  ChevronDown, ChevronUp, Printer, X, ArrowLeft,
  ClipboardList, Layers, Package, Eye, Home, Calendar,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  AGUARDANDO_FATURAMENTO: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  FATURADO: 'bg-green-100 text-green-800 border-green-200',
  ENTREGA: 'bg-purple-100 text-purple-800 border-purple-200',
  ENTREGUE: 'bg-zinc-100 text-zinc-600 border-zinc-200',
};
const STATUS_LABELS: Record<string, string> = {
  AGUARDANDO_FATURAMENTO: 'Ag. Faturamento',
  FATURADO: 'Lib. Entrega',
  ENTREGA: 'Em Entrega',
  ENTREGUE: 'Entregue',
};

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────
interface PaletItem {
  productId: string;
  clients: { orderId: string; customerName: string; quantity: number }[];
}
interface Palet {
  id: string;
  number: number;
  items: PaletItem[];
}
interface CityGroup {
  city: string;
  orders: string[];
  palets: Palet[];
}
interface Route {
  id: string;
  destination: string;
  orders: string[];
  totalWeightKg: number;
  totalUnits: number;
}
interface LoadingCharge {
  id: string;
  chargeNumber: string;
  grupoCarga: string;
  cityGroups: CityGroup[];   // pedidos PALETIZADO
  routes: Route[];           // pedidos BATIDA
  totalWeightKg: number;
  totalPalets: number;
  totalRoutes: number;
  createdAt: string;
  observations: string;
}



// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function fmtDate(date?: string | null, withTime = false) {
  if (!date) return '—';
  try { return format(new Date(date), withTime ? 'dd/MM/yy HH:mm' : 'dd/MM/yy'); }
  catch { return '—'; }
}
function prodWeight(products: any[], productId: string, qty: number) {
  return (products.find(p => p.id === productId)?.weight || 0) * qty;
}
function paletWeight(palet: Palet, products: any[]) {
  return palet.items.reduce((s, item) => {
    const qty = item.clients.reduce((ss, c) => ss + c.quantity, 0);
    return s + prodWeight(products, item.productId, qty);
  }, 0);
}
function paletUnits(palet: Palet) {
  return palet.items.reduce((s, item) => s + item.clients.reduce((ss, c) => ss + c.quantity, 0), 0);
}
function newPaletId() { return `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

// ─────────────────────────────────────────────
// PALET EDITOR
// ─────────────────────────────────────────────
interface AvailableItem {
  productId: string;
  productName: string;
  uom: string;
  perOrder: { orderId: string; customerName: string; remaining: number }[];
}

function PaletEditor({ palet, availableItems, products, onUpdate, onDelete, city }: {
  palet: Palet;
  availableItems: AvailableItem[];
  products: any[];
  onUpdate: (p: Palet) => void;
  onDelete: () => void;
  city: string;
}) {
  const [addProductId, setAddProductId] = useState('');
  const [addOrderId, setAddOrderId] = useState('');
  const [addQty, setAddQty] = useState(1);

  const weight = paletWeight(palet, products);
  const units = paletUnits(palet);

  const handleAdd = () => {
    if (!addProductId || !addOrderId || addQty <= 0) return;
    const orderEntry = availableItems.find(a => a.productId === addProductId)?.perOrder.find(o => o.orderId === addOrderId);
    if (!orderEntry) return;
    const updated = { ...palet };
    const existingItem = updated.items.find(i => i.productId === addProductId);
    if (existingItem) {
      const ec = existingItem.clients.find(c => c.orderId === addOrderId);
      if (ec) ec.quantity += addQty;
      else existingItem.clients.push({ orderId: addOrderId, customerName: orderEntry.customerName, quantity: addQty });
    } else {
      updated.items = [...updated.items, { productId: addProductId, clients: [{ orderId: addOrderId, customerName: orderEntry.customerName, quantity: addQty }] }];
    }
    onUpdate(updated);
    setAddProductId(''); setAddOrderId(''); setAddQty(1);
  };

  const removeClient = (productId: string, orderId: string) => {
    const updated = { ...palet };
    const item = updated.items.find(i => i.productId === productId);
    if (!item) return;
    item.clients = item.clients.filter(c => c.orderId !== orderId);
    if (!item.clients.length) updated.items = updated.items.filter(i => i.productId !== productId);
    onUpdate(updated);
  };

  const updateQty = (productId: string, orderId: string, qty: number) => {
    if (qty <= 0) { removeClient(productId, orderId); return; }
    const updated = { ...palet };
    const c = updated.items.find(i => i.productId === productId)?.clients.find(c => c.orderId === orderId);
    if (c) { c.quantity = qty; onUpdate(updated); }
  };

  const printLabel = () => {
    const clientNames = [...new Set(palet.items.flatMap(i => i.clients.map(c => c.customerName)))].join(', ');
    const rows = palet.items.map(item => {
      const prod = products.find(p => p.id === item.productId);
      const qty = item.clients.reduce((s, c) => s + c.quantity, 0);
      return `<tr><td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;">${prod?.name || item.productId}</td><td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center;font-weight:700;">${qty}</td><td style="padding:4px 8px;border:1px solid #ddd;font-size:10px;color:#555;">${item.clients.map(c => `${c.customerName}: ${c.quantity}`).join(' | ')}</td><td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:right;">${prodWeight(products, item.productId, qty).toFixed(1)} kg</td></tr>`;
    }).join('');
    const html = `<!DOCTYPE html><html><body><div style="border:3px solid #222;padding:16px;max-width:600px;font-family:monospace;"><h1 style="font-size:22px;margin:0;">PALETE ${String(palet.number).padStart(3, '0')}</h1><h2 style="font-size:14px;color:#555;margin:4px 0 12px;">📍 ${city}</h2><p style="font-size:13px;font-weight:700;">${clientNames}</p><table style="width:100%;border-collapse:collapse;"><thead><tr><th style="background:#222;color:#fff;padding:5px 8px;font-size:11px;text-align:left;">Produto</th><th style="background:#222;color:#fff;padding:5px 8px;font-size:11px;">Qtd</th><th style="background:#222;color:#fff;padding:5px 8px;font-size:11px;">Detalhes</th><th style="background:#222;color:#fff;padding:5px 8px;font-size:11px;">Peso</th></tr></thead><tbody>${rows}</tbody></table><p style="font-size:11px;margin-top:12px;">${units} un · ${weight.toFixed(1)} kg</p></div><button onclick="window.print()" style="margin-top:12px;padding:8px 16px;cursor:pointer;">🖨️ Imprimir</button></body></html>`;
    const win = window.open('', '_blank');
    win?.document.write(html); win?.document.close();
  };

  const selectedAvail = availableItems.find(a => a.productId === addProductId);

  return (
    <div className="bg-white border-2 border-dashed border-primary/30 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <span className="text-[10px] font-black text-primary-foreground">{String(palet.number).padStart(3, '0')}</span>
          </div>
          <div>
            <p className="text-xs font-black uppercase">Palete {palet.number}</p>
            <p className="text-[9px] text-muted-foreground">{city}</p>
          </div>
          <Badge variant="secondary" className="text-[8px] ml-1">{units} un</Badge>
          <Badge variant="secondary" className="text-[8px]">{weight.toFixed(1)} kg</Badge>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-[10px] font-bold text-muted-foreground" onClick={printLabel}>
            <Printer className="w-3 h-3" /> Etiqueta
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {palet.items.length > 0 && (
        <div className="bg-zinc-50 rounded-lg divide-y">
          {palet.items.map(item => {
            const prod = products.find(p => p.id === item.productId);
            const totalQty = item.clients.reduce((s, c) => s + c.quantity, 0);
            return (
              <div key={item.productId} className="px-3 py-2">
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] font-black uppercase">{prod?.name || item.productId}</span>
                  <span className="text-[10px] font-black text-primary">{totalQty} un · {prodWeight(products, item.productId, totalQty).toFixed(1)} kg</span>
                </div>
                {item.clients.map(client => (
                  <div key={client.orderId} className="flex items-center justify-between py-0.5 pl-3 text-[9px] text-muted-foreground">
                    <span>{client.customerName}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.productId, client.orderId, client.quantity - 1)}>−</button>
                      <span className="font-bold w-6 text-center">{client.quantity}</span>
                      <button onClick={() => updateQty(item.productId, client.orderId, client.quantity + 1)}>+</button>
                      <button className="ml-1 text-red-400" onClick={() => removeClient(item.productId, client.orderId)}><X className="w-2.5 h-2.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {!palet.items.length && <p className="text-[9px] text-muted-foreground text-center py-3 italic">Palete vazio — adicione itens abaixo</p>}

      <div className="border border-dashed border-zinc-200 rounded-lg p-2.5 space-y-2">
        <p className="text-[9px] font-black uppercase text-muted-foreground">Adicionar item</p>
        <div className="grid grid-cols-2 gap-1.5">
          <Select value={addProductId} onValueChange={v => { setAddProductId(v); setAddOrderId(''); }}>
            <SelectTrigger className="h-7 text-[10px]"><SelectValue placeholder="Produto..." /></SelectTrigger>
            <SelectContent>
              {availableItems.filter(a => a.perOrder.some(o => o.remaining > 0)).map(a => (
                <SelectItem key={a.productId} value={a.productId} className="text-xs">{a.productName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={addOrderId} onValueChange={setAddOrderId} disabled={!addProductId}>
            <SelectTrigger className="h-7 text-[10px]"><SelectValue placeholder="Cliente..." /></SelectTrigger>
            <SelectContent>
              {selectedAvail?.perOrder.filter(o => o.remaining > 0).map(o => (
                <SelectItem key={o.orderId} value={o.orderId} className="text-xs">{o.customerName} ({o.remaining} disp.)</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-1.5">
          <Input type="number" min={1} value={addQty} onChange={e => setAddQty(Math.max(1, Number(e.target.value)))} className="h-7 text-xs w-20" disabled={!addOrderId} />
          <Button size="sm" className="h-7 flex-1 text-[10px] font-black gap-1" onClick={handleAdd} disabled={!addProductId || !addOrderId}>
            <Plus className="w-3 h-3" /> Adicionar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
type Step = 'list' | 'mount';

export default function CarregamentoPage() {
  const { orders, products, vehicles, isReady, carregamentos, createCarregamento } = useSystemData();

  const [step, setStep] = useState<Step>('list');
  const [activeGrupo, setActiveGrupo] = useState<string | null>(null);
  const [expandedCharge, setExpandedCharge] = useState<string | null>(null);
  const [observations, setObservations] = useState('');

  // paletes e rotas do grupo ativo
  const [cityPalets, setCityPalets] = useState<Record<string, Palet[]>>({});
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Filtros
  const [pendSearch, setPendSearch] = useState('');
  const [pendCidade, setPendCidade] = useState('ALL');
  const [histSearch, setHistSearch] = useState('');
  const [histDe, setHistDe] = useState('');
  const [histAte, setHistAte] = useState('');

  // Modal detalhes
  const [detalhesOrder, setDetalhesOrder] = useState<any>(null);

  // Usar carregamentos direto do store
  const charges = useMemo(() => {
    if (!carregamentos || carregamentos.length === 0) return [];
    
    return carregamentos.map(c => ({
      id: c.id,
      chargeNumber: `CRG-${format(new Date(c.createdAt), 'ddMMyy')}-${String(Math.abs(c.id.charCodeAt(0) % 1000)).padStart(3, '0')}`,
      grupoCarga: c.grupoCarga,
      cityGroups: [] as CityGroup[],
      routes: c.orderIds.map((orderId, idx) => ({
        id: `route_${orderId}_${idx}`,
        destination: '—',
        orders: [orderId],
        totalWeightKg: c.totalPeso,
        totalUnits: Math.round(c.totalSacos),
      })),
      totalWeightKg: c.totalPeso,
      totalPalets: 0,
      totalRoutes: c.orderIds.length,
      createdAt: c.createdAt,
      observations: '',
    })) as LoadingCharge[];
  }, [carregamentos]);

  // ── Pedidos disponíveis (AGUARDANDO_FATURAMENTO não alocados)
  const allocatedIds = useMemo(() => {
    const ids = new Set<string>();
    charges.forEach(c => {
      c.cityGroups?.forEach(cg => cg.orders.forEach(id => ids.add(id)));
      c.routes?.forEach(r => r.orders.forEach(id => ids.add(id)));
    });
    return ids;
  }, [charges]);

  const pendingOrders = useMemo(() =>
    orders.filter(o => o.status === 'AGUARDANDO_FATURAMENTO' && !allocatedIds.has(o.id))
      .sort((a, b) => ((a as any).grupoCarga || '').localeCompare((b as any).grupoCarga || '')),
    [orders, allocatedIds]);

  // ── Agrupar por grupoCarga
  const grupoMap = useMemo(() => {
    const map: Record<string, typeof pendingOrders> = {};
    pendingOrders.forEach(o => {
      const g = (o as any).grupoCarga || 'SEM_GRUPO';
      if (!map[g]) map[g] = [];
      map[g].push(o);
    });
    return map;
  }, [pendingOrders]);

  const pendCidades = useMemo(() => [...new Set(pendingOrders.map(o => o.city).filter(Boolean))], [pendingOrders]);

  const gruposFiltered = useMemo(() => {
    return Object.entries(grupoMap).filter(([grupo, gOrders]) => {
      const matchSearch = !pendSearch ||
        grupo.toLowerCase().includes(pendSearch.toLowerCase()) ||
        gOrders.some(o => o.customerName?.toLowerCase().includes(pendSearch.toLowerCase()) || o.id?.toLowerCase().includes(pendSearch.toLowerCase()));
      const matchCidade = pendCidade === 'ALL' || gOrders.some(o => o.city === pendCidade);
      return matchSearch && matchCidade;
    });
  }, [grupoMap, pendSearch, pendCidade]);

  const historicoChargesFiltered = useMemo(() =>
    charges.filter(charge => {
      const matchSearch =
        !histSearch ||
        charge.chargeNumber.toLowerCase().includes(histSearch.toLowerCase()) ||
        charge.grupoCarga.toLowerCase().includes(histSearch.toLowerCase());

      const matchDe =
        !histDe || new Date(charge.createdAt) >= new Date(histDe);

      const matchAte =
        !histAte || new Date(charge.createdAt) <= new Date(histAte + 'T23:59:59');

      return matchSearch && matchDe && matchAte;
    }), [charges, histSearch, histDe, histAte]);

  // ── Pedidos do grupo ativo separados por tipo
  const activeOrders = useMemo(() =>
    activeGrupo ? (grupoMap[activeGrupo] || []) : [], [activeGrupo, grupoMap]);

  const paletizadoOrders = useMemo(() => activeOrders.filter(o => (o as any).tipoCarga === 'PALETIZADA'), [activeOrders]);
  const batidaOrders = useMemo(() => activeOrders.filter(o => (o as any).tipoCarga !== 'PALETIZADA'), [activeOrders]);

  const selectedByCity = useMemo(() =>
    paletizadoOrders.reduce((acc, o) => {
      const city = o.city || 'Sem Cidade';
      if (!acc[city]) acc[city] = [];
      acc[city].push(o);
      return acc;
    }, {} as Record<string, typeof paletizadoOrders>),
    [paletizadoOrders]);

  // ── Inicializar montagem ao abrir grupo
  const openGrupo = (grupo: string) => {
    const gOrders = grupoMap[grupo] || [];
    const palInit: Record<string, Palet[]> = {};
    gOrders.filter(o => (o as any).tipoCarga === 'PALETIZADA').forEach(o => {
      const city = o.city || 'Sem Cidade';
      if (!palInit[city]) palInit[city] = [];
    });
    setCityPalets(palInit);
    setObservations('');
    setActiveGrupo(grupo);
    setStep('mount');
  };

  // ── Available items para palete por cidade
  function getAvailableForCity(city: string): AvailableItem[] {
    const cityOrders = selectedByCity[city] || [];
    const palets = cityPalets[city] || [];
    const allocated: Record<string, Record<string, number>> = {};
    palets.forEach(p => p.items.forEach(item => {
      if (!allocated[item.productId]) allocated[item.productId] = {};
      item.clients.forEach(c => {
        allocated[item.productId][c.orderId] = (allocated[item.productId][c.orderId] || 0) + c.quantity;
      });
    }));
    const productMap: Record<string, AvailableItem> = {};
    cityOrders.forEach(order => {
      (order.items as any[]).forEach(item => {
        const prod = products.find((p: any) => p.id === item.productId);
        if (!productMap[item.productId]) productMap[item.productId] = { productId: item.productId, productName: prod?.name || item.productId, uom: prod?.uom || 'UN', perOrder: [] };
        const alloc = allocated[item.productId]?.[order.id] || 0;
        productMap[item.productId].perOrder.push({ orderId: order.id, customerName: order.customerName, remaining: item.quantity - alloc });
      });
    });
    return Object.values(productMap);
  }

  function cityProgress(city: string) {
    const cityOrders = selectedByCity[city] || [];
    const needed = cityOrders.reduce((s, o) => s + (o.items as any[]).reduce((ss: number, i: any) => ss + i.quantity, 0), 0);
    const allocated = (cityPalets[city] || []).reduce((s, p) => s + paletUnits(p), 0);
    return { needed, allocated, done: allocated >= needed };
  }

  const addPalet = (city: string) => {
    setCityPalets(prev => {
      const allNums = Object.values(prev).flat().map(p => p.number);
      const maxNum = allNums.length > 0 ? Math.max(...allNums) : 0;
      return { ...prev, [city]: [...(prev[city] || []), { id: newPaletId(), number: maxNum + 1, items: [] }] };
    });
  };

  const handleSave = () => {
    setIsConfirmOpen(true);
  };

  const confirmSave = async () => {
    const allPalets = Object.values(cityPalets).flat();
    const paletWeight_total = allPalets.reduce((s, p) => s + paletWeight(p, products), 0);
    const batidaWeight_total = batidaOrders.reduce((s, o) => s + (o.totalWeight || 0), 0);

    const cityGroups: CityGroup[] = Object.entries(cityPalets).map(([city, palets]) => ({
      city,
      orders: (selectedByCity[city] || []).map(o => o.id),
      palets,
    }));

    const routes: Route[] = batidaOrders.map((order, idx) => ({
      id: `route_${order.id}_${idx}`,
      destination: order.city || 'Sem Cidade',
      orders: [order.id],
      totalWeightKg: order.totalWeight || 0,
      totalUnits: (order.items as any[]).reduce((s: number, i: any) => s + i.quantity, 0),
    }));

    // Salvar na API
    try {
      const allOrderIds = [...cityGroups.flatMap(cg => cg.orders), ...routes.flatMap(r => r.orders)];
      const totalSacos = activeOrders.reduce((s, o) => s + (o.items as any[]).reduce((ss: number, i: any) => ss + i.quantity, 0), 0);
      const totalValor = activeOrders.reduce((s, o) => s + (o.totalValue || 0), 0);

      await createCarregamento({
        grupoCarga: activeGrupo!,
        tipoCarga: paletizadoOrders.length > 0 ? 'PALETIZADA' : 'BATIDA',
        dataCarregamento: (activeOrders[0] as any)?.dataCarregamento || new Date().toISOString(),
        vehicleId: (activeOrders[0] as any)?.assignedVehicleId || undefined,
        scheduledDeliveryDate: (activeOrders[0] as any)?.scheduledDeliveryDate || undefined,
        orderIds: allOrderIds,
        totalSacos,
        totalPeso: paletWeight_total + batidaWeight_total,
        totalValor,
      });

      toast({ title: 'Carga fechada!', description: `${activeGrupo}` });
      setStep('list');
      setActiveGrupo(null);
      setCityPalets({});
      setIsConfirmOpen(false);
    } catch (error) {
      console.error('Erro ao salvar carregamento:', error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao salvar carregamento' });
    }
  };

  const handleExport = (charge: LoadingCharge) => {
    const rows: any[] = [];
    charge.cityGroups?.forEach(cg => {
      cg.palets.forEach(palet => {
        palet.items.forEach(item => {
          const prod = products.find((p: any) => p.id === item.productId);
          item.clients.forEach(client => {
            rows.push({ CARGA: charge.chargeNumber, GRUPO: charge.grupoCarga, TIPO: 'PALETIZADO', CIDADE: cg.city, PALETE: palet.number, CLIENTE: client.customerName, PRODUTO: prod?.name || item.productId, QUANTIDADE: client.quantity });
          });
        });
      });
    });
    charge.routes?.forEach((route, idx) => {
      const o = orders.find(o => o.id === route.orders[0]);
      if (o) (o.items as any[]).forEach(item => {
        const prod = products.find((p: any) => p.id === item.productId);
        rows.push({ CARGA: charge.chargeNumber, GRUPO: charge.grupoCarga, TIPO: 'BATIDA', CIDADE: route.destination, ROTA: idx + 1, CLIENTE: o.customerName, PRODUTO: prod?.name || item.productId, QUANTIDADE: item.quantity });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Carga');
    XLSX.writeFile(wb, `${charge.chargeNumber}.xlsx`);
  };

  const printRomaneio = (charge: LoadingCharge) => {
    let body = `<h2>Grupo: ${charge.grupoCarga}</h2>`;

    if (charge.cityGroups?.length) {
      body += `<h3>📦 Paletizados</h3>`;
      charge.cityGroups.forEach(cg => {
        body += `<h4>📍 ${cg.city}</h4>`;
        cg.palets.forEach(p => {
          const clients = [...new Set(p.items.flatMap(i => i.clients.map(c => c.customerName)))].join(', ');
          body += `<p><strong>Palete ${String(p.number).padStart(3, '0')}</strong> — ${clients}</p><table style="width:100%;border-collapse:collapse;margin-bottom:8px;">`;
          p.items.forEach(item => {
            const prod = products.find((pp: any) => pp.id === item.productId);
            const qty = item.clients.reduce((s, c) => s + c.quantity, 0);
            body += `<tr><td style="border:1px solid #ddd;padding:3px 6px;font-size:10px;">${prod?.name}</td><td style="border:1px solid #ddd;padding:3px 6px;font-size:10px;text-align:center;">${qty} un</td><td style="border:1px solid #ddd;padding:3px 6px;font-size:10px;text-align:right;">${paletWeight(p, products).toFixed(1)} kg</td></tr>`;
          });
          body += `</table>`;
        });
      });
    }

    if (charge.routes?.length) {
      body += `<h3>🏠 Batida</h3>`;
      charge.routes.forEach((route, idx) => {
        const o = orders.find(o => o.id === route.orders[0]);
        if (!o) return;
        body += `<p><strong>Rota ${idx + 1}</strong> — ${o.customerName} (📍 ${route.destination})</p><table style="width:100%;border-collapse:collapse;margin-bottom:8px;">`;
        (o.items as any[]).forEach(item => {
          const prod = products.find((p: any) => p.id === item.productId);
          body += `<tr><td style="border:1px solid #ddd;padding:3px 6px;font-size:10px;">${prod?.name}</td><td style="border:1px solid #ddd;padding:3px 6px;font-size:10px;text-align:center;">${item.quantity} un</td></tr>`;
        });
        body += `</table>`;
      });
    }

    const html = `<!DOCTYPE html><html><head><title>Romaneio ${charge.chargeNumber}</title><style>body{font-family:monospace;margin:24px;}h3,h4{border-bottom:1px solid #ccc;padding-bottom:4px;}@media print{button{display:none}}</style></head><body><h1>ROMANEIO DE CARGA</h1><p>${charge.chargeNumber} · ${format(new Date(charge.createdAt), 'dd/MM/yyyy HH:mm')} · ${charge.totalWeightKg.toFixed(1)} kg</p>${body}<button onclick="window.print()" style="margin-top:16px;padding:8px 20px;">🖨️ Imprimir</button></body></html>`;
    const win = window.open('', '_blank');
    win?.document.write(html); win?.document.close();
  };

  if (!isReady) return null;

  const totalWeightPending = pendingOrders.reduce((s, o) => s + (o.totalWeight || 0), 0);

  // ─── STEP: MONTAR CARGA ───────────────────────────────────────────────
  if (step === 'mount' && activeGrupo) {
    // Info do grupo (pega do primeiro pedido)
    const firstOrder = activeOrders[0] as any;
    const vehicle = firstOrder?.assignedVehicleId ? vehicles.find((v: any) => v.id === firstOrder.assignedVehicleId) : null;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-1.5 font-bold text-xs" onClick={() => { setStep('list'); setActiveGrupo(null); }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar
          </Button>
          <div className="flex-1">
            <h2 className="text-lg font-black uppercase tracking-tight">Montagem de Carga</h2>
            <p className="text-[10px] font-bold uppercase text-muted-foreground font-mono">{activeGrupo}</p>
          </div>
        </div>

        {/* Info do grupo */}
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-0.5">Veículo</p>
                <p className="font-bold">{vehicle ? `${vehicle.model} · ${vehicle.plate}` : '—'}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-0.5">Data Carregamento</p>
                <p className="font-bold">{fmtDate(firstOrder?.dataCarregamento, true)}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-0.5">Data Entrega</p>
                <p className="font-bold">{fmtDate(firstOrder?.scheduledDeliveryDate)}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-0.5">Pedidos</p>
                <p className="font-bold">{activeOrders.length} · {activeOrders.reduce((s, o) => s + (o.totalWeight || 0), 0).toFixed(1)} kg</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção BATIDA */}
        {batidaOrders.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-amber-600" />
              <p className="text-sm font-black uppercase">Batida — {batidaOrders.length} pedido(s)</p>
              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[9px]">Entrega Direta</Badge>
            </div>
            <div className="space-y-2">
              {batidaOrders.map((order, idx) => (
                <div key={order.id} className="border-2 border-amber-200 rounded-xl p-4 bg-amber-50/30">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="text-sm font-black uppercase">{order.customerName}</p>
                      <p className="text-[9px] text-muted-foreground font-mono">{order.id} · 📍 {order.city}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px]">{(order.items as any[]).reduce((s: number, i: any) => s + i.quantity, 0)} un</Badge>
                      <Badge variant="outline" className="text-[9px]">{(order.totalWeight || 0).toFixed(1)} kg</Badge>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setDetalhesOrder(order)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-2 divide-y">
                    {(order.items as any[]).map(item => {
                      const prod = products.find((p: any) => p.id === item.productId);
                      return (
                        <div key={item.productId} className="flex justify-between py-1.5 text-xs">
                          <span className="font-bold">{prod?.name || item.productId}</span>
                          <span className="text-muted-foreground">{item.quantity} un · {prodWeight(products, item.productId, item.quantity).toFixed(1)} kg</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Seção PALETIZADO */}
        {paletizadoOrders.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <p className="text-sm font-black uppercase">Paletizado — {paletizadoOrders.length} pedido(s)</p>
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[9px]">Montagem por Palete</Badge>
            </div>

            {Object.entries(selectedByCity).map(([city, cityOrders]) => {
              const palets = cityPalets[city] || [];
              const progress = cityProgress(city);

              return (
                <div key={city} className="border rounded-xl overflow-hidden shadow-sm">
                  <div className={`px-4 py-3 flex items-center justify-between ${progress.done ? 'bg-green-50' : 'bg-primary/5'}`}>
                    <div className="flex items-center gap-2">
                      <MapPin className={`w-3.5 h-3.5 ${progress.done ? 'text-green-600' : 'text-primary'}`} />
                      <p className={`text-[10px] font-black uppercase tracking-widest ${progress.done ? 'text-green-700' : 'text-primary'}`}>{city}</p>
                      {progress.done && <Badge className="bg-green-100 text-green-700 border-green-200 text-[8px]">✓ Completo</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] bg-white">{cityOrders.length} ped.</Badge>
                      <Badge variant="outline" className={`text-[9px] bg-white ${progress.done ? 'border-green-300 text-green-700' : ''}`}>
                        {progress.allocated}/{progress.needed} un
                      </Badge>
                      <Badge variant="outline" className="text-[9px] bg-white">{palets.length} paletes</Badge>
                    </div>
                  </div>

                  <div className="bg-white p-4 space-y-4">
                    {/* Tabela de pedidos/alocação */}
                    <div className="bg-zinc-50 rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-[9px] font-black uppercase h-8">Cliente</TableHead>
                            <TableHead className="text-[9px] font-black uppercase h-8">Produto</TableHead>
                            <TableHead className="text-[9px] font-black uppercase h-8 text-center">Qtd</TableHead>
                            <TableHead className="text-[9px] font-black uppercase h-8 text-center">Alocado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cityOrders.flatMap(order =>
                            (order.items as any[]).map(item => {
                              const prod = products.find((p: any) => p.id === item.productId);
                              const alocado = palets.reduce((s, p) => {
                                const c = p.items.find(pi => pi.productId === item.productId)?.clients.find(c => c.orderId === order.id);
                                return s + (c?.quantity || 0);
                              }, 0);
                              const ok = alocado >= item.quantity;
                              return (
                                <TableRow key={`${order.id}-${item.productId}`} className={ok ? 'bg-green-50/50' : ''}>
                                  <TableCell className="text-[10px] font-bold py-1.5">{order.customerName}</TableCell>
                                  <TableCell className="text-[10px] py-1.5">{prod?.name || item.productId}</TableCell>
                                  <TableCell className="text-center text-[10px] font-bold py-1.5">{item.quantity}</TableCell>
                                  <TableCell className="text-center py-1.5">
                                    <span className={`text-[10px] font-bold ${ok ? 'text-green-600' : alocado > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                      {alocado}{ok ? ' ✓' : `/${item.quantity}`}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Paletes */}
                    <div className="space-y-3">
                      {palets.map((palet, idx) => (
                        <PaletEditor
                          key={palet.id}
                          palet={palet}
                          availableItems={getAvailableForCity(city)}
                          products={products}
                          onUpdate={updated => setCityPalets(prev => ({ ...prev, [city]: prev[city].map((p, i) => i === idx ? updated : p) }))}
                          onDelete={() => setCityPalets(prev => ({ ...prev, [city]: prev[city].filter((_, i) => i !== idx) }))}
                          city={city}
                        />
                      ))}
                    </div>

                    <Button variant="outline" className="w-full gap-2 font-bold text-xs uppercase border-dashed" onClick={() => addPalet(city)}>
                      <Plus className="w-3.5 h-3.5" /> Adicionar Palete para {city}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer fechar carga */}
        <Card className="border-none shadow-sm bg-zinc-900 text-white">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-6 flex-wrap">
                {[
                  { label: 'Paletes', value: Object.values(cityPalets).flat().length },
                  { label: 'Rotas', value: batidaOrders.length },
                  { label: 'Peso', value: `${(Object.values(cityPalets).flat().reduce((s, p) => s + paletWeight(p, products), 0) + batidaOrders.reduce((s, o) => s + (o.totalWeight || 0), 0)).toFixed(1)} kg` },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-[9px] font-black uppercase opacity-50">{item.label}</p>
                    <p className="text-xl font-black">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2 w-full md:w-64">
                <Input
                  placeholder="Observações (opcional)"
                  className="h-8 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  value={observations}
                  onChange={e => setObservations(e.target.value)}
                />
                <Button className="w-full bg-green-500 hover:bg-green-400 text-white font-black text-xs uppercase gap-2" onClick={handleSave}>
                  <CheckCircle2 className="w-4 h-4" /> Fechar Carga
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Confirm dialog */}
        <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-black uppercase">Confirmar Fechamento</DialogTitle>
              <DialogDescription className="text-[10px] uppercase font-bold">Revise antes de fechar</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                {[
                  { label: 'Grupo', value: activeGrupo },
                  { label: 'Paletes', value: Object.values(cityPalets).flat().length },
                  { label: 'Rotas', value: batidaOrders.length },
                  { label: 'Pedidos', value: activeOrders.length },
                ].map(item => (
                  <div key={item.label} className="flex justify-between text-[10px] font-bold">
                    <span>{item.label}</span><span>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsConfirmOpen(false)} className="font-bold text-xs uppercase">Cancelar</Button>
              <Button onClick={confirmSave} className="font-black text-xs uppercase gap-2 bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <OrderDetailsModal isOpen={!!detalhesOrder} order={detalhesOrder} products={products} onClose={() => setDetalhesOrder(null)} statusLabels={STATUS_LABELS} actions={[]} />
      </div>
    );
  }

  // ─── STEP: LIST ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <SummaryCard label="Grupos Pendentes" value={Object.keys(grupoMap).length} unit="grupos" color="info" />
        <SummaryCard label="Cargas Fechadas" value={charges.length} unit="cargas" color="success" />
        <SummaryCard label="Peso Pendente" value={`${(totalWeightPending / 1000).toFixed(1)} ton`} unit="" color="primary" />
      </div>

      <Tabs defaultValue="pendentes" className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="pendentes" className="gap-2 font-bold text-xs uppercase"><Package className="w-4 h-4" /> Pendentes</TabsTrigger>
          <TabsTrigger value="historico" className="gap-2 font-bold text-xs uppercase"><ClipboardList className="w-4 h-4" /> Histórico</TabsTrigger>
        </TabsList>

        {/* ── PENDENTES ── */}
        <TabsContent value="pendentes" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">Grupos de Carga</h2>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Agrupados por Grupo de Carga da Logística</p>
            </div>
            <span className="text-[9px] font-bold text-muted-foreground uppercase">{gruposFiltered.length} grupos</span>
          </div>

          <FilterPanel
            fields={[
              { type: 'search', key: 'search', placeholder: 'Grupo ou cliente...', value: pendSearch, onChange: setPendSearch, className: 'md:col-span-2' },
              { type: 'select', key: 'cidade', placeholder: 'Cidade', value: pendCidade, onChange: setPendCidade, options: [{ label: 'Todas', value: 'ALL' }, ...pendCidades.map(c => ({ label: c!, value: c! }))] },
            ]}
            onClear={() => { setPendSearch(''); setPendCidade('ALL'); }}
            gridCols="grid-cols-1 sm:grid-cols-3"
          />

          {gruposFiltered.length === 0 && (
            <Card className="border-none shadow-sm">
              <CardContent className="py-16 text-center text-muted-foreground italic text-xs uppercase opacity-40">
                Nenhum grupo pendente.
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {gruposFiltered.map(([grupo, gOrders]) => {
              const first = gOrders[0] as any;
              const vehicle = first?.assignedVehicleId ? vehicles.find((v: any) => v.id === first.assignedVehicleId) : null;
              const totalKg = gOrders.reduce((s, o) => s + (o.totalWeight || 0), 0);
              const totalSacs = gOrders.reduce((s, o) => s + (o.items as any[]).reduce((ss: number, i: any) => ss + i.quantity, 0), 0);
              const cidades = [...new Set(gOrders.map(o => o.city).filter(Boolean))];
              const nPal = gOrders.filter(o => (o as any).tipoCarga === 'PALETIZADA').length;
              const nBat = gOrders.filter(o => (o as any).tipoCarga !== 'PALETIZADA').length;

              return (
                <Card key={grupo} className="border shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-black font-mono text-primary">{grupo}</p>
                          {nPal > 0 && <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[9px]"><Layers className="w-3 h-3 mr-1" />{nPal} Paletizado</Badge>}
                          {nBat > 0 && <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[9px]"><Home className="w-3 h-3 mr-1" />{nBat} Batida</Badge>}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div>
                            <p className="text-[9px] font-black uppercase text-muted-foreground">Veículo</p>
                            <p className="font-bold">{vehicle ? `${vehicle.model} · ${vehicle.plate}` : '—'}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase text-muted-foreground">Carregamento</p>
                            <p className="font-bold">{fmtDate(first?.dataCarregamento, true)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase text-muted-foreground">Entrega</p>
                            <p className="font-bold">{fmtDate(first?.scheduledDeliveryDate)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase text-muted-foreground">Cidades</p>
                            <p className="font-bold">{cidades.join(', ') || '—'}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[9px]">{gOrders.length} pedidos</Badge>
                          <Badge variant="outline" className="text-[9px]">{totalSacs} un</Badge>
                          <Badge variant="outline" className="text-[9px]">{totalKg.toFixed(1)} kg</Badge>
                        </div>
                      </div>
                      <Button className="font-black text-xs uppercase gap-2 shrink-0" onClick={() => openGrupo(grupo)}>
                        <Layers className="w-4 h-4" /> Montar Carga
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── HISTÓRICO ── */}
        <TabsContent value="historico" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">Histórico de Cargas</h2>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Cargas já fechadas</p>
            </div>
            <span className="text-[9px] font-bold text-muted-foreground uppercase">{historicoChargesFiltered.length} cargas</span>
          </div>

          <FilterPanel
            fields={[
              { type: 'search', key: 'search', placeholder: 'Número ou grupo...', value: histSearch, onChange: setHistSearch, className: 'md:col-span-2' },
              { type: 'date', key: 'de', placeholder: 'De', value: histDe, onChange: setHistDe },
              { type: 'date', key: 'ate', placeholder: 'Até', value: histAte, onChange: setHistAte },
            ]}
            onClear={() => { setHistSearch(''); setHistDe(''); setHistAte(''); }}
            gridCols="grid-cols-1 sm:grid-cols-2 md:grid-cols-4"
          />

          {historicoChargesFiltered.length === 0 ? (
            <Card className="border-none shadow-sm">
              <CardContent className="py-16 text-center text-muted-foreground italic text-xs uppercase opacity-40">Nenhuma carga encontrada.</CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {charges
                .filter(charge => {
                  const matchSearch =
                    !histSearch ||
                    charge.chargeNumber.toLowerCase().includes(histSearch.toLowerCase()) ||
                    charge.grupoCarga.toLowerCase().includes(histSearch.toLowerCase());

                  const matchDe =
                    !histDe || new Date(charge.createdAt) >= new Date(histDe);

                  const matchAte =
                    !histAte || new Date(charge.createdAt) <= new Date(histAte + 'T23:59:59');

                  return matchSearch && matchDe && matchAte;
                })
                .map(charge => (
                  <Collapsible key={charge.id} open={expandedCharge === charge.id} onOpenChange={() => setExpandedCharge(expandedCharge === charge.id ? null : charge.id)}>
                    <Card className="border-none shadow-sm overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <CardContent className="p-4 cursor-pointer hover:bg-muted/20 transition-colors">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                                <Truck className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm font-black text-primary">{charge.chargeNumber}</p>
                                <p className="text-[9px] text-muted-foreground font-mono">{charge.grupoCarga} · {charge.totalPalets} paletes · {charge.totalRoutes} rotas · {charge.totalWeightKg.toFixed(1)} kg</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-muted-foreground">{fmtDate(charge.createdAt, true)}</span>
                              {expandedCharge === charge.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="px-4 pb-4 pt-0 border-t space-y-3">
                          {charge.observations && <p className="text-[10px] text-muted-foreground bg-muted/30 rounded p-2">{charge.observations}</p>}

                          {/* Paletes */}
                          {charge.cityGroups?.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-[10px] font-black uppercase text-blue-700 flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> Paletizados</p>
                              {charge.cityGroups.map((cg, i) => (
                                <div key={i}>
                                  <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">📍 {cg.city}</p>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {cg.palets.map(p => {
                                      const clients = [...new Set(p.items.flatMap(i => i.clients.map(c => c.customerName)))].join(', ');
                                      return (
                                        <div key={p.id} className="border border-blue-200 rounded-lg p-2 bg-blue-50/30">
                                          <div className="flex justify-between mb-1">
                                            <p className="text-[10px] font-black text-blue-700">Palete {String(p.number).padStart(3, '0')}</p>
                                            <p className="text-[9px] text-muted-foreground">{paletUnits(p)} un · {paletWeight(p, products).toFixed(1)} kg</p>
                                          </div>
                                          <p className="text-[8px] text-muted-foreground">{clients}</p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Rotas */}
                          {charge?.routes?.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-[10px] font-black uppercase text-amber-700 flex items-center gap-1"><Home className="w-3.5 h-3.5" /> Batida</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {charge.routes.map((route, idx) => {
                                  const o = orders.find(o => o.id === route.orders[0]);
                                  return (
                                    <div key={route.id} className="border border-amber-200 rounded-lg p-2 bg-amber-50/30">
                                      <div className="flex justify-between">
                                        <p className="text-[10px] font-black text-amber-700">{idx + 1}. {o?.customerName || '—'}</p>
                                        <p className="text-[9px] text-muted-foreground">{route.totalUnits} un · {route.totalWeightKg.toFixed(1)} kg</p>
                                      </div>
                                      <p className="text-[8px] text-muted-foreground">📍 {route.destination}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2 pt-2 border-t">
                            <Button size="sm" variant="outline" className="gap-1.5 text-xs font-bold flex-1" onClick={() => printRomaneio(charge)}>
                              <Printer className="w-3.5 h-3.5" /> Romaneio
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1.5 text-xs font-bold flex-1" onClick={() => handleExport(charge)}>
                              <Download className="w-3.5 h-3.5" /> Exportar
                            </Button>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <OrderDetailsModal isOpen={!!detalhesOrder} order={detalhesOrder} products={products} onClose={() => setDetalhesOrder(null)} statusLabels={STATUS_LABELS} actions={[]} />
    </div>
  );
}