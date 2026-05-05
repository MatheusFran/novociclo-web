"use client";

// ─────────────────────────────────────────────
// IMPORTS
// ─────────────────────────────────────────────
import { useState, useMemo, useRef, useEffect } from 'react';
import { useSystemData } from '@/server/store';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from '@/components/ui/separator';
import {
  Plus, Search, Loader2, Trash2, Printer, Eye, ClipboardList, Truck, Package,
  Edit3, Filter, FileDown, ChevronDown, User, MapPin, Calendar, CreditCard,
  CheckCircle2, Clock, AlertCircle, Check, FileText, Download, Image as ImageIcon,
  Save, ArrowRight, BookOpen, StickyNote, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Order, OrderItem, OrderStatus, PaymentCondition, Product, PriceTable } from '@/lib/types';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { OrderDetailsModal, OrderTable } from '@/components/shared';
import { useRouter } from 'next/navigation';


// ─────────────────────────────────────────────
// TIPOS LOCAIS
// ─────────────────────────────────────────────
type CustomerForm = {
  name: string; email: string; phone: string; address: string;
  document: string; city: string; responsible: string;
  neighborhood: string; zip: string; mobile: string; landline: string;
};

const EMPTY_CUSTOMER: CustomerForm = {
  name: '', email: '', phone: '', address: '', document: '', city: '',
  responsible: '', neighborhood: '', zip: '', mobile: '', landline: '',
};


// ─────────────────────────────────────────────
// CONSTANTES / MAPAS
// ─────────────────────────────────────────────
const STATUS_MAP: Record<OrderStatus, { label: string; color: string; icon: any }> = {
  PENDENTE: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  PRODUCAO: { label: 'Produção', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Package },
  PRONTO_LOGISTICA: { label: 'Expedição', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Truck },
  ENTREGA: { label: 'Em Entrega', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Truck },
  AGUARDANDO_FATURAMENTO: { label: 'Financeiro', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: CreditCard },
  FATURADO: { label: 'Faturado', color: 'bg-green-100 text-green-800 border-green-200', icon: FileText },
  ENTREGUE: { label: 'Entregue', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
  REJEITADO: { label: 'Rejeitado', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle },
};



const PAYMENT_OPTIONS: { value: PaymentCondition; label: string }[] = [
  { value: 'A_VISTA_ENTREGA', label: 'À Vista na Entrega' },
  { value: 'BOLETO_15_DIAS', label: 'Boleto 15 Dias' },
  { value: 'BOLETO_30_DIAS', label: 'Boleto 30 Dias' },
  { value: 'BOLETO_30_60_90', label: 'Boleto 30/60/90' },
  { value: 'BOLETO_30_60', label: 'Boleto 30/60' },
  { value: 'CARTAO', label: 'Cartão' },
  { value: 'CARTAO2X', label: 'Cartão 2X' },
  { value: 'PIX', label: 'PIX' },
  { value: 'BONIFICADO', label: 'Bonificado' },
  { value: 'OUTRO', label: 'Outro' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50];


// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────


function getProductPrice(product: Product, priceTables: PriceTable[], listId: string): number {
  const table = priceTables.find(t => t.id === listId);
  if (table?.prices[product.id]) return table.prices[product.id];
  return product.price;
}

function calcCartTotal(cart: OrderItem[]): number {
  return cart.reduce((acc, item) => acc + item.price * item.quantity - (item.discount || 0), 0);
}

function calcCartWeight(cart: OrderItem[], products: Product[]): number {
  return cart.reduce((acc, item) => {
    const p = products.find(p => p.id === item.productId);
    return acc + (p?.weight || 0) * item.quantity;
  }, 0);
}

// ─────────────────────────────────────────────
// COMPONENTE DE PAGINAÇÃO
// ─────────────────────────────────────────────
function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (total === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-3 border-t">
      <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
        <span>Linhas por página:</span>
        <Select value={String(pageSize)} onValueChange={v => { onPageSizeChange(Number(v)); onPageChange(1); }}>
          <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="ml-2">{((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} de {total}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => onPageChange(1)}>
          <ChevronLeft className="w-3 h-3" /><ChevronLeft className="w-3 h-3 -ml-2" />
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="w-3 h-3" />
        </Button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce<(number | '...')[]>((acc, p, i, arr) => {
            if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) =>
            p === '...'
              ? <span key={`e-${i}`} className="text-[10px] px-1 text-muted-foreground">…</span>
              : <Button key={p} variant={page === p ? 'default' : 'outline'} size="icon"
                className="h-7 w-7 text-[10px] font-black" onClick={() => onPageChange(p as number)}>
                {p}
              </Button>
          )
        }
        <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="w-3 h-3" />
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === totalPages} onClick={() => onPageChange(totalPages)}>
          <ChevronRight className="w-3 h-3" /><ChevronRight className="w-3 h-3 -ml-2" />
        </Button>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────
// MÓDULO — FORMULÁRIO DE NOVO / EDITAR PEDIDO
// ─────────────────────────────────────────────
function OrderFormModal({
  open,
  onOpenChange,
  editingOrder,
  products,
  priceTables,
  customers,
  members,
  orders,
  onSave,
  initialCart,
  initialCustomer,
  initialPriceList,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingOrder: Order | null;
  products: Product[];
  priceTables: PriceTable[];
  customers: any[];
  members: any[];
  orders: Order[];
  onSave: (order: Partial<Order> & { isEdit: boolean; originalId?: string }) => void;
  initialCart?: OrderItem[];
  initialCustomer?: Partial<CustomerForm>;
  initialPriceList?: string;
}) {
  // ── FIX: estado derivado do prop — reseta corretamente ao abrir/fechar ──
  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customer, setCustomer] = useState<CustomerForm>({ ...EMPTY_CUSTOMER });
  const [seller, setSeller] = useState('');
  const [closingPerson, setClosingPerson] = useState('');
  const [paymentCondition, setPaymentCondition] = useState<PaymentCondition>('BOLETO_15_DIAS');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [observations, setObservations] = useState('');
  const [priceList, setPriceList] = useState(priceTables[0]?.id || 'PADRAO');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [createdAt, setCreatedAt] = useState('');

  // ── FIX: único ponto de inicialização — roda apenas quando `open` muda para true ──
  useEffect(() => {
    if (!open) return;

    if (editingOrder) {
      setCreatedAt(editingOrder.createdAt?.slice(0, 10) || '');
      setCustomerId(editingOrder.id);
      setCustomerSearch(editingOrder.customerName);
      setCustomer({
        name: editingOrder.customerName || '',
        email: editingOrder.customerEmail || '',
        phone: editingOrder.customerPhone || '',
        address: editingOrder.customerAddress || '',
        document: editingOrder.customerCpfCnpj || '',
        city: editingOrder.city || '',
        responsible: '', neighborhood: '', zip: '', mobile: '', landline: '',
      });
      setSeller(editingOrder.seller || '');
      setClosingPerson('');
      setPaymentCondition(editingOrder.paymentCondition || 'BOLETO_15_DIAS');
      setDeliveryDate(editingOrder.deliveryDate || '');
      setObservations((editingOrder as any).observations || '');
      setPriceList(editingOrder.priceTableId || priceTables[0]?.id || 'PADRAO');
      setCart(editingOrder.items || []);
    } else {
      // Novo pedido (possivelmente com dados pré-preenchidos de cotação)
      setCustomerId('');
      setCustomerSearch('');
      setCustomer({ ...EMPTY_CUSTOMER, ...(initialCustomer || {}) });
      setSeller('');
      setClosingPerson('');
      setPaymentCondition('BOLETO_15_DIAS');
      setDeliveryDate('');
      setObservations('');
      setPriceList(initialPriceList || priceTables[0]?.id || 'PADRAO');
      setCart(initialCart || []);
      setCreatedAt(new Date().toISOString().slice(0, 10));

    }
    setCustomerSearchOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    return customers.filter(c =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.city && c.city.toLowerCase().includes(customerSearch.toLowerCase()))
    );
  }, [customerSearch, customers]);

  const handleSelectCustomer = (cId: string) => {
    setCustomerId(cId);
    const c = customers.find(c => c.id === cId);
    if (c) {
      setCustomerSearch(c.name);
      setCustomer({
        name: c.name, email: c.email || '', phone: c.phone || '', address: c.address || '',
        document: c.cpfcnpj || '', city: c.city || '', responsible: '', neighborhood: '', zip: '', mobile: '', landline: ''
      });
      setCustomerSearchOpen(false);
    }
  };

  const handleChangePriceList = (val: string) => {
    setPriceList(val);
    setCart(cart.map(item => {
      const prod = products.find(p => p.id === item.productId);
      return prod ? { ...item, price: getProductPrice(prod, priceTables, val) } : item;
    }));
  };

  const handleAddProduct = (productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod || cart.find(c => c.productId === productId)) return;
    setCart([...cart, { productId: prod.id, quantity: 1, price: getProductPrice(prod, priceTables, priceList), discount: 0 }]);
  };

  const handleSave = () => {
    if (!customerId) {
      toast({ variant: "destructive", title: "Selecione um cliente da lista." });
      return;
    }
    if (!customerId && !editingOrder) {
      toast({ variant: "destructive", title: "Cliente obrigatório" }); return;
    }
    if (!customer.name || !seller || cart.length === 0) {
      toast({ variant: "destructive", title: "Preencha todos os campos obrigatórios." }); return;
    }
    onSave({
      isEdit: !!editingOrder,
      originalId: editingOrder?.id,
      customerId: customerId || undefined,
      customerName: customer.name, customerEmail: customer.email,
      customerPhone: customer.phone, customerAddress: customer.address,
      customerCpfCnpj: customer.document, city: customer.city,
      items: cart,
      totalValue: calcCartTotal(cart),
      totalWeight: calcCartWeight(cart, products),
      seller, closedBy: closingPerson || undefined,
      paymentCondition, deliveryDate, priceTableId: priceList,
      observations,
      createdAt: new Date(createdAt).toISOString(),

    });
    onOpenChange(false);
  };

  const cartTotal = calcCartTotal(cart);
  const cartWeight = calcCartWeight(cart, products);

  return (
    <Dialog
      key={open ? 'open' : 'closed'}
      open={open}
      onOpenChange={onOpenChange}
    >      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogTitle className="sr-only">
          {editingOrder ? `Editando · ${editingOrder.id}` : 'Novo Pedido'}
        </DialogTitle>

        {/* Header */}
        <div className="sticky top-0 z-10 bg-primary px-6 py-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/60">
            {editingOrder ? `Editando · ${editingOrder.id}` : 'Novo Pedido'}
          </p>
          <h2 className="text-lg font-black uppercase text-white tracking-tight leading-tight">
            {editingOrder ? 'Atualizar Pedido' : 'Lançamento de Venda'}
          </h2>
        </div>

        <div className="px-4 sm:px-6 py-6 space-y-6">
          {/* ── Cliente ── */}
          <div className="space-y-3 relative">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <User className="w-3 h-3" /> Cliente *
            </p>

            <div className="relative">
              <Input
                placeholder="Digite o nome ou cidade do cliente..."
                className="h-9 text-xs"
                value={customerSearch}
                onChange={e => {
                  setCustomerSearch(e.target.value);
                  setCustomerSearchOpen(e.target.value.trim().length > 0);
                  if (!e.target.value.trim()) { setCustomerId(''); setCustomer({ ...EMPTY_CUSTOMER }); }
                }}
              />
              {customerSearchOpen && filteredCustomers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                  {filteredCustomers.map(c => (
                    <button key={c.id} onClick={() => handleSelectCustomer(c.id)}
                      className="w-full text-left px-3 py-2 hover:bg-primary/10 text-xs border-b last:border-0 transition">
                      <p className="font-bold uppercase">{c.name}</p>
                      <p className="text-[9px] text-muted-foreground">{c.city || ''}{c.phone ? ` • ${c.phone}` : ''}</p>
                    </button>
                  ))}
                </div>
              )}
              {customerSearchOpen && customerSearch.trim() && filteredCustomers.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 p-3 text-center">
                  <p className="text-[9px] text-muted-foreground italic">Nenhum cliente encontrado</p>
                </div>
              )}
            </div>

            {customers.length === 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                <p className="text-[9px] font-black uppercase text-red-700">⚠️ Nenhum cliente cadastrado</p>
              </div>
            )}
          </div>

          <Separator />

          {/* ── Condições de Venda ── */}
          <div className="space-y-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <CreditCard className="w-3 h-3" /> Condições de Venda
            </p>
            <Select onValueChange={setSeller} value={seller}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Vendedor Responsável *" /></SelectTrigger>
              <SelectContent>
                {members.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select onValueChange={setClosingPerson} value={closingPerson}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Fechamento da Venda (opcional)" /></SelectTrigger>
              <SelectContent>
                {members.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-1 sm:grid-cols-1 gap-2">
              <Select onValueChange={(val: PaymentCondition) => setPaymentCondition(val)} value={paymentCondition}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pagamento *" /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase">Data do Pedido *</label>
              <Input
                type="date"
                className="h-9 text-xs"
                value={createdAt}
                onChange={e => setCreatedAt(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* ── Itens do Pedido ── */}
          <div className="space-y-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Package className="w-3 h-3" /> Itens do Pedido
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Select onValueChange={handleChangePriceList} value={priceList}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Tabela de Preços" /></SelectTrigger>
                <SelectContent>
                  {priceTables.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select onValueChange={handleAddProduct}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="+ Adicionar Produto" /></SelectTrigger>
                <SelectContent>
                  {products.filter(p => !p.isRawMaterial).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {cart.length === 0 ? (
              <div className="border-2 border-dashed rounded-xl py-10 text-center">
                <Package className="w-6 h-6 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-[10px] font-bold uppercase text-muted-foreground/40">Nenhum produto adicionado</p>
              </div>
            ) : (
              <div className="space-y-2 border rounded-lg overflow-hidden overflow-x-auto">
                <div className="bg-muted/50 px-3 py-2 grid grid-cols-12 gap-2 text-[8px] font-black uppercase text-muted-foreground border-b min-w-[480px]">
                  <div className="col-span-4">Produto</div>
                  <div className="col-span-2 text-center">Qtd</div>
                  <div className="col-span-2 text-right">V. Unitário</div>
                  <div className="col-span-2 text-right">V. Atualizado</div>
                  <div className="col-span-1 text-right">Total</div>
                  <div className="col-span-1" />
                </div>
                {cart.map((item, idx) => {
                  const prod = products.find(p => p.id === item.productId);
                  const tabelaPrice = getProductPrice(prod as Product, priceTables, priceList);
                  const subtotal = item.price * item.quantity - (item.discount || 0);
                  return (
                    <div key={item.productId} className="px-3 py-2 grid grid-cols-12 gap-2 items-center border-b hover:bg-muted/30 transition min-w-[480px]">
                      <div className="col-span-4">
                        <p className="text-[10px] font-bold uppercase truncate">{prod?.name}</p>
                      </div>
                      <div className="col-span-2">
                        <Input type="number" min={1} className="h-7 text-center text-xs font-bold" value={item.quantity}
                          onChange={e => { const c = [...cart]; c[idx].quantity = parseInt(e.target.value) || 1; setCart(c); }} />
                      </div>
                      <div className="col-span-2 text-right">
                        <p className="text-[9px] font-bold text-muted-foreground">R$ {tabelaPrice.toLocaleString()}</p>
                      </div>
                      <div className="col-span-2">
                        <Input type="number" min={0} step="0.01" className="h-7 text-center text-xs font-bold" value={item.price}
                          onChange={e => { const c = [...cart]; c[idx].price = parseFloat(e.target.value) || tabelaPrice; setCart(c); }} />
                      </div>
                      <div className="col-span-1 text-right">
                        <p className="text-[10px] font-black text-primary">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="col-span-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"
                          onClick={() => setCart(cart.filter(c => c.productId !== item.productId))}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          {/* ── Observações ── */}
          <div className="space-y-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <StickyNote className="w-3 h-3" /> Observações
            </p>
            <Textarea value={observations} onChange={e => setObservations(e.target.value)}
              placeholder="Instruções especiais de entrega, referências, observações do pedido..."
              className="text-xs resize-none min-h-[80px]" />
          </div>
        </div>

        {/* Footer fixo */}
        <div className="sticky bottom-0 bg-white border-t px-4 sm:px-6 py-4 space-y-3">
          <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
            <span>Peso estimado</span>
            <span>{cartWeight.toFixed(2)} KG</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-black uppercase text-primary">Total Líquido</span>
            <span className="text-2xl font-black text-primary">R$ {cartTotal.toLocaleString()}</span>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 text-xs uppercase font-bold h-9">Cancelar</Button>
            <Button onClick={handleSave} className="flex-1 font-black uppercase text-xs h-9">
              {editingOrder ? 'Salvar Alterações' : 'Confirmar Pedido'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function generateOrderId(existingOrders: Order[]): string {
  const existingIds = new Set(existingOrders.map(o => o.id));

  let newId = '';
  let attempts = 0;

  do {
    const randomNumber = Math.floor(1000 + Math.random() * 9000); // 4 dígitos
    newId = `PED-${randomNumber}`;
    attempts++;

    if (attempts > 50) {
      throw new Error('Falha ao gerar ID único');
    }
  } while (existingIds.has(newId));

  return newId;
}

// ─────────────────────────────────────────────
// COMPONENTE RAIZ
// ─────────────────────────────────────────────
export default function PedidosPage() {
  const {
    orders, products, priceTables, customers, members,
    isReady, addOrder, updateOrderStatus, deleteOrder, updateOrder
  } = useSystemData();

  const router = useRouter();

  // ── Modais de ação ──
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Pré-preenchimento quando converte cotação → pedido
  const [pendingCart, setPendingCart] = useState<OrderItem[] | undefined>();
  const [pendingCustomer, setPendingCustomer] = useState<Partial<CustomerForm> | undefined>();
  const [pendingPriceList, setPendingPriceList] = useState<string | undefined>();

  // ── Modais de detalhe / confirmação ──
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderToApprove, setOrderToApprove] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);

  // ── Handlers de Pedido ──


  const handleSaveOrder = async (data: Partial<Order> & { isEdit: boolean; originalId?: string }) => {
    const { isEdit, originalId, id: _customerId, ...orderData } = data;

    if (isEdit && originalId) {
      await updateOrder(originalId, orderData);
      toast({ title: "Pedido atualizado com sucesso." });
    } else {
      const newId = generateOrderId(orders);
      const newOrder: Order = {
        id: newId,
        status: 'PENDENTE',
        user: "Admin",
        ...orderData,
      } as any;
      addOrder(newOrder);
      toast({ title: "Pedido registrado com sucesso." });
    }
    setEditingOrder(null);
    setPendingCart(undefined);
    setPendingCustomer(undefined);
    setPendingPriceList(undefined);
  };

  const handleApproveOrder = (orderId: string) => {
    updateOrderStatus(orderId, 'PRODUCAO', { productionStage: 'FILA' });
    toast({ title: "Pedido Aprovado", description: "Enviado para fila de produção." });
    setOrderToApprove(null);
  };

  const handleDeleteOrder = (orderId: string) => {
    deleteOrder(orderId);
    toast({ title: "Pedido Excluído", description: `${orderId} removido.` });
    setOrderToDelete(null);
  };

  const handleEditClick = (order: Order) => {
    if (['FATURADO', 'REJEITADO'].includes(order.status)) {
      toast({ variant: "destructive", title: "Ação bloqueada", description: "Pedidos faturados ou rejeitados não permitem edição." });
      return;
    }
    setEditingOrder(order);
    setIsOrderFormOpen(true);
    setOrderToEdit(null);
  };

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-2 sm:px-0">
      {/* ── Cabeçalho da Página ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-primary uppercase tracking-tight">Gestão de Pedidos</h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Controle comercial e fluxo de vendas</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="gap-2 font-black uppercase text-[10px] shadow-lg"
            onClick={() => { setEditingOrder(null); setPendingCart(undefined); setPendingCustomer(undefined); setPendingPriceList(undefined); setIsOrderFormOpen(true); }}>
            <Plus className="w-4 h-4" /> Novo Pedido
          </Button>
        </div>
      </div>

      {/* ── Tabs: Pedidos / Cotações ── */}

      <OrderTable
        orders={[...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())}
        members={members}
        statusMap={STATUS_MAP}
        showTotals
        showSearch
        showFilters
        showGroupByCity
        showExport
        exportFileName="Relatorio_Pedidos"
        columns={[
          {
            key: 'id',
            header: 'Ref.',
            render: o => <span className="font-mono text-[11px] font-black text-primary whitespace-nowrap">{o.id}</span>,
          },
          {
            key: 'customerName',
            header: 'Cliente',
            render: o => <span className="text-[11px] font-black uppercase text-slate-700 max-w-[120px] truncate block">{o.customerName}</span>,
          },
          {
            key: 'seller',
            header: 'Vendedor',
            render: o => <span className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">{o.seller || '---'}</span>,
          },
          {
            key: 'city',
            header: 'Cidade',
            render: o => (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="text-[10px] font-black text-slate-700 uppercase whitespace-nowrap">{o.city || '---'}</span>
              </div>
            ),
          },
          {
            key: 'qty',
            header: 'Qtd',
            align: 'center',
            render: o => <span className="text-[10px] font-black">{(o.items || []).reduce((acc, i) => acc + i.quantity, 0)}</span>,
          },
          {
            key: 'weight',
            header: 'KG',
            align: 'center',
            render: o => <span className="text-[10px] font-black">{o.totalWeight?.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} KG</span>,
          },
          {
            key: 'createdAt',
            header: 'Data',
            align: 'center',
            render: o => <span className="text-[10px] whitespace-nowrap">{o.createdAt ? format(new Date(o.createdAt), 'dd/MM/yy') : '---'}</span>,
          },
          {
            key: 'totalValue',
            header: 'Valor',
            align: 'right',
            render: o => <span className="text-[11px] font-black whitespace-nowrap">R$ {(o.totalValue || 0).toLocaleString()}</span>,
          },
          {
            key: 'status',
            header: 'Status',
            align: 'center',
            render: o => {
              const StatusIcon = STATUS_MAP[o.status]?.icon || AlertCircle;
              return (
                <Badge variant="outline"
                  className={`${STATUS_MAP[o.status]?.color} text-[8px] font-black uppercase tracking-tighter px-2 h-5 flex items-center gap-1 justify-center whitespace-nowrap`}>
                  <StatusIcon className="w-2.5 h-2.5" />
                  {STATUS_MAP[o.status]?.label || o.status}
                </Badge>
              );
            },
          },
        ]}
        actions={[
          {
            label: 'Aprovar',
            icon: <CheckCircle2 className="w-3.5 h-3.5" />,
            variant: 'ghost',
            className: 'text-green-600 hover:bg-green-50',
            hidden: o => o.status !== 'PENDENTE',
            onClick: o => setOrderToApprove(o.id),
          },
          {
            label: 'Ver',
            icon: <Eye className="w-3.5 h-3.5" />,
            variant: 'ghost',
            className: 'text-primary',
            onClick: o => router.push(`/dashboard/vendas/pedidos/${o.id}`),
          },
          {
            label: 'Editar',
            icon: <Edit3 className="w-3.5 h-3.5" />,
            variant: 'ghost',
            className: 'text-blue-600',
            hidden: o => ['ENTREGUE', 'REJEITADO'].includes(o.status),
            onClick: o => setOrderToEdit(o),
          },
          {
            label: 'Excluir',
            icon: <Trash2 className="w-3.5 h-3.5" />,
            variant: 'ghost',
            className: 'text-red-500 hover:bg-red-50',
            hidden: o => !['PENDENTE', 'PRODUCAO'].includes(o.status),
            onClick: o => setOrderToDelete(o.id),
          },
        ]}
        emptyMessage="Nenhum pedido encontrado"
      />


      {/* ── Modais ── */}

      <OrderFormModal
        open={isOrderFormOpen}
        onOpenChange={(val) => { if (!val) { setEditingOrder(null); setPendingCart(undefined); } setIsOrderFormOpen(val); }}
        editingOrder={editingOrder}
        products={products}
        priceTables={priceTables}
        customers={customers}
        members={members}
        orders={orders}
        onSave={handleSaveOrder}
        initialCart={pendingCart}
        initialCustomer={pendingCustomer}
        initialPriceList={pendingPriceList}
      />

      <OrderDetailsModal
        isOpen={!!selectedOrder}
        order={selectedOrder}
        products={products}
        onClose={() => setSelectedOrder(null)}
        actions={[
          {
            label: 'Aprovar',
            variant: 'green',
            hidden: o => o.status !== 'PENDENTE',
            onClick: () => handleApproveOrder(selectedOrder!.id),
          },
        ]}
        extraLeftSections={[
          {
            title: 'Operacional',
            content: (
              <>
                <p><b>Responsável:</b> {selectedOrder?.user}</p>
                <p><b>Fechado por:</b> {selectedOrder?.closedBy || '---'}</p>
                <p><b>Observações:</b> {selectedOrder?.observations || '---'}</p>
              </>
            )
          },
          {
            title: 'Produção',
            content: (
              <>
                <p><b>Etapa:</b> {selectedOrder?.productionStage || '---'}</p>
                <p><b>Lote:</b> {selectedOrder?.loteId || '---'}</p>
                <p><b>Data Lote:</b> {selectedOrder?.loteDate ? new Date(selectedOrder.loteDate).toLocaleString() : '---'}</p>
                <p><b>Aprovado em:</b> {selectedOrder?.approvedAt ? new Date(selectedOrder.approvedAt).toLocaleString() : '---'}</p>
              </>
            )
          }
        ]}
        extraRightSections={[
          {
            title: 'Logística',
            content: (
              <>
                <p><b>Veículo:</b> {selectedOrder?.assignedVehicleId || '---'}</p>
                <p><b>Motorista:</b> {selectedOrder?.assignedDriverId || '---'}</p>
                <p><b>Aceito em:</b> {selectedOrder?.acceptedAt ? new Date(selectedOrder.acceptedAt).toLocaleString() : '---'}</p>
                <p><b>Saída:</b> {selectedOrder?.departureTime ? new Date(selectedOrder.departureTime).toLocaleString() : '---'}</p>
                <p><b>Entrega:</b> {selectedOrder?.deliveredAt ? new Date(selectedOrder.deliveredAt).toLocaleString() : '---'}</p>
              </>
            )
          },
          {
            title: 'Faturamento',
            content: (
              <>
                <p><b>NF:</b> {selectedOrder?.nfNumero || '---'}</p>
                <p><b>Venda Direta:</b> {selectedOrder?.vendaDiretaNumero || '---'}</p>
                <p><b>Faturado em:</b> {selectedOrder?.invoicedAt ? new Date(selectedOrder.invoicedAt).toLocaleString() : '---'}</p>
                <p><b>Rejeitado em:</b> {selectedOrder?.rejectedAt ? new Date(selectedOrder.rejectedAt).toLocaleString() : '---'}</p>
              </>
            )
          },
          {
            title: 'Controle',
            content: (
              <>
                <p><b>Criado em:</b> {selectedOrder ? new Date(selectedOrder.createdAt).toLocaleString() : '---'}</p>
                <p><b>Atualizado em:</b> {selectedOrder ? new Date(selectedOrder?.updatedAt).toLocaleString() : '---'}</p>
              </>
            )
          }
        ]}
      />

      {/* ── Alert Dialogs ── */}
      <AlertDialog open={!!orderToApprove} onOpenChange={open => !open && setOrderToApprove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Aprovação</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja aprovar o pedido {orderToApprove}? Ele será enviado para a fila de produção.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-green-600 hover:bg-green-700"
              onClick={() => orderToApprove && handleApproveOrder(orderToApprove)}>
              Aprovar Agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!orderToEdit} onOpenChange={open => !open && setOrderToEdit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Editar Pedido</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a editar o pedido {orderToEdit?.id}. Alterações afetarão estoque e faturamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => orderToEdit && handleEditClick(orderToEdit)}>
              Continuar Edição
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!orderToDelete} onOpenChange={open => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Pedido</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja excluir o pedido {orderToDelete}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700"
              onClick={() => orderToDelete && handleDeleteOrder(orderToDelete)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}