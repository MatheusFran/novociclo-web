'use client';

import { useSystemData } from '@/server/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  MapPin, Package, Truck, Plus, Trash2, Download, CheckCircle2,
  ChevronDown, ChevronUp, Printer, X, Box, Weight, ArrowLeft,
  ClipboardList, Layers,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useState, useMemo, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

interface PaletItem {
  productId: string;
  /** clientes que contribuem com esse produto neste palete */
  clients: { orderId: string; customerName: string; quantity: number }[];
}

interface Palet {
  id: string;
  number: number;
  /** itens consolidados (somados por produto) */
  items: PaletItem[];
}

interface CityGroup {
  city: string;
  orders: string[]; // orderIds
  palets: Palet[];
}

interface LoadingCharge {
  id: string;
  chargeNumber: string;
  cityGroups: CityGroup[];
  totalWeightKg: number;
  totalPalets: number;
  createdAt: string;
  observations: string;
}

// ─────────────────────────────────────────────
// STORAGE
// ─────────────────────────────────────────────

const STORAGE_KEY = 'novociclo_loading_charges_v2';

function loadFromStorage(): LoadingCharge[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveToStorage(charges: LoadingCharge[]) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(charges)); } catch { }
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function productWeight(products: any[], productId: string, qty: number) {
  return (products.find(p => p.id === productId)?.weight || 0) * qty;
}

function paletTotalWeight(palet: Palet, products: any[]) {
  return palet.items.reduce((sum, item) => {
    const totalQty = item.clients.reduce((s, c) => s + c.quantity, 0);
    return sum + productWeight(products, item.productId, totalQty);
  }, 0);
}

function paletTotalUnits(palet: Palet) {
  return palet.items.reduce((sum, item) =>
    sum + item.clients.reduce((s, c) => s + c.quantity, 0), 0);
}

function newPaletId() {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function chargeNumber(existing: number) {
  return `CRG-${format(new Date(), 'ddMMyy')}-${String(existing + 1).padStart(3, '0')}`;
}

// ─────────────────────────────────────────────
// ETIQUETA (print)
// ─────────────────────────────────────────────

function printLabel(palet: Palet, city: string, products: any[]) {
  const clientNames = [...new Set(palet.items.flatMap(i => i.clients.map(c => c.customerName)))].join(', ');
  const rows = palet.items.map(item => {
    const prod = products.find(p => p.id === item.productId);
    const qty = item.clients.reduce((s, c) => s + c.quantity, 0);
    const clientDetail = item.clients.map(c => `${c.customerName}: ${c.quantity}`).join(' | ');
    return `<tr>
      <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;">${prod?.name || item.productId}</td>
      <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center;font-weight:700;">${qty} ${prod?.uom || 'UN'}</td>
      <td style="padding:4px 8px;border:1px solid #ddd;font-size:10px;color:#555;">${clientDetail}</td>
      <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:right;">${productWeight(products, item.productId, qty).toFixed(1)} kg</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><title>Etiqueta Palete ${palet.number}</title>
  <style>body{font-family:monospace;margin:20px;}h1{font-size:22px;margin:0;}h2{font-size:14px;color:#555;margin:4px 0 12px;}table{width:100%;border-collapse:collapse;}th{background:#222;color:#fff;padding:5px 8px;font-size:11px;text-align:left;}tfoot td{background:#f0f0f0;font-weight:700;font-size:11px;padding:4px 8px;border:1px solid #ddd;}@media print{button{display:none}}</style>
  </head><body>
  <div style="border:3px solid #222;padding:16px;max-width:600px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
      <div><h1>PALETE ${String(palet.number).padStart(3, '0')}</h1><h2>📍 ${city}</h2></div>
      <div style="text-align:right;font-size:11px;color:#555;">${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
    </div>
    <div style="background:#f8f8f8;border:1px solid #ddd;border-radius:4px;padding:8px 12px;margin-bottom:12px;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#888;margin-bottom:2px;">Cliente(s)</div>
      <div style="font-size:13px;font-weight:700;">${clientNames}</div>
    </div>
    <table><thead><tr><th>Produto</th><th>Qtd</th><th>Detalhes</th><th>Peso</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr>
      <td colspan="2">TOTAL</td>
      <td></td>
      <td style="text-align:right;">${paletTotalWeight(palet, products).toFixed(1)} kg</td>
    </tr></tfoot></table>
    <div style="margin-top:16px;border-top:2px dashed #ccc;padding-top:10px;">
      <div style="display:flex;justify-content:space-between;font-size:10px;color:#888;">
        <span>${paletTotalUnits(palet)} unidades</span>
        <span>${paletTotalWeight(palet, products).toFixed(1)} kg</span>
      </div>
    </div>
  </div>
  <button onclick="window.print()" style="margin-top:12px;padding:8px 16px;cursor:pointer;">🖨️ Imprimir</button>
  </body></html>`;

  const win = window.open('', '_blank');
  win?.document.write(html);
  win?.document.close();
}

// ─────────────────────────────────────────────
// COMPONENTE: EDITOR DE PALETE
// ─────────────────────────────────────────────

interface PaletEditorProps {
  palet: Palet;
  availableItems: { productId: string; productName: string; uom: string; perOrder: { orderId: string; customerName: string; remaining: number }[] }[];
  products: any[];
  onUpdate: (p: Palet) => void;
  onDelete: () => void;
  city: string;
  paletIndex: number;
  totalPalets: number;
}

function PaletEditor({ palet, availableItems, products, onUpdate, onDelete, city, paletIndex, totalPalets }: PaletEditorProps) {
  const [addProductId, setAddProductId] = useState('');
  const [addOrderId, setAddOrderId] = useState('');
  const [addQty, setAddQty] = useState(1);

  const weight = paletTotalWeight(palet, products);
  const units = paletTotalUnits(palet);

  const handleAddItem = () => {
    if (!addProductId || !addOrderId || addQty <= 0) return;
    const order = availableItems.find(a => a.productId === addProductId)
      ?.perOrder.find(o => o.orderId === addOrderId);
    if (!order) return;

    const updated = { ...palet };
    const existingItem = updated.items.find(i => i.productId === addProductId);
    if (existingItem) {
      const existingClient = existingItem.clients.find(c => c.orderId === addOrderId);
      if (existingClient) {
        existingClient.quantity += addQty;
      } else {
        existingItem.clients.push({ orderId: addOrderId, customerName: order.customerName, quantity: addQty });
      }
    } else {
      updated.items = [...updated.items, {
        productId: addProductId,
        clients: [{ orderId: addOrderId, customerName: order.customerName, quantity: addQty }],
      }];
    }
    onUpdate(updated);
    setAddProductId('');
    setAddOrderId('');
    setAddQty(1);
  };

  const handleRemoveClient = (productId: string, orderId: string) => {
    const updated = { ...palet };
    const item = updated.items.find(i => i.productId === productId);
    if (!item) return;
    item.clients = item.clients.filter(c => c.orderId !== orderId);
    if (item.clients.length === 0) {
      updated.items = updated.items.filter(i => i.productId !== productId);
    }
    onUpdate(updated);
  };

  const handleUpdateQty = (productId: string, orderId: string, qty: number) => {
    if (qty <= 0) { handleRemoveClient(productId, orderId); return; }
    const updated = { ...palet };
    const item = updated.items.find(i => i.productId === productId);
    const client = item?.clients.find(c => c.orderId === orderId);
    if (client) { client.quantity = qty; onUpdate(updated); }
  };

  const selectedProductAvailable = availableItems.find(a => a.productId === addProductId);

  return (
    <div className="bg-white border-2 border-dashed border-primary/30 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-black text-primary-foreground">{String(palet.number).padStart(3, '0')}</span>
          </div>
          <div>
            <p className="text-xs font-black uppercase">Palete {palet.number}</p>
            <p className="text-[9px] text-muted-foreground">{city}</p>
          </div>
          <Badge variant="secondary" className="text-[8px] ml-1">{units} un</Badge>
          <Badge variant="secondary" className="text-[8px]">{weight.toFixed(1)} kg</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-[10px] font-bold text-muted-foreground"
            onClick={() => printLabel(palet, city, products)}>
            <Printer className="w-3 h-3" /> Etiqueta
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
            onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Itens */}
      {palet.items.length > 0 && (
        <div className="bg-zinc-50 rounded-lg divide-y divide-zinc-100">
          {palet.items.map(item => {
            const prod = products.find(p => p.id === item.productId);
            const totalQty = item.clients.reduce((s, c) => s + c.quantity, 0);
            return (
              <div key={item.productId} className="px-3 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black uppercase">{prod?.name || item.productId}</span>
                  <span className="text-[10px] font-black text-primary">{totalQty} {prod?.uom || 'UN'} · {productWeight(products, item.productId, totalQty).toFixed(1)}kg</span>
                </div>
                {item.clients.map(client => (
                  <div key={client.orderId} className="flex items-center justify-between py-0.5 pl-3 text-[9px] text-muted-foreground">
                    <span>{client.customerName}</span>
                    <div className="flex items-center gap-1">
                      <button className="w-4 h-4 flex items-center justify-center hover:text-primary"
                        onClick={() => handleUpdateQty(item.productId, client.orderId, client.quantity - 1)}>−</button>
                      <span className="font-bold w-6 text-center">{client.quantity}</span>
                      <button className="w-4 h-4 flex items-center justify-center hover:text-primary"
                        onClick={() => handleUpdateQty(item.productId, client.orderId, client.quantity + 1)}>+</button>
                      <button className="w-4 h-4 flex items-center justify-center text-red-400 hover:text-red-600 ml-1"
                        onClick={() => handleRemoveClient(item.productId, client.orderId)}>
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {palet.items.length === 0 && (
        <p className="text-[9px] text-muted-foreground text-center py-3 italic">Palete vazio — adicione itens abaixo</p>
      )}

      {/* Adicionar item */}
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
              {selectedProductAvailable?.perOrder.filter(o => o.remaining > 0).map(o => (
                <SelectItem key={o.orderId} value={o.orderId} className="text-xs">
                  {o.customerName} ({o.remaining} disp.)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-1.5">
          <Input
            type="number" min={1}
            value={addQty}
            onChange={e => setAddQty(Math.max(1, Number(e.target.value)))}
            className="h-7 text-xs w-20"
            disabled={!addOrderId}
          />
          <Button size="sm" className="h-7 flex-1 text-[10px] font-black gap-1"
            onClick={handleAddItem}
            disabled={!addProductId || !addOrderId || addQty <= 0}>
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

type Step = 'history' | 'select' | 'paleting';

export default function CarregamentoPage() {
  const { orders, products, isReady } = useSystemData();
  const [charges, setCharges] = useState<LoadingCharge[]>([]);
  const [step, setStep] = useState<Step>('history');
  const [expandedCharge, setExpandedCharge] = useState<string | null>(null);

  // Step select
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [observations, setObservations] = useState('');

  // Step paleting — mapa de city -> paletes
  const [cityPalets, setCityPalets] = useState<Record<string, Palet[]>>({});
  const [expandedCities, setExpandedCities] = useState<Record<string, boolean>>({});

  // Modal confirmação fechar
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => { setCharges(loadFromStorage()); }, []);

  // ── Pedidos disponíveis ──
  const availableOrders = useMemo(() =>
    orders.filter(o => o.status === 'AGUARDANDO_FATURAMENTO')
      .sort((a, b) => (a.city || '').localeCompare(b.city || '')),
    [orders]);

  const groupedAvailable = useMemo(() => {
    return availableOrders.reduce((acc, o) => {
      const city = o.city || 'Sem Cidade';
      if (!acc[city]) acc[city] = [];
      acc[city].push(o);
      return acc;
    }, {} as Record<string, typeof availableOrders>);
  }, [availableOrders]);

  // ── Pedidos selecionados agrupados por cidade ──
  const selectedOrders = useMemo(() =>
    orders.filter(o => selectedOrderIds.includes(o.id)), [orders, selectedOrderIds]);

  const selectedByCity = useMemo(() => {
    return selectedOrders.reduce((acc, o) => {
      const city = o.city || 'Sem Cidade';
      if (!acc[city]) acc[city] = [];
      acc[city].push(o);
      return acc;
    }, {} as Record<string, typeof selectedOrders>);
  }, [selectedOrders]);

  // ── Available items por cidade (quanto falta alocar) ──
  function getAvailableForCity(city: string) {
    const cityOrders = selectedByCity[city] || [];
    const palets = cityPalets[city] || [];

    // mapa: productId -> { orderId -> quantidade já alocada }
    const allocated: Record<string, Record<string, number>> = {};
    palets.forEach(p => {
      p.items.forEach(item => {
        if (!allocated[item.productId]) allocated[item.productId] = {};
        item.clients.forEach(c => {
          allocated[item.productId][c.orderId] = (allocated[item.productId][c.orderId] || 0) + c.quantity;
        });
      });
    });

    const result: {
      productId: string;
      productName: string;
      uom: string;
      perOrder: { orderId: string; customerName: string; remaining: number }[];
    }[] = [];

    const productMap: Record<string, typeof result[0]> = {};

    cityOrders.forEach(order => {
      order.items.forEach((item: any) => {
        const prod = products.find((p: any) => p.id === item.productId);
        if (!productMap[item.productId]) {
          productMap[item.productId] = {
            productId: item.productId,
            productName: prod?.name || item.productId,
            uom: prod?.uom || 'UN',
            perOrder: [],
          };
        }
        const allocatedQty = allocated[item.productId]?.[order.id] || 0;
        const remaining = item.quantity - allocatedQty;
        productMap[item.productId].perOrder.push({
          orderId: order.id,
          customerName: order.customerName,
          remaining,
        });
      });
    });

    return Object.values(productMap);
  }

  // ── Total alocado vs total necessário por cidade ──
  function cityProgress(city: string) {
    const cityOrders = selectedByCity[city] || [];
    const totalNeeded = cityOrders.reduce((s, o) =>
      s + o.items.reduce((ss: number, i: any) => ss + i.quantity, 0), 0);
    const palets = cityPalets[city] || [];
    const totalAllocated = palets.reduce((s, p) => s + paletTotalUnits(p), 0);
    return { totalNeeded, totalAllocated, done: totalAllocated >= totalNeeded };
  }

  const toggleOrder = (orderId: string) => {
    setSelectedOrderIds(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]);
  };

  const toggleCityOrders = (city: string) => {
    const cityIds = groupedAvailable[city].map(o => o.id);
    const allSelected = cityIds.every(id => selectedOrderIds.includes(id));
    setSelectedOrderIds(prev =>
      allSelected ? prev.filter(id => !cityIds.includes(id)) : [...new Set([...prev, ...cityIds])]);
  };

  const goToPaleting = () => {
    if (selectedOrderIds.length === 0) {
      toast({ variant: 'destructive', title: 'Selecione pedidos' });
      return;
    }
    // Inicializa paletes vazios por cidade
    const init: Record<string, Palet[]> = {};
    Object.keys(selectedByCity).forEach(city => { init[city] = []; });
    setCityPalets(init);
    const expanded: Record<string, boolean> = {};
    Object.keys(selectedByCity).forEach(city => { expanded[city] = true; });
    setExpandedCities(expanded);
    setStep('paleting');
  };

  const addPalet = (city: string) => {
    setCityPalets(prev => {
      const existing = prev[city] || [];
      const allNumbers = Object.values(prev).flat().map(p => p.number);
      const maxNum = allNumbers.length > 0 ? Math.max(...allNumbers) : 0;
      return {
        ...prev,
        [city]: [...existing, { id: newPaletId(), number: maxNum + 1, items: [] }],
      };
    });
  };

  const updatePalet = (city: string, paletIdx: number, updated: Palet) => {
    setCityPalets(prev => ({
      ...prev,
      [city]: prev[city].map((p, i) => i === paletIdx ? updated : p),
    }));
  };

  const deletePalet = (city: string, paletIdx: number) => {
    setCityPalets(prev => ({
      ...prev,
      [city]: prev[city].filter((_, i) => i !== paletIdx),
    }));
  };

  const handleSaveCharge = () => {
    const allPalets = Object.values(cityPalets).flat();
    if (allPalets.length === 0) {
      toast({ variant: 'destructive', title: 'Crie ao menos um palete' });
      return;
    }
    setIsConfirmOpen(true);
  };

  const confirmSave = () => {
    const allPalets = Object.values(cityPalets).flat();
    const totalWeightKg = allPalets.reduce((s, p) => s + paletTotalWeight(p, products), 0);

    const cityGroups: CityGroup[] = Object.entries(cityPalets).map(([city, palets]) => ({
      city,
      orders: selectedByCity[city]?.map(o => o.id) || [],
      palets,
    }));

    const charge: LoadingCharge = {
      id: `chg_${Date.now()}`,
      chargeNumber: chargeNumber(charges.length),
      cityGroups,
      totalWeightKg,
      totalPalets: allPalets.length,
      createdAt: new Date().toISOString(),
      observations,
    };

    const updated = [charge, ...charges];
    setCharges(updated);
    saveToStorage(updated);
    toast({ title: 'Carga fechada!', description: `${charge.chargeNumber} · ${allPalets.length} paletes · ${totalWeightKg.toFixed(1)} kg` });

    // Reset
    setSelectedOrderIds([]);
    setCityPalets({});
    setObservations('');
    setIsConfirmOpen(false);
    setStep('history');
  };

  const handleExport = (charge: LoadingCharge) => {
    const rows: any[] = [];
    charge.cityGroups.forEach(cg => {
      cg.palets.forEach(palet => {
        palet.items.forEach(item => {
          const prod = products.find((p: any) => p.id === item.productId);
          const totalQty = item.clients.reduce((s, c) => s + c.quantity, 0);
          item.clients.forEach(client => {
            rows.push({
              CARGA: charge.chargeNumber,
              CIDADE: cg.city,
              PALETE: palet.number,
              CLIENTE: client.customerName,
              PRODUTO: prod?.name || item.productId,
              QUANTIDADE: client.quantity,
              TOTAL_PALETE: totalQty,
              UOM: prod?.uom || 'UN',
              PESO_KG: productWeight(products, item.productId, client.quantity).toFixed(1),
            });
          });
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Carga');
    XLSX.writeFile(wb, `${charge.chargeNumber}.xlsx`);
  };

  const printRomaneio = (charge: LoadingCharge) => {
    const cityBlocks = charge.cityGroups.map(cg => {
      const paletRows = cg.palets.map(p => {
        const clients = [...new Set(p.items.flatMap(i => i.clients.map(c => c.customerName)))].join(', ');
        const itemRows = p.items.map(item => {
          const prod = products.find((pp: any) => pp.id === item.productId);
          const qty = item.clients.reduce((s, c) => s + c.quantity, 0);
          return `<tr>
            <td style="padding:3px 6px;border:1px solid #ddd;font-size:10px;">${prod?.name || item.productId}</td>
            <td style="padding:3px 6px;border:1px solid #ddd;font-size:10px;text-align:center;">${qty} ${prod?.uom || 'UN'}</td>
            <td style="padding:3px 6px;border:1px solid #ddd;font-size:10px;text-align:right;">${paletTotalWeight(p, products).toFixed(1)} kg</td>
          </tr>`;
        }).join('');
        return `<div style="margin-bottom:8px;border:1px solid #ddd;border-radius:4px;padding:8px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <strong style="font-size:11px;">Palete ${String(p.number).padStart(3, '0')}</strong>
            <span style="font-size:10px;color:#555;">${clients}</span>
          </div>
          <table style="width:100%;border-collapse:collapse;"><tbody>${itemRows}</tbody></table>
        </div>`;
      }).join('');
      return `<div style="margin-bottom:20px;page-break-inside:avoid;">
        <h3 style="font-size:13px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #222;padding-bottom:4px;margin-bottom:8px;">📍 ${cg.city}</h3>
        ${paletRows}
      </div>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><title>Romaneio ${charge.chargeNumber}</title>
    <style>body{font-family:monospace;margin:24px;}h1{font-size:20px;}@media print{button{display:none}}</style>
    </head><body>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;border-bottom:3px solid #222;padding-bottom:12px;">
      <div><h1>ROMANEIO DE CARGA</h1><p style="font-size:12px;color:#555;margin:2px 0;">${charge.chargeNumber} · ${format(new Date(charge.createdAt), 'dd/MM/yyyy HH:mm')}</p></div>
      <div style="text-align:right;font-size:11px;"><p><strong>${charge.totalPalets} paletes</strong></p><p>${charge.totalWeightKg.toFixed(1)} kg</p></div>
    </div>
    ${cityBlocks}
    <button onclick="window.print()" style="margin-top:16px;padding:8px 20px;cursor:pointer;">🖨️ Imprimir</button>
    </body></html>`;

    const win = window.open('', '_blank');
    win?.document.write(html);
    win?.document.close();
  };

  if (!isReady) return null;

  const totalWeightPending = availableOrders.reduce((s, o) => s + (o.totalWeight || 0), 0);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4">
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Para Carregar</p>
            <p className="text-2xl font-black">{availableOrders.length} <span className="text-sm font-bold text-muted-foreground">pedidos</span></p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4">
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Cargas Fechadas</p>
            <p className="text-2xl font-black text-green-600">{charges.length}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4">
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Peso Pendente</p>
            <p className="text-2xl font-black text-amber-600">{(totalWeightPending / 1000).toFixed(1)} <span className="text-sm font-bold">ton</span></p>
          </CardContent>
        </Card>
      </div>

      {/* ══════════════════════════════════════════
          STEP: HISTÓRICO
      ══════════════════════════════════════════ */}
      {step === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">Histórico de Cargas</h2>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Todas as cargas fechadas</p>
            </div>
            <Button className="gap-2 font-bold text-xs uppercase" onClick={() => setStep('select')}>
              <Plus className="w-4 h-4" /> Nova Carga
            </Button>
          </div>

          {charges.length === 0 && (
            <Card className="border-none shadow-sm">
              <CardContent className="py-16 text-center text-muted-foreground italic text-xs uppercase opacity-40">
                Nenhuma carga fechada ainda.
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {charges.map(charge => (
              <Collapsible
                key={charge.id}
                open={expandedCharge === charge.id}
                onOpenChange={() => setExpandedCharge(expandedCharge === charge.id ? null : charge.id)}>
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
                            <p className="text-[9px] text-muted-foreground">
                              {charge.cityGroups.length} cidade(s) · {charge.totalPalets} paletes · {charge.totalWeightKg.toFixed(1)} kg
                            </p>
                          </div>
                          <Badge className="bg-green-100 text-green-800 border-green-200 text-[9px] font-black">✓ Fechada</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-muted-foreground">{format(new Date(charge.createdAt), 'dd/MM HH:mm')}</span>
                          {expandedCharge === charge.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="px-4 pb-4 pt-0 border-t space-y-4">
                      {charge.observations && (
                        <p className="text-[10px] text-muted-foreground bg-muted/30 rounded p-2">{charge.observations}</p>
                      )}
                      {charge.cityGroups.map((cg, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-primary" />
                            <h4 className="text-[10px] font-black uppercase">{cg.city}</h4>
                            <Badge variant="outline" className="text-[8px]">{cg.palets.length} paletes</Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {cg.palets.map(palet => {
                              const clients = [...new Set(palet.items.flatMap(i => i.clients.map(c => c.customerName)))];
                              return (
                                <div key={palet.id} className="bg-zinc-50 border rounded-lg p-2.5">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] font-black">Palete {String(palet.number).padStart(3, '0')}</span>
                                    <span className="text-[9px] text-muted-foreground">{paletTotalWeight(palet, products).toFixed(1)}kg</span>
                                  </div>
                                  <p className="text-[8px] text-muted-foreground mb-1.5">{clients.join(', ')}</p>
                                  {palet.items.map(item => {
                                    const prod = products.find((p: any) => p.id === item.productId);
                                    const qty = item.clients.reduce((s, c) => s + c.quantity, 0);
                                    return (
                                      <p key={item.productId} className="text-[8px] text-zinc-600">
                                        {prod?.name} × {qty}
                                      </p>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs font-bold"
                          onClick={() => printRomaneio(charge)}>
                          <Printer className="w-3.5 h-3.5" /> Romaneio
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs font-bold"
                          onClick={() => handleExport(charge)}>
                          <Download className="w-3.5 h-3.5" /> Exportar XLSX
                        </Button>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          STEP: SELECIONAR PEDIDOS
      ══════════════════════════════════════════ */}
      {step === 'select' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="gap-1.5 font-bold text-xs"
              onClick={() => { setStep('history'); setSelectedOrderIds([]); }}>
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </Button>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">Selecionar Pedidos</h2>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">
                Escolha os pedidos desta carga — agrupados por cidade
              </p>
            </div>
          </div>

          {availableOrders.length === 0 && (
            <Card className="border-none shadow-sm">
              <CardContent className="py-16 text-center text-muted-foreground italic text-xs uppercase opacity-40">
                Nenhum pedido aguardando faturamento.
              </CardContent>
            </Card>
          )}

          {Object.entries(groupedAvailable).map(([city, cityOrders]) => {
            const cityIds = cityOrders.map(o => o.id);
            const allSelected = cityIds.every(id => selectedOrderIds.includes(id));
            const someSelected = cityIds.some(id => selectedOrderIds.includes(id));
            const totalSacos = cityOrders.reduce((s, o) =>
              s + o.items.reduce((ss: number, i: any) => ss + i.quantity, 0), 0);
            const totalKg = cityOrders.reduce((s, o) => s + (o.totalWeight || 0), 0);

            return (
              <div key={city} className="border rounded-xl overflow-hidden shadow-sm">
                {/* Cabeçalho da cidade */}
                <div className="bg-primary/5 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                      onChange={() => toggleCityOrders(city)}
                      className="w-4 h-4 accent-primary cursor-pointer"
                    />
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">{city}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] bg-white">{cityOrders.length} ped.</Badge>
                    <Badge variant="outline" className="text-[9px] bg-white">{totalSacos} un</Badge>
                    <Badge variant="outline" className="text-[9px] bg-white">{totalKg.toFixed(1)} kg</Badge>
                  </div>
                </div>

                {/* Pedidos da cidade */}
                <div className="divide-y bg-white">
                  {cityOrders.map(order => {
                    const isSelected = selectedOrderIds.includes(order.id);
                    const sacos = order.items.reduce((s: number, i: any) => s + i.quantity, 0);
                    return (
                      <div
                        key={order.id}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/20'}`}
                        onClick={() => toggleOrder(order.id)}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOrder(order.id)}
                          className="w-4 h-4 accent-primary cursor-pointer"
                          onClick={e => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-black text-primary">{order.id}</span>
                            <span className="text-[11px] font-black uppercase truncate">{order.customerName}</span>
                          </div>
                          <p className="text-[9px] text-muted-foreground">{order.customerAddress || '---'}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="outline" className="text-[9px]">{sacos} un</Badge>
                          <Badge variant="outline" className="text-[9px]">{(order.totalWeight || 0).toFixed(1)} kg</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Resumo seleção + obs */}
          {selectedOrderIds.length > 0 && (
            <Card className="border-none shadow-sm bg-primary text-primary-foreground">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4 flex-wrap">
                    {[
                      { label: 'Pedidos', value: selectedOrderIds.length },
                      { label: 'Cidades', value: Object.keys(selectedByCity).length },
                      { label: 'Sacos', value: selectedOrders.reduce((s, o) => s + o.items.reduce((ss: number, i: any) => ss + i.quantity, 0), 0) },
                      { label: 'Peso', value: `${selectedOrders.reduce((s, o) => s + (o.totalWeight || 0), 0).toFixed(1)} kg` },
                    ].map(item => (
                      <div key={item.label}>
                        <p className="text-[9px] font-black uppercase opacity-70">{item.label}</p>
                        <p className="text-sm font-black">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <Button
                    className="bg-white text-primary hover:bg-white/90 font-black text-xs uppercase gap-2"
                    onClick={goToPaleting}>
                    <Layers className="w-3.5 h-3.5" /> Montar Paletes
                  </Button>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase opacity-70">Observações (opcional)</label>
                  <Input
                    placeholder="Ex: Veículo Volvo ABC-1234 — motorista João"
                    className="mt-1 h-8 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    value={observations}
                    onChange={e => setObservations(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          STEP: MONTAR PALETES
      ══════════════════════════════════════════ */}
      {step === 'paleting' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="gap-1.5 font-bold text-xs"
              onClick={() => setStep('select')}>
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </Button>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">Montagem de Paletes</h2>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">
                {selectedOrderIds.length} pedidos · {Object.keys(selectedByCity).length} cidade(s)
              </p>
            </div>
          </div>

          {/* Por cidade */}
          {Object.entries(selectedByCity).map(([city, cityOrders]) => {
            const palets = cityPalets[city] || [];
            const progress = cityProgress(city);
            const isExpanded = expandedCities[city] !== false;
            const totalKg = cityOrders.reduce((s, o) => s + (o.totalWeight || 0), 0);

            return (
              <div key={city} className="border rounded-xl overflow-hidden shadow-sm">
                {/* Header da cidade */}
                <div
                  className={`px-4 py-3 flex items-center justify-between cursor-pointer ${progress.done ? 'bg-green-50 border-green-200' : 'bg-primary/5'}`}
                  onClick={() => setExpandedCities(prev => ({ ...prev, [city]: !isExpanded }))}>
                  <div className="flex items-center gap-3">
                    <MapPin className={`w-3.5 h-3.5 ${progress.done ? 'text-green-600' : 'text-primary'}`} />
                    <h3 className={`text-[10px] font-black uppercase tracking-widest ${progress.done ? 'text-green-700' : 'text-primary'}`}>{city}</h3>
                    {progress.done && <Badge className="bg-green-100 text-green-700 border-green-200 text-[8px]">✓ Completo</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] bg-white">{cityOrders.length} ped.</Badge>
                    <Badge variant="outline" className="text-[9px] bg-white">{totalKg.toFixed(1)} kg</Badge>
                    <Badge variant="outline" className={`text-[9px] bg-white ${progress.done ? 'border-green-300 text-green-700' : ''}`}>
                      {progress.totalAllocated}/{progress.totalNeeded} un alocadas
                    </Badge>
                    <Badge variant="outline" className="text-[9px] bg-white">{palets.length} paletes</Badge>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="bg-white p-4 space-y-4">
                    {/* Resumo dos pedidos da cidade */}
                    <div className="bg-zinc-50 rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-zinc-100">
                        <p className="text-[9px] font-black uppercase text-muted-foreground">Pedidos desta cidade</p>
                      </div>
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
                            order.items.map((item: any) => {
                              const prod = products.find((p: any) => p.id === item.productId);
                              // calc alocado
                              const alocado = palets.reduce((s, p) => {
                                const paletItem = p.items.find(pi => pi.productId === item.productId);
                                const client = paletItem?.clients.find(c => c.orderId === order.id);
                                return s + (client?.quantity || 0);
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
                      {palets.map((palet, paletIdx) => (
                        <PaletEditor
                          key={palet.id}
                          palet={palet}
                          availableItems={getAvailableForCity(city)}
                          products={products}
                          onUpdate={(updated) => updatePalet(city, paletIdx, updated)}
                          onDelete={() => deletePalet(city, paletIdx)}
                          city={city}
                          paletIndex={paletIdx}
                          totalPalets={palets.length}
                        />
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      className="w-full gap-2 font-bold text-xs uppercase border-dashed"
                      onClick={() => addPalet(city)}>
                      <Plus className="w-3.5 h-3.5" /> Adicionar Palete para {city}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Resumo geral + botão fechar */}
          <Card className="border-none shadow-sm bg-zinc-900 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-6 flex-wrap">
                  {[
                    { label: 'Total Paletes', value: Object.values(cityPalets).flat().length },
                    { label: 'Total Unidades', value: Object.values(cityPalets).flat().reduce((s, p) => s + paletTotalUnits(p), 0) },
                    { label: 'Peso Total', value: `${Object.values(cityPalets).flat().reduce((s, p) => s + paletTotalWeight(p, products), 0).toFixed(1)} kg` },
                  ].map(item => (
                    <div key={item.label}>
                      <p className="text-[9px] font-black uppercase opacity-50">{item.label}</p>
                      <p className="text-xl font-black">{item.value}</p>
                    </div>
                  ))}
                </div>
                <Button
                  className="bg-green-500 hover:bg-green-400 text-white font-black text-xs uppercase gap-2"
                  onClick={handleSaveCharge}>
                  <CheckCircle2 className="w-4 h-4" /> Fechar Carga
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL: CONFIRMAR FECHAR CARGA
      ══════════════════════════════════════════ */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black uppercase">Confirmar Fechamento</DialogTitle>
            <DialogDescription className="text-[10px] uppercase font-bold">
              Revise antes de fechar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 text-sm">
            <div className="bg-muted/30 rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-[10px] font-bold">
                <span>Pedidos</span><span>{selectedOrderIds.length}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold">
                <span>Cidades</span><span>{Object.keys(selectedByCity).join(', ')}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold">
                <span>Paletes</span><span>{Object.values(cityPalets).flat().length}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold">
                <span>Peso</span>
                <span>{Object.values(cityPalets).flat().reduce((s, p) => s + paletTotalWeight(p, products), 0).toFixed(1)} kg</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              O status dos pedidos <strong>não será alterado</strong> — isso é feito no processo fiscal separado.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsConfirmOpen(false)} className="font-bold text-xs uppercase">Cancelar</Button>
            <Button onClick={confirmSave} className="font-black text-xs uppercase gap-2 bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}