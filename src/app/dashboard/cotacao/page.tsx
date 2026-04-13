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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Plus, Search, Loader2, Trash2, Printer, Filter, FileText, Download, Image as ImageIcon,
  Save, ArrowRight, BookOpen, ShoppingCart, X, CheckCircle2,
} from 'lucide-react';
import { OrderItem, Product, PriceTable } from '@/lib/types';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';


// ─────────────────────────────────────────────
// TIPOS LOCAIS
// ─────────────────────────────────────────────
interface SavedQuote {
  id: string;
  createdAt: string;
  customerName: string;
  customerCity: string;
  customerPhone: string;
  priceTableId: string;
  items: OrderItem[];
  totalValue: number;
  status: 'ABERTA' | 'CONVERTIDA' | 'CANCELADA';
}


// ─────────────────────────────────────────────
// CONSTANTES / MAPAS
// ─────────────────────────────────────────────
const QUOTE_STATUS_MAP = {
  ABERTA: { label: 'Aberta', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  CONVERTIDA: { label: 'Convertida', color: 'bg-green-100 text-green-800 border-green-200' },
  CANCELADA: { label: 'Cancelada', color: 'bg-red-100 text-red-800 border-red-200' },
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function loadQuotesFromStorage(): SavedQuote[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem('novociclo_quotes_page');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQuotesToStorage(quotes: SavedQuote[]) {
  try {
    window.localStorage.setItem('novociclo_quotes_page', JSON.stringify(quotes));
  } catch { }
}

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
// SUB-COMPONENTE — CABEÇALHO DE DOCUMENTO
// ─────────────────────────────────────────────
function DocHeader({ title, subtitle, date }: { title: string; subtitle: string; date: string }) {
  return (
    <div className="flex justify-between items-start px-10 pt-10 pb-6 border-b-2 border-black">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 relative">
          <Image src="/logo.png" alt="Logo Novo Ciclo" fill className="object-contain p-1.5" />
        </div>
        <div>
          <p className="text-[17px] font-black uppercase tracking-tight text-black leading-tight">NOVO CICLO</p>
          <p className="text-[8px] font-bold uppercase text-zinc-400 tracking-[0.2em]">Gestão Sustentável</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[8px] font-black uppercase tracking-[0.15em] text-zinc-400">{subtitle}</p>
        <p className="text-[22px] font-black uppercase text-black leading-tight">{title}</p>
        <p className="text-[9px] font-bold text-zinc-500 mt-0.5">{date}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MÓDULO — GERADOR DE COTAÇÃO (documento visual)
// ─────────────────────────────────────────────
function QuoteDocument({
  quoteRef,
  items,
  customerName,
  customerCity,
  customerPhone,
  products,
  totalValue,
  totalWeight,
}: {
  quoteRef: React.RefObject<HTMLDivElement | null>;
  items: OrderItem[];
  customerName: string;
  customerCity: string;
  customerPhone: string;
  products: Product[];
  totalValue: number;
  totalWeight: number;
}) {
  return (
    <div ref={quoteRef} className="bg-white mx-auto max-w-[760px] min-h-[1040px] flex flex-col" style={{ fontFamily: 'Arial, sans-serif' }}>
      <DocHeader title="COTAÇÃO" subtitle="Proposta Comercial" date={format(new Date(), 'dd/MM/yyyy')} />
      <p className="text-[8px] font-bold text-right pr-10 -mt-2 text-zinc-400">Válida por 7 dias úteis</p>

      {/* Dados do cliente */}
      <div className="px-10 py-5 border-b border-zinc-200">
        <div className="grid grid-cols-3 gap-6">
          {[
            { label: 'Cliente', value: customerName || '—' },
            { label: 'Cidade', value: customerCity || '—' },
            { label: 'Contato', value: customerPhone || '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[8px] font-black uppercase text-zinc-400 mb-1 tracking-widest">{label}</p>
              <p className="text-xs font-bold text-black">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabela de itens */}
      <div className="px-10 py-6 flex-1">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              {['Produto', 'Qtd / Un', 'Unit.', 'Desconto', 'Total'].map((h, i) => (
                <th key={h} className={`text-[9px] font-black uppercase tracking-widest text-black pb-2 ${i === 0 ? 'text-left' : 'text-right'} ${i === 1 ? 'text-center w-20' : ''} ${[2, 3].includes(i) ? 'w-28' : ''}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-16 text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                  Adicione produtos no painel lateral
                </td>
              </tr>
            )}
            {items.map((item, idx) => {
              const prod = products.find(p => p.id === item.productId);
              const total = item.price * item.quantity - (item.discount || 0);
              return (
                <tr key={item.productId} className={`border-b border-zinc-100 ${idx % 2 === 0 ? 'bg-zinc-50' : 'bg-white'}`}>
                  <td className="py-3 text-[11px] font-bold uppercase text-black">{prod?.name}</td>
                  <td className="py-3 text-center text-[11px] font-bold text-black">
                    {item.quantity}
                    <span className="text-[9px] text-zinc-400 font-black ml-1">{prod?.uom?.toUpperCase() || 'UN'}</span>
                  </td>
                  <td className="py-3 text-right text-[11px] font-bold text-black">
                    R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 text-right text-[11px] font-bold text-zinc-400">
                    {item.discount ? `− R$ ${item.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td className="py-3 text-right text-[11px] font-black text-black">
                    R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Rodapé */}
      <div className="px-10 pb-10 mt-auto">
        <div className="flex justify-between items-end pt-6 border-t-2 border-black">
          <div className="space-y-1 text-[8px] font-bold uppercase text-zinc-400 tracking-wide">
            <p>* Frete a combinar conforme região de entrega.</p>
            <p>* Sujeito a confirmação de estoque no ato do pedido.</p>
            <p>* Peso estimado: {totalWeight.toFixed(2)} KG</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black uppercase text-zinc-400 tracking-widest mb-1">Valor Total</p>
            <p className="text-4xl font-black text-black">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-16 mt-10">
          {['Responsável Comercial', 'Assinatura do Cliente'].map(label => (
            <div key={label} className="text-center">
              <div className="border-t border-black pt-2 mt-8">
                <p className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MÓDULO — PAINEL LATERAL DA COTAÇÃO
// ─────────────────────────────────────────────
function QuoteSidePanel({
  items,
  setItems,
  customerName, setCustomerName,
  customerCity, setCustomerCity,
  customerPhone, setCustomerPhone,
  priceList, setPriceList,
  products,
  priceTables,
  totalValue,
}: {
  items: OrderItem[];
  setItems: (items: OrderItem[]) => void;
  customerName: string; setCustomerName: (v: string) => void;
  customerCity: string; setCustomerCity: (v: string) => void;
  customerPhone: string; setCustomerPhone: (v: string) => void;
  priceList: string; setPriceList: (v: string) => void;
  products: Product[];
  priceTables: PriceTable[];
  totalValue: number;
}) {
  const handleAddProduct = (productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod || items.find(i => i.productId === productId)) return;
    setItems([...items, { productId: prod.id, quantity: 1, price: getProductPrice(prod, priceTables, priceList), discount: 0 }]);
  };

  const handleChangePriceList = (val: string) => {
    setPriceList(val);
    setItems(items.map(item => {
      const prod = products.find(p => p.id === item.productId);
      return prod ? { ...item, price: getProductPrice(prod, priceTables, val) } : item;
    }));
  };

  const handleItemChange = (productId: string, field: 'quantity' | 'discount', value: number) => {
    setItems(items.map(i => i.productId === productId ? { ...i, [field]: value } : i));
  };

  return (
    <div className="w-[320px] bg-white border-r flex flex-col overflow-hidden shrink-0 no-print">
      <div className="p-4 border-b bg-primary/5">
        <p className="text-[10px] font-black uppercase text-primary">Configuração da Cotação</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Dados do cliente */}
        <div className="space-y-2">
          <p className="text-[9px] font-black uppercase text-muted-foreground border-b pb-1">Dados do Cliente</p>
          <Input className="h-8 text-xs" placeholder="Nome / Razão Social" value={customerName} onChange={e => setCustomerName(e.target.value)} />
          <Input className="h-8 text-xs" placeholder="Cidade - UF" value={customerCity} onChange={e => setCustomerCity(e.target.value)} />
          <Input className="h-8 text-xs" placeholder="Contato / Telefone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
        </div>

        {/* Tabela de preços */}
        <div className="space-y-2">
          <p className="text-[9px] font-black uppercase text-muted-foreground border-b pb-1">Tabela de Preços</p>
          <Select value={priceList} onValueChange={handleChangePriceList}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {priceTables.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Adicionar produto */}
        <div className="space-y-2">
          <p className="text-[9px] font-black uppercase text-muted-foreground border-b pb-1">Adicionar Produto</p>
          <Select onValueChange={handleAddProduct}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar produto..." /></SelectTrigger>
            <SelectContent>
              {products.filter(p => !p.isRawMaterial).map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Itens */}
        {items.length > 0 && (
          <div className="space-y-2">
            <p className="text-[9px] font-black uppercase text-muted-foreground border-b pb-1">Itens ({items.length})</p>
            {items.map((item) => {
              const prod = products.find(p => p.id === item.productId);
              const total = item.price * item.quantity - (item.discount || 0);
              return (
                <div key={item.productId} className="bg-zinc-50 rounded-lg p-3 border space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[10px] font-black uppercase text-slate-700 leading-tight flex-1">{prod?.name}</p>
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-red-400 shrink-0"
                      onClick={() => setItems(items.filter(i => i.productId !== item.productId))}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-muted-foreground">Qtd ({prod?.uom || 'un'})</p>
                      <Input type="number" min={1} className="h-7 text-xs text-center font-bold" value={item.quantity}
                        onChange={e => handleItemChange(item.productId, 'quantity', parseInt(e.target.value) || 1)} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-muted-foreground">Desconto R$</p>
                      <Input type="number" min={0} className="h-7 text-xs text-center font-bold" placeholder="0" value={item.discount || ''}
                        onChange={e => handleItemChange(item.productId, 'discount', parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                  <div className="flex justify-between text-[9px]">
                    <span className="text-muted-foreground font-bold">Unit: R$ {item.price.toLocaleString()}</span>
                    <span className="font-black text-primary">Total: R$ {total.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Espaço vazio quando não há itens */}
        {items.length === 0 && (
          <div className="text-center py-8 text-[9px] text-muted-foreground">
            <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p>Nenhum item adicionado</p>
          </div>
        )}
      </div>

      <div className="p-4 border-t bg-zinc-50">
        <div className="flex justify-between items-baseline">
          <span className="text-[9px] font-black uppercase text-muted-foreground">Total da Cotação:</span>
          <span className="text-lg font-black text-primary">R$ {totalValue.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MÓDULO — MODAL DO GERADOR DE COTAÇÃO
// ─────────────────────────────────────────────
function QuoteGeneratorModal({
  open,
  onOpenChange,
  products,
  priceTables,
  onConvertToOrder,
  onSaveQuote,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  products: Product[];
  priceTables: PriceTable[];
  onConvertToOrder: (items: OrderItem[], customerName: string, customerCity: string, customerPhone: string, priceList: string) => void;
  onSaveQuote: (data: Omit<SavedQuote, 'id' | 'createdAt' | 'status'>) => void;
}) {
  const quoteRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [priceList, setPriceList] = useState(priceTables[0]?.id || 'PADRAO');

  const totalValue = items.reduce((acc, i) => acc + i.price * i.quantity - (i.discount || 0), 0);
  const totalWeight = calcCartWeight(items, products);

  const handleExportPNG = async () => {
    if (!quoteRef.current) return;
    try {
      const canvas = await html2canvas(quoteRef.current, {
        scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true,
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL("image/png");
      link.download = `Cotacao_${customerName || 'Cliente'}.png`;
      link.click();
      toast({ title: "Cotação salva", description: "Imagem PNG gerada." });
    } catch {
      toast({ variant: "destructive", title: "Erro na exportação" });
    }
  };

  const handleConvert = () => {
    if (!customerName || items.length === 0) {
      toast({ variant: "destructive", title: "Erro", description: "Preencha cliente e adicione produtos." });
      return;
    }
    onConvertToOrder(items, customerName, customerCity, customerPhone, priceList);
    onOpenChange(false);
  };

  const handleSave = () => {
    if (!customerName || items.length === 0) {
      toast({ variant: "destructive", title: "Erro", description: "Preencha cliente e adicione produtos." });
      return;
    }
    onSaveQuote({ customerName, customerCity, customerPhone, priceTableId: priceList, items, totalValue });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1300px] h-[95vh] flex flex-col p-0 overflow-hidden bg-zinc-100">
        <DialogTitle className="sr-only">Gerador de Cotação</DialogTitle>

        {/* Header */}
        <div className="bg-white border-b px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-black uppercase tracking-tight">Gerador de Cotação</p>
              <p className="text-[9px] font-bold text-muted-foreground uppercase">Preencha o painel lateral e exporte</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2 font-bold uppercase text-[10px]" onClick={handleExportPNG}>
              <ImageIcon className="w-3.5 h-3.5" /> PNG
            </Button>
            <Button size="sm" className="gap-2 font-bold uppercase text-[10px]" onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5" /> Imprimir / PDF
            </Button>
            <Button variant="outline" size="sm"
              className="gap-2 font-bold uppercase text-[10px] border-emerald-500 text-emerald-600 hover:bg-emerald-50"
              onClick={handleSave}>
              <Save className="w-3.5 h-3.5" /> Salvar Cotação
            </Button>
            <Button variant="outline" size="sm" className="gap-2 font-bold uppercase text-[10px]" onClick={handleConvert}>
              <Plus className="w-3.5 h-3.5" /> Converter em Pedido
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <QuoteSidePanel
            items={items} setItems={setItems}
            customerName={customerName} setCustomerName={setCustomerName}
            customerCity={customerCity} setCustomerCity={setCustomerCity}
            customerPhone={customerPhone} setCustomerPhone={setCustomerPhone}
            priceList={priceList} setPriceList={setPriceList}
            products={products} priceTables={priceTables}
            totalValue={totalValue}
          />

          {/* Área do documento */}
          <div className="flex-1 overflow-y-auto p-10 bg-zinc-100">
            <QuoteDocument
              quoteRef={quoteRef}
              items={items}
              customerName={customerName}
              customerCity={customerCity}
              customerPhone={customerPhone}
              products={products}
              totalValue={totalValue}
              totalWeight={totalWeight}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function CotacaoPage() {
  const { products, priceTables, addOrder, orders } = useSystemData();
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODAS' | 'ABERTA' | 'CONVERTIDA' | 'CANCELADA'>('TODAS');
  const [quoteToDelete, setQuoteToDelete] = useState<SavedQuote | null>(null);
  const [quoteToConvert, setQuoteToConvert] = useState<SavedQuote | null>(null);

  useEffect(() => {
    setSavedQuotes(loadQuotesFromStorage());
  }, []);

  const filteredQuotes = useMemo(() => {
    return savedQuotes.filter(q => {
      const matchesSearch = q.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.customerCity.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'TODAS' || q.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [savedQuotes, searchTerm, statusFilter]);

  const handleSaveQuote = (data: Omit<SavedQuote, 'id' | 'createdAt' | 'status'>) => {
    const newQuote: SavedQuote = {
      ...data,
      id: `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      status: 'ABERTA',
    };
    const updated = [...savedQuotes, newQuote];
    setSavedQuotes(updated);
    saveQuotesToStorage(updated);
    toast({ title: "Cotação salva", description: `Cotação para ${data.customerName} foi salva com sucesso.` });
  };

  const handleConvertQuoteToOrder = async (items: OrderItem[], customerName: string, customerCity: string, customerPhone: string, priceList: string) => {
    if (quoteToConvert) {
      const updated = savedQuotes.map(q =>
        q.id === quoteToConvert.id ? { ...q, status: 'CONVERTIDA' as const } : q
      );
      setSavedQuotes(updated);
      saveQuotesToStorage(updated);

      const newOrder: any = {
        customerName,
        customerCity,
        customerPhone,
        priceTableId: priceList,
        items,
        totalValue: items.reduce((acc, i) => acc + i.price * i.quantity - (i.discount || 0), 0),
        status: 'ABERTO',
      };
      try {
        await addOrder(newOrder);
        toast({ title: "Pedido criado", description: `Pedido a partir da cotação criado com sucesso.` });
      } catch (error) {
        toast({ variant: "destructive", title: "Erro ao criar pedido", description: error instanceof Error ? error.message : "Erro desconhecido" });
      }
      setQuoteToConvert(null);
    }
  };

  const handleDeleteQuote = (quoteId: string) => {
    const updated = savedQuotes.filter(q => q.id !== quoteId);
    setSavedQuotes(updated);
    saveQuotesToStorage(updated);
    toast({ title: "Cotação deletada", description: "A cotação foi removida." });
    setQuoteToDelete(null);
  };

  const handleCancelQuote = (quoteId: string) => {
    const updated = savedQuotes.map(q =>
      q.id === quoteId ? { ...q, status: 'CANCELADA' as const } : q
    );
    setSavedQuotes(updated);
    saveQuotesToStorage(updated);
    toast({ title: "Cotação cancelada", description: "O status da cotação foi atualizado." });
  };

  return (
    <div className="w-full h-full flex flex-col gap-5 overflow-hidden bg-zinc-50">
      {/* Header */}
      <Card className="border-b rounded-none">
        <CardContent className="pt-6 pb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xl font-bold text-slate-900">Cotações</p>
              <p className="text-[13px] text-muted-foreground">Gerenciar propostas comerciais e cotações</p>
            </div>
            <Button className="gap-2 font-bold" onClick={() => setIsQuoteOpen(true)}>
              <Plus className="w-4 h-4" /> Nova Cotação
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters & Search */}
      <div className="px-6 flex items-end gap-3">
        <div className="flex-1">
          <label className="text-[11px] font-black uppercase text-muted-foreground block mb-2">Pesquisar por cliente ou cidade</label>
          <Input
            placeholder="Pesquisar..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div className="w-40">
          <label className="text-[11px] font-black uppercase text-muted-foreground block mb-2">Filtrar por Status</label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas</SelectItem>
              <SelectItem value="ABERTA">Aberta</SelectItem>
              <SelectItem value="CONVERTIDA">Convertida</SelectItem>
              <SelectItem value="CANCELADA">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela de Cotações */}
      <div className="px-6 flex-1 overflow-hidden">
        <Card className="h-full flex flex-col">
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {filteredQuotes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="font-bold">Nenhuma cotação encontrada</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px] font-black uppercase">Cliente</TableHead>
                    <TableHead className="text-[11px] font-black uppercase">Cidade</TableHead>
                    <TableHead className="text-[11px] font-black uppercase">Contato</TableHead>
                    <TableHead className="text-[11px] font-black uppercase text-right">Total</TableHead>
                    <TableHead className="text-[11px] font-black uppercase text-center">Status</TableHead>
                    <TableHead className="text-[11px] font-black uppercase text-center">Data</TableHead>
                    <TableHead className="text-[11px] font-black uppercase text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotes.map(quote => (
                    <TableRow key={quote.id} className="hover:bg-zinc-50">
                      <TableCell className="text-sm font-bold text-slate-900">{quote.customerName}</TableCell>
                      <TableCell className="text-sm text-slate-700">{quote.customerCity}</TableCell>
                      <TableCell className="text-sm text-slate-700">{quote.customerPhone}</TableCell>
                      <TableCell className="text-right text-sm font-bold text-slate-900">
                        R$ {quote.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`text-[10px] font-bold ${QUOTE_STATUS_MAP[quote.status].color}`}>
                          {QUOTE_STATUS_MAP[quote.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm text-slate-700">
                        {format(new Date(quote.createdAt), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {quote.status === 'ABERTA' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-[10px] font-bold h-7"
                                onClick={() => setQuoteToConvert(quote)}
                              >
                                <ArrowRight className="w-3 h-3" /> Converter
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-[10px] font-bold h-7"
                                onClick={() => handleCancelQuote(quote.id)}
                              >
                                <X className="w-3 h-3" /> Cancelar
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-[10px] font-bold h-7 text-red-500 hover:text-red-600"
                            onClick={() => setQuoteToDelete(quote)}
                          >
                            <Trash2 className="w-3 h-3" /> Deletar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Gerador de Cotação */}
      <QuoteGeneratorModal
        open={isQuoteOpen}
        onOpenChange={setIsQuoteOpen}
        products={products}
        priceTables={priceTables}
        onSaveQuote={handleSaveQuote}
        onConvertToOrder={(items, customerName, customerCity, customerPhone, priceList) => {
          const quoteData: SavedQuote = {
            id: `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
            customerName,
            customerCity,
            customerPhone,
            priceTableId: priceList,
            items,
            totalValue: items.reduce((acc, i) => acc + i.price * i.quantity - (i.discount || 0), 0),
            status: 'CONVERTIDA',
          };
          setQuoteToConvert(quoteData);
          handleConvertQuoteToOrder(items, customerName, customerCity, customerPhone, priceList).catch(err => {
            toast({ variant: "destructive", title: "Erro", description: err instanceof Error ? err.message : "Erro ao converter" });
          });
        }}
      />

      {/* Alert Dialog para Converter Cotação em Pedido */}
      <AlertDialog open={!!quoteToConvert} onOpenChange={(open) => !open && setQuoteToConvert(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Converter Cotação em Pedido</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente converter a cotação <strong>{quoteToConvert?.customerName}</strong> em um novo pedido? A cotação será marcada como "Convertida".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => quoteToConvert && handleConvertQuoteToOrder(quoteToConvert.items, quoteToConvert.customerName, quoteToConvert.customerCity, quoteToConvert.customerPhone, quoteToConvert.priceTableId).catch(err => {
                toast({ variant: "destructive", title: "Erro", description: err instanceof Error ? err.message : "Erro ao converter" });
              })}
            >
              Converter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog para Deletar Cotação */}
      <AlertDialog open={!!quoteToDelete} onOpenChange={(open) => !open && setQuoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Cotação</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente deletar a cotação <strong>{quoteToDelete?.customerName}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => quoteToDelete && handleDeleteQuote(quoteToDelete.id)}
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
