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
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [chargeObservations, setChargeObservations] = useState('');
  const [filterStatus, setFilterStatus] = useState<'TODAS' | 'PREPARACAO' | 'CARREGADO' | 'SAIU_ENTREGA'>('TODAS');
  const [expandedCharge, setExpandedCharge] = useState<string | null>(null);
  const [editingChargeId, setEditingChargeId] = useState<string | null>(null);

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

  const filteredCharges = useMemo(() => {
    return charges.filter(c => filterStatus === 'TODAS' || c.status === filterStatus);
  }, [charges, filterStatus]);

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

  const createChargeFromOrders = () => {
    if (selectedOrders.length === 0) {
      toast({ variant: "destructive", title: "Erro", description: "Selecione pelo menos um pedido." });
      return;
    }

    const selectedOrdersData = readyOrders.filter(o => selectedOrders.includes(o.id));

    const cityGroups: Record<string, typeof selectedOrdersData> = {};
    selectedOrdersData.forEach(order => {
      const city = order.city || 'Sem Cidade';
      if (!cityGroups[city]) cityGroups[city] = [];
      cityGroups[city].push(order);
    });

    const cityDeliveries: CityDelivery[] = [];
    let globalPaletCount = 1;

    Object.entries(cityGroups).forEach(([city, cityOrders], idx) => {
      const loadOrder = idx === 0 ? 'PRIMEIRO' : 'ULTIMO';

      const deliveries = cityOrders.map(order => {
        const palets: Palet[] = [];
        let currentPalet: Palet = {
          id: `palet_${Date.now()}_${globalPaletCount}`,
          number: globalPaletCount++,
          items: [],
          weight: 0,
        };

        order.items.forEach(item => {
          const itemWeight = calculateItemWeight(item.productId, item.quantity, products);
          if ((currentPalet.weight + itemWeight > 1000) || (currentPalet.items.length >= 50)) {
            if (currentPalet.items.length > 0) {
              palets.push(currentPalet);
              currentPalet = {
                id: `palet_${Date.now()}_${globalPaletCount}`,
                number: globalPaletCount++,
                items: [],
                weight: 0,
              };
            }
          }
          currentPalet.items.push({ orderId: order.id, productId: item.productId, quantity: item.quantity });
          currentPalet.weight += itemWeight;
        });

        if (currentPalet.items.length > 0) palets.push(currentPalet);

        return {
          orderId: order.id,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          palets,
        };
      });

      cityDeliveries.push({ city, loadOrder, deliveries });
    });

    const totalWeight = selectedOrdersData.reduce((sum, o) => sum + (o.totalWeight || 0), 0);
    const totalItems = selectedOrdersData.reduce((sum, o) => sum + calculateTotalItems(o.items), 0);
    const totalPalets = cityDeliveries.reduce((sum, c) =>
      sum + c.deliveries.reduce((s, d) => s + d.palets.length, 0), 0);

    const newCharge: LoadingCharge = {
      id: `charge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      chargeNumber: `CRG-${format(new Date(), 'ddMMyy')}-${(charges.length + 1).toString().padStart(3, '0')}`,
      ordersIds: selectedOrders,
      cityDeliveries,
      totalWeight,
      totalItems,
      totalPalets,
      createdAt: new Date().toISOString(),
      status: 'PREPARACAO',
      observations: chargeObservations,
    };

    const updated = [...charges, newCharge];
    setCharges(updated);
    saveChargesToStorage(updated);

    toast({
      title: "Carga Criada",
      description: `${newCharge.chargeNumber} criada com ${selectedOrders.length} pedido(s).`
    });

    setSelectedOrders([]);
    setChargeObservations('');
    setIsDialogOpen(false);
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

  const handleMoveCityUp = (chargeId: string, cityIdx: number) => {
    const charge = charges.find(c => c.id === chargeId)!;
    if (cityIdx === 0) return;
    const cities = [...charge.cityDeliveries];
    [cities[cityIdx - 1], cities[cityIdx]] = [cities[cityIdx], cities[cityIdx - 1]];
    // Reajusta loadOrder: primeiro = idx 0
    const reordered = cities.map((c, i) => ({ ...c, loadOrder: i === 0 ? 'PRIMEIRO' as const : 'ULTIMO' as const }));
    updateCharge(chargeId, { ...charge, cityDeliveries: reordered });
  };

  const handleMoveCityDown = (chargeId: string, cityIdx: number, total: number) => {
    const charge = charges.find(c => c.id === chargeId)!;
    if (cityIdx === total - 1) return;
    const cities = [...charge.cityDeliveries];
    [cities[cityIdx], cities[cityIdx + 1]] = [cities[cityIdx + 1], cities[cityIdx]];
    const reordered = cities.map((c, i) => ({ ...c, loadOrder: i === 0 ? 'PRIMEIRO' as const : 'ULTIMO' as const }));
    updateCharge(chargeId, { ...charge, cityDeliveries: reordered });
  };

  const handleMovePaletUp = (chargeId: string, cityIdx: number, delIdx: number, paletIdx: number) => {
    const charge = charges.find(c => c.id === chargeId)!;
    const cities = [...charge.cityDeliveries];
    const palets = [...cities[cityIdx].deliveries[delIdx].palets];
    if (paletIdx === 0) return;
    [palets[paletIdx - 1], palets[paletIdx]] = [palets[paletIdx], palets[paletIdx - 1]];
    cities[cityIdx] = {
      ...cities[cityIdx],
      deliveries: cities[cityIdx].deliveries.map((d, i) => i === delIdx ? { ...d, palets } : d),
    };
    updateCharge(chargeId, { ...charge, cityDeliveries: cities });
  };

  const handleMovePaletDown = (chargeId: string, cityIdx: number, delIdx: number, paletIdx: number) => {
    const charge = charges.find(c => c.id === chargeId)!;
    const cities = [...charge.cityDeliveries];
    const palets = [...cities[cityIdx].deliveries[delIdx].palets];
    if (paletIdx === palets.length - 1) return;
    [palets[paletIdx], palets[paletIdx + 1]] = [palets[paletIdx + 1], palets[paletIdx]];
    cities[cityIdx] = {
      ...cities[cityIdx],
      deliveries: cities[cityIdx].deliveries.map((d, i) => i === delIdx ? { ...d, palets } : d),
    };
    updateCharge(chargeId, { ...charge, cityDeliveries: cities });
  };

  const handleUpdatePalet = (chargeId: string, cityIdx: number, delIdx: number, paletIdx: number, updatedPalet: Palet) => {
    const charge = charges.find(c => c.id === chargeId)!;
    const cities = [...charge.cityDeliveries];
    const palets = cities[cityIdx].deliveries[delIdx].palets.map((p, i) => i === paletIdx ? updatedPalet : p);
    cities[cityIdx] = {
      ...cities[cityIdx],
      deliveries: cities[cityIdx].deliveries.map((d, i) => i === delIdx ? { ...d, palets } : d),
    };
    updateCharge(chargeId, { ...charge, cityDeliveries: cities });
  };

  const handleDeletePalet = (chargeId: string, cityIdx: number, delIdx: number, paletIdx: number) => {
    const charge = charges.find(c => c.id === chargeId)!;
    const cities = [...charge.cityDeliveries];
    const palets = cities[cityIdx].deliveries[delIdx].palets.filter((_, i) => i !== paletIdx);
    cities[cityIdx] = {
      ...cities[cityIdx],
      deliveries: cities[cityIdx].deliveries.map((d, i) => i === delIdx ? { ...d, palets } : d),
    };
    updateCharge(chargeId, { ...charge, cityDeliveries: cities });
  };

  const handleAddPalet = (chargeId: string, cityIdx: number, delIdx: number) => {
    const charge = charges.find(c => c.id === chargeId)!;
    const delivery = charge.cityDeliveries[cityIdx].deliveries[delIdx];
    const newPalet: Palet = {
      id: `palet_${Date.now()}_new`,
      number: 0, // será renumerado
      items: [],
      weight: 0,
    };
    const cities = [...charge.cityDeliveries];
    cities[cityIdx] = {
      ...cities[cityIdx],
      deliveries: cities[cityIdx].deliveries.map((d, i) =>
        i === delIdx ? { ...d, palets: [...d.palets, newPalet] } : d
      ),
    };
    updateCharge(chargeId, { ...charge, cityDeliveries: cities });
  };

  const handleUpdateChargeStatus = (chargeId: string, newStatus: LoadingCharge['status']) => {
    const updated = charges.map(c => c.id === chargeId ? { ...c, status: newStatus } : c);
    setCharges(updated);
    saveChargesToStorage(updated);
    toast({ title: "Status Atualizado" });
  };

  const handleDeleteCharge = (chargeId: string) => {
    const charge = charges.find(c => c.id === chargeId);
    const updated = charges.filter(c => c.id !== chargeId);
    setCharges(updated);
    saveChargesToStorage(updated);
    toast({ title: "Carga Deletada", description: `${charge?.chargeNumber} removida.` });
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
              'CIDADE': cityDel.city,
              'ORDEM_CARREGAMENTO': cityDel.loadOrder,
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

  const chargedCount = charges.filter(c => c.status !== 'PREPARACAO').length;
  const preparingCount = charges.filter(c => c.status === 'PREPARACAO').length;
  const totalWeightForLoading = availableOrders.reduce((sum, o) => sum + (o.totalWeight || 0), 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
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
                <p className="text-[8px] sm:text-[9px] font-black uppercase text-muted-foreground mb-0.5">Preparando</p>
                <p className="text-xl sm:text-2xl font-black text-blue-600">{preparingCount}</p>
              </div>
              <Box className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md hidden md:block">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Carregado</p>
                <p className="text-2xl font-black text-green-600">{chargedCount}</p>
              </div>
              <Truck className="w-8 h-8 text-green-600/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md hidden md:block">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Total a Entregar</p>
                <p className="text-2xl font-black text-amber-600">{(totalWeightForLoading / 1000).toFixed(1)} ton</p>
              </div>
              <Weight className="w-8 h-8 text-amber-600/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pedidos" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pedidos" className="gap-2 font-bold text-xs uppercase">
            <Package className="w-4 h-4" /> Pedidos
          </TabsTrigger>
          <TabsTrigger value="cargas" className="gap-2 font-bold text-xs uppercase">
            <Truck className="w-4 h-4" /> Organizar
          </TabsTrigger>
        </TabsList>

        {/* ABA PEDIDOS */}
        <TabsContent value="pedidos" className="mt-4 sm:mt-6 space-y-4">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight">Pedidos Prontos</h2>
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Aprovados pela logística</p>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <Card className="border-none shadow-md overflow-x-auto">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-[9px] font-black uppercase">Pedido</TableHead>
                    <TableHead className="text-[9px] font-black uppercase">Cliente</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center">Itens</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center hidden sm:table-cell">Peso</TableHead>
                    <TableHead className="text-[9px] font-black uppercase hidden sm:table-cell">Cidade</TableHead>
                    <TableHead className="text-[9px] font-black uppercase hidden md:table-cell">Telefone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic text-xs opacity-40">
                        {searchTerm ? 'Nenhum encontrado' : 'Todos carregados!'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    availableOrders.map(order => (
                      <TableRow key={order.id} className="hover:bg-muted/20 h-14">
                        <TableCell><p className="text-[11px] font-black text-primary">{order.id}</p></TableCell>
                        <TableCell><p className="text-xs font-bold">{order.customerName}</p></TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[9px]">{calculateTotalItems(order.items)}</Badge>
                        </TableCell>
                        <TableCell className="text-center hidden sm:table-cell">
                          <p className="text-xs font-bold">{(order.totalWeight / 1000).toFixed(2)} ton</p>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            <p className="text-xs font-bold">{order.city || '?'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            <p className="text-[10px] font-mono">{order.customerPhone || '---'}</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA ORGANIZAR */}
        <TabsContent value="cargas" className="mt-4 sm:mt-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">🚚 Organizar Carga</h2>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Arraste cidades e edite paletes</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 font-bold text-xs sm:text-sm">
                  <Plus className="w-4 h-4" /> Montar Carga
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>Nova Carga</DialogTitle>
                  <DialogDescription className="text-xs">Selecione pedidos — organizados por cidade automaticamente</DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border sticky top-0 z-10">
                    <Checkbox
                      id="select-all"
                      checked={selectedOrders.length === availableOrders.length && availableOrders.length > 0}
                      onCheckedChange={handleSelectAllOrders}
                    />
                    <label htmlFor="select-all" className="text-sm font-bold cursor-pointer flex-1">
                      Selecionar todos ({selectedOrders.length}/{availableOrders.length})
                    </label>
                  </div>
                  {availableOrders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">Nenhum disponível</div>
                  ) : (
                    availableOrders.map(order => (
                      <div key={order.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        <Checkbox
                          id={`order-${order.id}`}
                          checked={selectedOrders.includes(order.id)}
                          onCheckedChange={() => handleSelectOrder(order.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <label htmlFor={`order-${order.id}`} className="text-sm font-bold cursor-pointer block truncate">{order.id}</label>
                          <p className="text-xs text-muted-foreground truncate">{order.customerName}</p>
                          <div className="flex gap-1.5 mt-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[9px]">{calculateTotalItems(order.items)} itens</Badge>
                            <Badge variant="outline" className="text-[9px]">{(order.totalWeight / 1000).toFixed(2)} ton</Badge>
                            <Badge variant="outline" className="text-[9px]">
                              <MapPin className="w-2.5 h-2.5 mr-0.5" />{order.city || '?'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div className="space-y-1.5 pt-4 border-t">
                    <label className="text-[10px] font-black uppercase text-muted-foreground">Observações</label>
                    <Input placeholder="Ex: Frágil..." value={chargeObservations} onChange={e => setChargeObservations(e.target.value)} className="text-sm" />
                  </div>
                </div>
                <DialogFooter className="border-t pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={createChargeFromOrders} disabled={selectedOrders.length === 0}>
                    <Truck className="w-4 h-4 mr-2" /> Montar Carga
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold">Cargas Criadas</p>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
                <SelectTrigger className="w-40 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas</SelectItem>
                  <SelectItem value="PREPARACAO">Preparação</SelectItem>
                  <SelectItem value="CARREGADO">Carregado</SelectItem>
                  <SelectItem value="SAIU_ENTREGA">Saiu Entrega</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredCharges.length === 0 ? (
              <Card className="border-none shadow-md">
                <CardContent className="py-12 text-center text-muted-foreground text-sm">Nenhuma carga</CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredCharges.map(charge => {
                  const isExpanded = expandedCharge === charge.id;
                  const isEditing = editingChargeId === charge.id;

                  return (
                    <Collapsible key={charge.id} open={isExpanded} onOpenChange={() => setExpandedCharge(isExpanded ? null : charge.id)}>
                      <Card className="border-none shadow-md">
                        {/* Header da carga */}
                        <CollapsibleTrigger asChild>
                          <CardContent className="p-3 sm:p-4 cursor-pointer hover:bg-muted/30">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Truck className="w-4 h-4 text-primary flex-shrink-0" />
                                    <p className="text-sm font-black text-primary">{charge.chargeNumber}</p>
                                    <Badge className={
                                      charge.status === 'PREPARACAO' ? 'bg-yellow-100 text-yellow-800 text-[9px]' :
                                        charge.status === 'CARREGADO' ? 'bg-blue-100 text-blue-800 text-[9px]' :
                                          'bg-green-100 text-green-800 text-[9px]'
                                    }>
                                      {charge.status === 'PREPARACAO' ? 'Preparação' :
                                        charge.status === 'CARREGADO' ? 'Carregado' : 'Saiu Entrega'}
                                    </Badge>
                                  </div>
                                  <p className="text-[9px] text-muted-foreground mt-0.5">
                                    {charge.ordersIds.length} pedido(s) · {charge.totalPalets} palete(s) · {(charge.totalWeight / 1000).toFixed(2)} ton
                                  </p>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground flex-shrink-0">{format(new Date(charge.createdAt), 'dd/MM HH:mm')}</p>
                            </div>
                          </CardContent>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <CardContent className="p-3 sm:p-4 pt-0 border-t space-y-4">
                            {charge.observations && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-[9px] font-black uppercase text-blue-600 mb-1">Observações</p>
                                <p className="text-xs text-blue-800">{charge.observations}</p>
                              </div>
                            )}

                            {/* Toggle edição */}
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-black uppercase text-muted-foreground">
                                {charge.cityDeliveries?.length > 0 && ` cidade(s) — ${isEditing ? 'modo edição ativo' : 'clique em Editar para reorganizar'}`}
                              </p>
                              <Button
                                size="sm"
                                variant={isEditing ? 'default' : 'outline'}
                                className="gap-1 text-xs h-7"
                                onClick={() => setEditingChargeId(isEditing ? null : charge.id)}
                              >
                                {isEditing ? <><Check className="w-3 h-3" /> Salvo</> : <><Pencil className="w-3 h-3" /> Editar</>}
                              </Button>
                            </div>

                            {/* Lista de cidades */}
                            <div className="space-y-4">
                              {(charge.cityDeliveries ?? []).map((cityDel, cityIdx) => (
                                <div key={`${cityDel.city}-${cityIdx}`} className="border border-primary/20 rounded-xl overflow-hidden">
                                  {/* Cabeçalho da cidade */}
                                  <div className="bg-gradient-to-r from-primary/10 to-transparent p-2.5 sm:p-3 border-b border-primary/10">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                                        <div className="min-w-0">
                                          <p className="text-sm font-black text-primary">📍 {cityDel.city}</p>
                                          <p className="text-[8px] text-muted-foreground">
                                            {cityDel.loadOrder === 'PRIMEIRO'
                                              ? '↑ Carregar PRIMEIRO — fica na frente do caminhão'
                                              : '↓ Carregar POR ÚLTIMO — fica atrás'}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        <Badge className={cityDel.loadOrder === 'PRIMEIRO' ? 'bg-green-100 text-green-800 text-[8px]' : 'bg-orange-100 text-orange-800 text-[8px]'}>
                                          {cityDel.loadOrder === 'PRIMEIRO' ? '🔝 PRIMEIRO' : '🔚 ÚLTIMO'}
                                        </Badge>
                                        {isEditing && (
                                          <div className="flex gap-0.5 ml-1">
                                            <Button
                                              size="sm" variant="ghost" className="h-6 w-6 p-0"
                                              disabled={cityIdx === 0}
                                              onClick={() => handleMoveCityUp(charge.id, cityIdx)}
                                            >
                                              <ArrowUp className="w-3 h-3" />
                                            </Button>
                                            <Button
                                              size="sm" variant="ghost" className="h-6 w-6 p-0"
                                              disabled={cityIdx === charge.cityDeliveries.length - 1}
                                              onClick={() => handleMoveCityDown(charge.id, cityIdx, charge.cityDeliveries.length)}
                                            >
                                              <ArrowDown className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Entregas desta cidade */}
                                  <div className="p-2.5 sm:p-3 space-y-3">
                                    {cityDel.deliveries.map((delivery, delIdx) => (
                                      <div key={`${delivery.orderId}-${delIdx}`} className="bg-muted/20 rounded-lg p-2.5">
                                        {/* Cliente */}
                                        <div className="flex items-center justify-between mb-2.5">
                                          <div>
                                            <p className="text-xs font-black text-primary">{delivery.customerName}</p>
                                            {delivery.customerPhone && (
                                              <div className="flex items-center gap-1 text-[9px] text-muted-foreground mt-0.5">
                                                <Phone className="w-2.5 h-2.5" />
                                                <span className="font-mono">{delivery.customerPhone}</span>
                                              </div>
                                            )}
                                          </div>
                                          <Badge variant="outline" className="text-[8px]">
                                            {delivery.palets.length} palete(s)
                                          </Badge>
                                        </div>

                                        {/* Paletes */}
                                        <div className="space-y-2">
                                          {delivery.palets.map((palet, paletIdx) => (
                                            isEditing ? (
                                              <PaletEditor
                                                key={palet.id}
                                                palet={palet}
                                                products={products}
                                                allProducts={products}
                                                onUpdate={(updated) => handleUpdatePalet(charge.id, cityIdx, delIdx, paletIdx, updated)}
                                                onDelete={() => handleDeletePalet(charge.id, cityIdx, delIdx, paletIdx)}
                                                onMoveUp={() => handleMovePaletUp(charge.id, cityIdx, delIdx, paletIdx)}
                                                onMoveDown={() => handleMovePaletDown(charge.id, cityIdx, delIdx, paletIdx)}
                                                isFirst={paletIdx === 0}
                                                isLast={paletIdx === delivery.palets.length - 1}
                                              />
                                            ) : (
                                              // Modo visualização (igual ao original)
                                              <div key={palet.id} className="bg-white border border-dashed border-primary/30 rounded p-2">
                                                <div className="flex items-center justify-between mb-1.5">
                                                  <div className="flex items-center gap-1.5">
                                                    <Box className="w-3.5 h-3.5 text-primary" />
                                                    <p className="text-[9px] font-black text-primary">Palete {palet.number}</p>
                                                  </div>
                                                  <div className="flex gap-1">
                                                    <Badge variant="secondary" className="text-[7px]">{calculatePaletWeight(palet, products).toFixed(0)} kg</Badge>
                                                    <Badge variant="secondary" className="text-[7px]">{palet.items.reduce((s, i) => s + i.quantity, 0)} un</Badge>
                                                  </div>
                                                </div>
                                                <div className="bg-gray-50 rounded p-1.5 space-y-0.5">
                                                  {palet.items.map((item, itemIdx) => {
                                                    const product = products.find(p => p.id === item.productId);
                                                    const itemWeight = calculateItemWeight(item.productId, item.quantity, products);
                                                    return (
                                                      <div key={itemIdx} className="flex justify-between items-center py-0.5 px-1">
                                                        <span className="text-[8px] sm:text-[9px] font-semibold flex-1 truncate">{product?.name || item.productId}</span>
                                                        <div className="flex gap-1.5 ml-2 flex-shrink-0">
                                                          <span className="text-[8px] font-bold">{item.quantity} {product?.uom || 'UN'}</span>
                                                          <span className="text-[8px] text-muted-foreground">{itemWeight.toFixed(0)} kg</span>
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            )
                                          ))}

                                          {/* Adicionar palete (modo edição) */}
                                          {isEditing && (
                                            <Button
                                              size="sm" variant="outline"
                                              className="w-full h-7 text-[9px] gap-1 border-dashed"
                                              onClick={() => handleAddPalet(charge.id, cityIdx, delIdx)}
                                            >
                                              <Plus className="w-3 h-3" /> Adicionar Palete
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Ações da carga */}
                            <div className="flex gap-2 pt-3 border-t flex-wrap">
                              {charge.status === 'PREPARACAO' && (
                                <Button size="sm" className="gap-1 text-xs flex-1 sm:flex-initial"
                                  onClick={() => handleUpdateChargeStatus(charge.id, 'CARREGADO')}>
                                  <CheckCircle2 className="w-3 h-3" /> Marcar Carregado
                                </Button>
                              )}
                              {charge.status === 'CARREGADO' && (
                                <Button size="sm" className="gap-1 text-xs flex-1 sm:flex-initial bg-green-600 hover:bg-green-700"
                                  onClick={() => handleUpdateChargeStatus(charge.id, 'SAIU_ENTREGA')}>
                                  <Truck className="w-3 h-3" /> Saiu Entrega
                                </Button>
                              )}
                              <Button size="sm" variant="outline" className="gap-1 text-xs"
                                onClick={() => handleExportCharge(charge)}>
                                <Download className="w-3 h-3" /> Exportar
                              </Button>
                              <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 gap-1 text-xs"
                                onClick={() => handleDeleteCharge(charge.id)}>
                                <Trash2 className="w-3 h-3" /> Deletar
                              </Button>
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}