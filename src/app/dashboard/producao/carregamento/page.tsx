'use client';

import { useSystemData } from '@/server/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Package, TrendingUp, Truck, MapPin, Weight, ChevronDown, Search, Plus, Trash2,
  Download, CheckCircle2, Phone, Box, GripVertical, ChevronUp, Pencil, X, Check,
  ArrowUp, ArrowDown, PlusCircle, MinusCircle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Order, OrderItem } from '@/lib/types';
import { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────
interface PaletItem {
  orderId: string;
  productId: string;
  quantity: number;
}

interface Palet {
  id: string;
  number: number;
  items: PaletItem[];
  weight: number;
}

interface CityDelivery {
  city: string;
  loadOrder: 'PRIMEIRO' | 'ULTIMO';
  deliveries: Array<{
    orderId: string;
    customerName: string;
    customerPhone?: string;
    palets: Palet[];
  }>;
}

interface LoadingCharge {
  id: string;
  chargeNumber: string;
  ordersIds: string[];
  cityDeliveries: CityDelivery[];
  totalWeight: number;
  totalItems: number;
  totalPalets: number;
  createdAt: string;
  status: 'PREPARACAO' | 'CARREGADO' | 'SAIU_ENTREGA';
  observations: string;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function loadChargesFromStorage(): LoadingCharge[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem('novociclo_loading_charges');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveChargesToStorage(charges: LoadingCharge[]) {
  try {
    window.localStorage.setItem('novociclo_loading_charges', JSON.stringify(charges));
  } catch { }
}

function calculateItemWeight(productId: string, quantity: number, products: any[]): number {
  const product = products.find(p => p.id === productId);
  return ((product?.weight || 0) * quantity);
}

function calculatePaletWeight(palet: Palet, products: any[]): number {
  return palet.items.reduce((total, item) =>
    total + calculateItemWeight(item.productId, item.quantity, products), 0);
}

function calculateTotalItems(items: OrderItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}

function renumberPalets(cityDeliveries: CityDelivery[]): CityDelivery[] {
  let paletCounter = 1;
  return cityDeliveries.map(city => ({
    ...city,
    deliveries: city.deliveries.map(delivery => ({
      ...delivery,
      palets: delivery.palets.map(palet => ({
        ...palet,
        number: paletCounter++,
      })),
    })),
  }));
}

// ─────────────────────────────────────────────
// EDITOR DE PALETE
// ─────────────────────────────────────────────
interface PaletEditorProps {
  palet: Palet;
  products: any[];
  allProducts: any[];
  onUpdate: (updated: Palet) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function PaletEditor({ palet, products, allProducts, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: PaletEditorProps) {
  const [addingProduct, setAddingProduct] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);

  const paletWeight = calculatePaletWeight(palet, allProducts);
  const paletItems = palet.items.reduce((sum, item) => sum + item.quantity, 0);

  const handleUpdateQty = (idx: number, qty: number) => {
    if (qty <= 0) {
      const items = palet.items.filter((_, i) => i !== idx);
      onUpdate({ ...palet, items });
    } else {
      const items = palet.items.map((item, i) => i === idx ? { ...item, quantity: qty } : item);
      onUpdate({ ...palet, items });
    }
  };

  const handleRemoveItem = (idx: number) => {
    const items = palet.items.filter((_, i) => i !== idx);
    onUpdate({ ...palet, items });
  };

  const handleAddProduct = () => {
    if (!selectedProductId) return;
    const exists = palet.items.findIndex(i => i.productId === selectedProductId);
    if (exists >= 0) {
      const items = palet.items.map((item, i) =>
        i === exists ? { ...item, quantity: item.quantity + selectedQty } : item
      );
      onUpdate({ ...palet, items });
    } else {
      const items = [...palet.items, {
        orderId: palet.items[0]?.orderId || '',
        productId: selectedProductId,
        quantity: selectedQty,
      }];
      onUpdate({ ...palet, items });
    }
    setSelectedProductId('');
    setSelectedQty(1);
    setAddingProduct(false);
  };

  return (
    <div className="bg-white border border-dashed border-primary/40 rounded-lg p-2 sm:p-3">
      {/* Header do palete */}
      <div className="flex items-center justify-between mb-2 gap-1">
        <div className="flex items-center gap-1.5">
          <Box className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <span className="text-[10px] sm:text-xs font-black text-primary">Palete {palet.number}</span>
          <Badge variant="secondary" className="text-[8px] px-1.5 py-0">{paletWeight.toFixed(0)} kg</Badge>
          <Badge variant="secondary" className="text-[8px] px-1.5 py-0">{paletItems} un</Badge>
        </div>
        <div className="flex items-center gap-0.5">
          {!isFirst && (
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onMoveUp}>
              <ArrowUp className="w-3 h-3" />
            </Button>
          )}
          {!isLast && (
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onMoveDown}>
              <ArrowDown className="w-3 h-3" />
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400 hover:text-red-600" onClick={onDelete}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Itens do palete */}
      <div className="space-y-1 bg-gray-50 rounded p-1.5">
        {palet.items.length === 0 && (
          <p className="text-[9px] text-muted-foreground text-center py-1 italic">Palete vazio</p>
        )}
        {palet.items.map((item, itemIdx) => {
          const product = allProducts.find(p => p.id === item.productId);
          const itemWeight = calculateItemWeight(item.productId, item.quantity, allProducts);
          return (
            <div key={itemIdx} className="flex items-center justify-between gap-1 py-0.5 px-1 rounded hover:bg-white">
              <span className="text-[9px] sm:text-[10px] font-medium flex-1 truncate">
                {product?.name || item.productId}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  size="sm" variant="ghost" className="h-5 w-5 p-0"
                  onClick={() => handleUpdateQty(itemIdx, item.quantity - 1)}
                >
                  <MinusCircle className="w-3 h-3 text-muted-foreground" />
                </Button>
                <span className="text-[9px] font-bold w-8 text-center">{item.quantity} {product?.uom || 'UN'}</span>
                <Button
                  size="sm" variant="ghost" className="h-5 w-5 p-0"
                  onClick={() => handleUpdateQty(itemIdx, item.quantity + 1)}
                >
                  <PlusCircle className="w-3 h-3 text-muted-foreground" />
                </Button>
                <span className="text-[8px] text-muted-foreground w-10 text-right">{itemWeight.toFixed(0)}kg</span>
                <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-red-400" onClick={() => handleRemoveItem(itemIdx)}>
                  <X className="w-2.5 h-2.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Adicionar produto */}
      {addingProduct ? (
        <div className="flex gap-1 mt-2 flex-wrap">
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger className="h-7 text-[10px] flex-1 min-w-32">
              <SelectValue placeholder="Produto..." />
            </SelectTrigger>
            <SelectContent>
              {allProducts.map(p => (
                <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={1}
            value={selectedQty}
            onChange={e => setSelectedQty(Number(e.target.value))}
            className="h-7 w-16 text-[10px] px-1"
          />
          <Button size="sm" className="h-7 px-2 text-[10px]" onClick={handleAddProduct} disabled={!selectedProductId}>
            <Check className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => setAddingProduct(false)}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <Button
          size="sm" variant="ghost"
          className="w-full h-6 mt-1.5 text-[9px] text-muted-foreground hover:text-primary gap-1"
          onClick={() => setAddingProduct(true)}
        >
          <Plus className="w-3 h-3" /> Adicionar produto
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function CarregamentoPage() {
  const { orders, products, isReady } = useSystemData();
  const [charges, setCharges] = useState<LoadingCharge[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [step, setStep] = useState<'vehicle' | 'orders' | 'paleting' | 'history'>('history');
  const [tempCharge, setTempCharge] = useState<LoadingCharge | null>(null);
  const [expandedCharge, setExpandedCharge] = useState<string | null>(null);

  useEffect(() => {
    setCharges(loadChargesFromStorage());
  }, []);

  const readyOrders = useMemo(() => {
    return orders
      .filter(o => o.status === 'AGUARDANDO_FATURAMENTO')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [orders]);

  const availableOrders = useMemo(() => {
    const chargedOrderIds = new Set(charges.flatMap(c => c.ordersIds));
    return readyOrders.filter(o => !chargedOrderIds.has(o.id)).filter(o =>
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [readyOrders, charges, searchTerm]);

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const handleSelectAllOrders = () => {
    if (selectedOrders.length === availableOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(availableOrders.map(o => o.id));
    }
  };

  const proceedToNextStep = () => {
    if (step === 'vehicle' && !selectedVehicle) {
      toast({ variant: "destructive", title: "Erro", description: "Selecione um veículo." });
      return;
    }
    if (step === 'orders' && selectedOrders.length === 0) {
      toast({ variant: "destructive", title: "Erro", description: "Selecione pelo menos um pedido." });
      return;
    }
    if (step === 'vehicle') setStep('orders');
    else if (step === 'orders') {
      const selectedOrdersData = readyOrders.filter(o => selectedOrders.includes(o.id));
      const newCharge: LoadingCharge = {
        id: `charge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        chargeNumber: `CRG-${format(new Date(), 'ddMMyy')}-${(charges.length + 1).toString().padStart(3, '0')}`,
        ordersIds: selectedOrders,
        cityDeliveries: [],
        totalWeight: selectedOrdersData.reduce((sum, o) => sum + (o.totalWeight || 0), 0),
        totalItems: selectedOrdersData.reduce((sum, o) => sum + calculateTotalItems(o.items), 0),
        totalPalets: 0,
        createdAt: new Date().toISOString(),
        status: 'PREPARACAO',
        observations: `Veículo: ${selectedVehicle}`,
      };
      setTempCharge(newCharge);
      setStep('paleting');
    }
  };

  const backStep = () => {
    if (step === 'orders') {
      setSelectedVehicle('');
      setStep('vehicle');
    } else if (step === 'paleting') {
      setTempCharge(null);
      setSelectedOrders([]);
      setStep('orders');
    }
  };

  const saveCharge = () => {
    if (!tempCharge || tempCharge.cityDeliveries.length === 0) {
      toast({ variant: "destructive", title: "Erro", description: "Crie pelo menos um palete." });
      return;
    }
    const finalCharge: LoadingCharge = {
      ...tempCharge,
      status: 'CARREGADO',
      totalPalets: tempCharge.cityDeliveries.reduce((sum, c) =>
        sum + c.deliveries.reduce((s, d) => s + d.palets.length, 0), 0),
    };
    const updated = [...charges, finalCharge];
    setCharges(updated);
    saveChargesToStorage(updated);
    toast({ title: "Carga Salva", description: `${finalCharge.chargeNumber} carregada com sucesso!` });
    setTempCharge(null);
    setSelectedVehicle('');
    setSelectedOrders([]);
    setStep('history');
  };

  // ── Funções de edição ──

  const updateCharge = (chargeId: string, updated: LoadingCharge) => {
    const renumbered = {
      ...updated,
      cityDeliveries: renumberPalets(updated.cityDeliveries),
      totalPalets: updated.cityDeliveries.reduce((sum, c) =>
        sum + c.deliveries.reduce((s, d) => s + d.palets.length, 0), 0),
    };
    const updatedList = charges.map(c => c.id === chargeId ? renumbered : c);
    setCharges(updatedList);
    saveChargesToStorage(updatedList);
  };

  const addPaletToTemp = (cityName: string) => {
    if (!tempCharge) return;
    let cities = tempCharge.cityDeliveries;
    let cityIdx = cities.findIndex(c => c.city === cityName);

    if (cityIdx === -1) {
      const newCity: CityDelivery = {
        city: cityName,
        loadOrder: cities.length === 0 ? 'PRIMEIRO' : 'ULTIMO',
        deliveries: [{ orderId: selectedOrders[0], customerName: readyOrders.find(o => o.id === selectedOrders[0])?.customerName || '', palets: [] }],
      };
      cities = [...cities, newCity];
      cityIdx = cities.length - 1;
    }

    const newPalet: Palet = {
      id: `palet_${Date.now()}_${Math.random()}`,
      number: Math.max(0, ...cities.flatMap(c => c.deliveries.flatMap(d => d.palets.map(p => p.number)))) + 1,
      items: [],
      weight: 0,
    };

    cities[cityIdx] = {
      ...cities[cityIdx],
      deliveries: cities[cityIdx].deliveries.map((d, idx) => idx === 0 ? { ...d, palets: [...d.palets, newPalet] } : d),
    };

    setTempCharge({ ...tempCharge, cityDeliveries: cities });
  };

  const updateTempPalet = (cityIdx: number, delIdx: number, paletIdx: number, updated: Palet) => {
    if (!tempCharge) return;
    const cities = [...tempCharge.cityDeliveries];
    const palets = cities[cityIdx].deliveries[delIdx].palets.map((p, i) => i === paletIdx ? updated : p);
    cities[cityIdx] = {
      ...cities[cityIdx],
      deliveries: cities[cityIdx].deliveries.map((d, i) => i === delIdx ? { ...d, palets } : d),
    };
    setTempCharge({ ...tempCharge, cityDeliveries: cities });
  };

  const deleteTempPalet = (cityIdx: number, delIdx: number, paletIdx: number) => {
    if (!tempCharge) return;
    const cities = [...tempCharge.cityDeliveries];
    const palets = cities[cityIdx].deliveries[delIdx].palets.filter((_, i) => i !== paletIdx);
    if (palets.length === 0) {
      const deliveries = cities[cityIdx].deliveries.filter((_, i) => i !== delIdx);
      if (deliveries.length === 0) {
        const newCities = cities.filter((_, i) => i !== cityIdx);
        setTempCharge(newCities.length > 0 ? { ...tempCharge, cityDeliveries: newCities } : null);
        return;
      }
      cities[cityIdx] = { ...cities[cityIdx], deliveries };
    } else {
      cities[cityIdx] = {
        ...cities[cityIdx],
        deliveries: cities[cityIdx].deliveries.map((d, i) => i === delIdx ? { ...d, palets } : d),
      };
    }
    setTempCharge({ ...tempCharge, cityDeliveries: cities });
  };

  const handleExportCharge = (charge: LoadingCharge) => {
    const rows: any[] = [];
    charge.cityDeliveries.forEach(cityDel => {
      cityDel.deliveries.forEach(delivery => {
        delivery.palets.forEach(palet => {
          const paletWeight = calculatePaletWeight(palet, products);
          palet.items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            const itemWeight = calculateItemWeight(item.productId, item.quantity, products);
            rows.push({
              'CARGA': charge.chargeNumber,
              'VEÍCULO': charge.observations.replace('Veículo: ', ''),
              'CLIENTE': delivery.customerName,
              'TELEFONE': delivery.customerPhone || '---',
              'PALETE': palet.number,
              'PESO_PALETE_KG': paletWeight.toFixed(0),
              'PRODUTO': product?.name || item.productId,
              'QUANTIDADE': item.quantity,
              'UOM': product?.uom || 'UN',
              'PESO_ITEM_KG': itemWeight.toFixed(0),
            });
          });
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Carga');
    XLSX.writeFile(wb, `${charge.chargeNumber}_${format(new Date(), 'ddMMyy')}.xlsx`);
  };

  if (!isReady) return null;

  const chargedCount = charges.filter(c => c.status === 'CARREGADO').length;
  const totalWeightForLoading = availableOrders.reduce((sum, o) => sum + (o.totalWeight || 0), 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
        <Card className="border-none shadow-md">
          <CardContent className="p-3 sm:pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[8px] sm:text-[9px] font-black uppercase text-muted-foreground mb-0.5">Para Carregar</p>
                <p className="text-xl sm:text-2xl font-black text-primary">{availableOrders.length}</p>
              </div>
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardContent className="p-3 sm:pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[8px] sm:text-[9px] font-black uppercase text-muted-foreground mb-0.5">Carregadas</p>
                <p className="text-xl sm:text-2xl font-black text-green-600">{chargedCount}</p>
              </div>
              <Truck className="w-6 h-6 sm:w-8 sm:h-8 text-green-600/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardContent className="p-3 sm:pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[8px] sm:text-[9px] font-black uppercase text-muted-foreground mb-0.5">Total Pendente</p>
                <p className="text-xl sm:text-2xl font-black text-amber-600">{(totalWeightForLoading / 1000).toFixed(1)}T</p>
              </div>
              <Weight className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600/20" />
            </div>
          </CardContent>
        </Card>
      </div>
      {/* FLUXO PRINCIPAL */}
      {step === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">📋 Histórico de Cargas</h2>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Todas as cargas realizadas</p>
            </div>
            <Button className="gap-2 font-bold text-xs sm:text-sm" onClick={() => setStep('vehicle')}>
              <Plus className="w-4 h-4" /> Nova Carga
            </Button>
          </div>

          {charges.length === 0 ? (
            <Card className="border-none shadow-md">
              <CardContent className="py-12 text-center text-muted-foreground text-sm">Nenhuma carga carregada ainda</CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {charges.map(charge => (
                <Collapsible key={charge.id} open={expandedCharge === charge.id} onOpenChange={() => setExpandedCharge(expandedCharge === charge.id ? null : charge.id)}>
                  <Card className="border-none shadow-md">
                    <CollapsibleTrigger asChild>
                      <CardContent className="p-3 sm:p-4 cursor-pointer hover:bg-muted/30">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${expandedCharge === charge.id ? 'rotate-180' : ''}`} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Truck className="w-4 h-4 text-primary flex-shrink-0" />
                                <p className="text-sm font-black text-primary">{charge.chargeNumber}</p>
                                <Badge className="bg-green-100 text-green-800 text-[9px]">✓ Carregada</Badge>
                              </div>
                              <p className="text-[9px] text-muted-foreground mt-0.5">
                                {charge.ordersIds.length} pedido(s) · {charge.totalPalets} palete(s) · {(charge.totalWeight / 1000).toFixed(2)} ton
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">{format(new Date(charge.createdAt), 'dd/MM HH:mm')}</p>
                        </div>
                      </CardContent>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="p-3 sm:p-4 pt-0 border-t space-y-3">
                        {charge.observations && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-[9px] font-black uppercase text-blue-600 mb-1">Informações</p>
                            <p className="text-xs text-blue-800">{charge.observations}</p>
                          </div>
                        )}

                        <div className="space-y-3">
                          {charge.cityDeliveries?.map((cityDel, idx) => (
                            <div key={idx} className="border border-primary/20 rounded-lg p-2.5 space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-black text-primary">📍 {cityDel.city}</p>
                                <Badge variant="outline" className="text-[8px]">{cityDel.deliveries.reduce((s, d) => s + d.palets.length, 0)} palete(s)</Badge>
                              </div>
                              {cityDel.deliveries.map((delivery, dIdx) => (
                                <div key={dIdx} className="bg-muted/20 rounded p-2 text-[9px]">
                                  <p className="font-bold text-primary">{delivery.customerName}</p>
                                  {delivery.customerPhone && <p className="text-muted-foreground">{delivery.customerPhone}</p>}
                                  <div className="mt-1.5 space-y-1">
                                    {delivery.palets.map((palet, pIdx) => (
                                      <div key={pIdx} className="bg-white border border-dashed rounded p-1.5 text-[8px]">
                                        <p className="font-black">Palete {palet.number} • {calculatePaletWeight(palet, products).toFixed(0)}kg</p>
                                        <div className="mt-1 space-y-0.5">
                                          {palet.items.map((item, iIdx) => (
                                            <p key={iIdx} className="text-muted-foreground">
                                              {products.find(p => p.id === item.productId)?.name} × {item.quantity}
                                            </p>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2 pt-3 border-t flex-wrap">
                          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => handleExportCharge(charge)}>
                            <Download className="w-3 h-3" /> Exportar
                          </Button>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          )}
        </div>
      )}
      {/* STEP 1: SELECIONAR VEÍCULO */}
      {step === 'vehicle' && (
        <Card className="border-none shadow-md">
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">🚚 Passo 1: Selecione o Veículo</h2>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Qual veículo será usado neste carregamento?</p>
            </div>
            <div>
              <label className="text-sm font-bold mb-2 block">Veículo / Placa</label>
              <Input
                placeholder="Ex: Volvo FH16 - ABC-1234"
                value={selectedVehicle}
                onChange={e => setSelectedVehicle(e.target.value)}
                className="text-base"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('history')}>Cancelar</Button>
              <Button onClick={proceedToNextStep} disabled={!selectedVehicle}>Próximo</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: SELECIONAR PEDIDOS */}
      {step === 'orders' && (
        <div className="space-y-4">
          <Card className="border-none shadow-md">
            <CardContent className="p-4 sm:p-6 space-y-3">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight">📦 Passo 2: Selecione os Pedidos</h2>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Veículo: {selectedVehicle}</p>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md overflow-x-auto">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 p-3 bg-muted border-b sticky">
                <Checkbox checked={selectedOrders.length === availableOrders.length && availableOrders.length > 0} onCheckedChange={handleSelectAllOrders} />
                <p className="text-sm font-bold flex-1">Selecionar todos ({selectedOrders.length}/{availableOrders.length})</p>
              </div>
              <div className="space-y-2 p-3">
                {availableOrders.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">Todos os pedidos já estão carregados!</p>
                ) : (
                  availableOrders.map(order => (
                    <div key={order.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/20">
                      <Checkbox
                        checked={selectedOrders.includes(order.id)}
                        onCheckedChange={() => handleSelectOrder(order.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-primary">{order.id}</p>
                        <p className="text-xs text-muted-foreground truncate">{order.customerName}</p>
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[9px]">{calculateTotalItems(order.items)} itens</Badge>
                          <Badge variant="outline" className="text-[9px]">{(order.totalWeight / 1000).toFixed(2)} ton</Badge>
                          <Badge variant="outline" className="text-[9px]"><MapPin className="w-2.5 h-2.5 mr-0.5" />{order.city || '?'}</Badge>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" onClick={backStep}>Voltar</Button>
            <Button onClick={proceedToNextStep} disabled={selectedOrders.length === 0}>Próximo: Alocar Paletes</Button>
          </div>
        </div>
      )}

      {/* STEP 3: ALOCARpaletes */}
      {step === 'paleting' && tempCharge && (
        <div className="space-y-4">
          <Card className="border-none shadow-md">
            <CardContent className="p-4 sm:p-6 space-y-3">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight">📫 Passo 3: Aloque os Produtos em Paletes</h2>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  {tempCharge.chargeNumber} · {selectedOrders.length} pedido(s) · Total: {(tempCharge.totalWeight / 1000).toFixed(2)} ton
                </p>
              </div>

              {/* Adicionar novo palete */}
              <div>
                <label className="text-sm font-bold mb-2 block">Adicionar Palete</label>
                <div className="flex gap-2">
                  <Select value="" onValueChange={(city) => {
                    addPaletToTemp(city || 'Palete Genérico');
                  }}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione cliente ou deixe em branco" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">📦 Palete Genérico</SelectItem>
                      {readyOrders.filter(o => selectedOrders.includes(o.id)).map(o => (
                        <SelectItem key={o.id} value={o.customerName}>{o.customerName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => addPaletToTemp('Palete Genérico')}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Paletes */}
          <div className="space-y-3">
            {tempCharge.cityDeliveries.flatMap((city, cityIdx) =>
              city.deliveries.flatMap((delivery, delIdx) =>
                delivery.palets.map((palet, paletIdx) => (
                  <PaletEditor
                    key={palet.id}
                    palet={palet}
                    products={products}
                    allProducts={products}
                    onUpdate={(updated) => updateTempPalet(cityIdx, delIdx, paletIdx, updated)}
                    onDelete={() => deleteTempPalet(cityIdx, delIdx, paletIdx)}
                    isFirst={paletIdx === 0}
                    isLast={paletIdx === delivery.palets.length - 1}
                  />
                ))
              )
            )}
          </div>

          {tempCharge.cityDeliveries.length === 0 && (
            <Card className="border-none shadow-md bg-muted/30">
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                👇 Clique em "+ Adicionar Palete" para começar
              </CardContent>
            </Card>
          )}

          {/* Resumo */}
          {tempCharge.cityDeliveries.length > 0 && (
            <Card className="border-none shadow-md bg-primary/5">
              <CardContent className="p-4 space-y-2">
                <p className="text-[10px] font-black uppercase text-muted-foreground">📊 Resumo da Carga</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[9px] text-muted-foreground">Paletes</p>
                    <p className="text-xl font-black text-primary">{tempCharge.cityDeliveries.reduce((s, c) => s + c.deliveries.reduce((ss, d) => ss + d.palets.length, 0), 0)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground">Peso Total</p>
                    <p className="text-xl font-black text-primary">{(tempCharge.cityDeliveries.reduce((s, c) => s + c.deliveries.reduce((ss, d) => ss + d.palets.reduce((sss, p) => sss + calculatePaletWeight(p, products), 0), 0), 0) / 1000).toFixed(2)}T</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground">Itens</p>
                    <p className="text-xl font-black text-primary">{tempCharge.cityDeliveries.reduce((s, c) => s + c.deliveries.reduce((ss, d) => ss + d.palets.reduce((sss, p) => sss + p.items.reduce((ssss, i) => ssss + i.quantity, 0), 0), 0), 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={backStep}>Voltar</Button>
            <Button onClick={saveCharge} disabled={tempCharge.cityDeliveries.length === 0} className="flex-1 bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="w-4 h-4 mr-2" /> Salvar Carga
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}