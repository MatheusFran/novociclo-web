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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { PlaceHolderImages } from '@/lib/placeholder-images';
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
  FATURADO: { label: 'Finalizado', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
  REJEITADO: { label: 'Rejeitado', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle },
};

const QUOTE_STATUS_MAP = {
  ABERTA: { label: 'Aberta', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  CONVERTIDA: { label: 'Convertida', color: 'bg-green-100 text-green-800 border-green-200' },
  CANCELADA: { label: 'Cancelada', color: 'bg-red-100 text-red-800 border-red-200' },
};

const PAYMENT_OPTIONS: { value: PaymentCondition; label: string }[] = [
  { value: 'A_VISTA_ENTREGA', label: 'À Vista na Entrega' },
  { value: 'BOLETO_15_DIAS', label: 'Boleto 15 Dias' },
  { value: 'BOLETO_30_DIAS', label: 'Boleto 30 Dias' },
  { value: 'BOLETO_30_60_90', label: 'Boleto 30/60/90' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50];


// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function loadQuotesFromStorage(): SavedQuote[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem('commercio_quotes');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveQuotesToStorage(quotes: SavedQuote[]) {
  try { window.localStorage.setItem('commercio_quotes', JSON.stringify(quotes)); } catch { }
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
// SUB-COMPONENTES — CABEÇALHO DE DOCUMENTO
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
// SUB-COMPONENTE — MODAL DETALHES DO PEDIDO
// ─────────────────────────────────────────────
function OrderDetailsModal({
  order,
  products,
  onClose,
  onApprove,
}: {
  order: Order | null;
  products: Product[];
  onClose: () => void;
  onApprove: (id: string) => void;
}) {
  if (!order) return null;

  const StatusIcon = STATUS_MAP[order.status]?.icon || AlertCircle;

  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden bg-white">
        <DialogTitle className="sr-only">{order.id} - {order.customerName}</DialogTitle>

        <div className="flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="bg-primary px-4 sm:px-8 py-4 sm:py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-0.5">{order.id}</p>
              <h2 className="text-lg sm:text-xl font-black uppercase text-white tracking-tight">{order.customerName}</h2>
              <div className="flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-white/60" />
                <span className="text-sm font-black text-white/90 uppercase">{order.city || '---'}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={`${STATUS_MAP[order.status]?.color} text-[9px] font-black uppercase px-3 h-6`}>
                {STATUS_MAP[order.status]?.label}
              </Badge>
              {order.status === 'PENDENTE' && (
                <Button size="sm" className="h-8 gap-2 font-black text-[10px] uppercase bg-green-500 hover:bg-green-600 border-0"
                  onClick={() => { onApprove(order.id); onClose(); }}>
                  <Check className="w-3.5 h-3.5" /> Aprovar
                </Button>
              )}
              <Button variant="ghost" size="sm" className="h-8 text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => window.print()}>
                <Printer className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x">
              {/* Coluna Esquerda */}
              <div className="p-4 sm:p-8 space-y-7">
                <InfoSection title="Cliente" icon={<User className="w-3 h-3" />}>
                  <InfoRow label="Documento" value={order.customerCpfCnpj} />
                  <InfoRow label="Telefone" value={order.customerPhone} />
                  <InfoRow label="E-mail" value={order.customerEmail} />
                  <InfoRow label="Endereço" value={order.customerAddress} />
                </InfoSection>

                <InfoSection title="Comercial" icon={<CreditCard className="w-3 h-3" />}>
                  <InfoRow label="Vendedor" value={order.seller} />
                  <InfoRow label="Pagamento" value={order.paymentCondition?.replace(/_/g, ' ')} />
                  <InfoRow label="Emissão" value={format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')} />
                </InfoSection>

                <InfoSection title="Logística" icon={<Truck className="w-3 h-3" />}>
                  {(order as any).scheduledDeliveryDate && (
                    <InfoRow label="Entrega Programada"
                      value={format(new Date((order as any).scheduledDeliveryDate), 'dd/MM/yyyy')} />
                  )}
                  {(order as any).approvedAt && (
                    <InfoRow label="Aceite de Produção"
                      value={format(new Date((order as any).approvedAt), 'dd/MM/yyyy HH:mm')} />
                  )}
                  {(order as any).invoicedAt && (
                    <InfoRow label="Faturado em"
                      value={format(new Date((order as any).invoicedAt), 'dd/MM/yyyy HH:mm')} />
                  )}
                  <InfoRow label="Peso Total" value={`${order.totalWeight?.toFixed(2)} KG`} />
                </InfoSection>

                {(order as any).observations && (
                  <InfoSection title="Observações" icon={<StickyNote className="w-3 h-3" />}>
                    <p className="text-xs font-medium text-slate-600 leading-relaxed bg-muted/40 rounded-lg p-3">
                      {(order as any).observations}
                    </p>
                  </InfoSection>
                )}
              </div>

              {/* Coluna Direita — Itens */}
              <div className="p-4 sm:p-8 flex flex-col gap-6 border-t md:border-t-0">
                <InfoSection title="Itens do Pedido" icon={<Package className="w-3 h-3" />}>
                  <div className="space-y-2">
                    {order.items.map((item, idx) => {
                      const prod = products.find(p => p.id === item.productId);
                      return (
                        <div key={item.productId}
                          className={`flex items-center justify-between py-3 px-4 rounded-lg ${idx % 2 === 0 ? 'bg-muted/40' : ''}`}>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-black uppercase truncate">{prod?.name}</p>
                            <p className="text-[9px] text-muted-foreground font-bold font-mono">{item.productId}</p>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className="text-[10px] font-black">
                              <span className="text-primary font-black text-sm">{item.quantity}</span>
                              <span className="text-[9px] font-black text-muted-foreground ml-1 uppercase">{prod?.uom || 'un'}</span>
                              <span className="text-muted-foreground"> × R$ {item.price.toLocaleString()}</span>
                            </p>
                            <p className="text-xs font-black text-primary">R$ {(item.price * item.quantity).toLocaleString()}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </InfoSection>

                <div className="mt-auto pt-4 border-t space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                    <span>Quantidade total</span>
                    <span>{order.items.reduce((acc, i) => acc + i.quantity, 0)} sc</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                    <span>Peso total</span>
                    <span>{order.totalWeight?.toFixed(2)} KG</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2 border-t">
                    <span className="text-xs font-black uppercase text-primary">Total</span>
                    <span className="text-3xl font-black text-primary">R$ {order.totalValue.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Versão de impressão */}
          <PrintOrderView order={order} products={products} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Componente de impressão do pedido
function PrintOrderView({ order, products }: { order: Order; products: Product[] }) {
  return (
    <div className="print-only fixed inset-0 bg-white p-10 z-[100]" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="max-w-[760px] mx-auto">
        <DocHeader
          title={`#${order.id}`}
          subtitle="Documento de Venda"
          date={`Emissão: ${format(new Date(order.createdAt), 'dd/MM/yyyy')} às ${format(new Date(order.createdAt), 'HH:mm')}`}
        />

        <div className="space-y-3 my-8">
          {[
            { label: 'Endereço', value: order.customerAddress || '---', label2: 'Cidade - UF', value2: order.city || '---' },
            { label: 'Vendedor', value: order.seller || '---', label2: 'Pagamento', value2: order.paymentCondition?.replace(/_/g, ' ') || '---' },
          ].map((row, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-1 items-end gap-2">
                <span className="text-[9px] font-black uppercase whitespace-nowrap text-zinc-400">{row.label}:</span>
                <div className="flex-1 border-b border-zinc-300 text-[10px] font-bold uppercase pb-0.5">{row.value}</div>
              </div>
              <div className="flex w-56 items-end gap-2">
                <span className="text-[9px] font-black uppercase whitespace-nowrap text-zinc-400">{row.label2}:</span>
                <div className="flex-1 border-b border-zinc-300 text-[10px] font-bold uppercase pb-0.5">{row.value2}</div>
              </div>
            </div>
          ))}
        </div>

        <table className="w-full border-collapse mb-8">
          <thead>
            <tr className="border-b-2 border-black">
              {['Código', 'Produto', 'Qtd / Un', 'Unit.', 'Total'].map(h => (
                <th key={h} className="text-left text-[9px] font-black uppercase tracking-widest pb-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, idx) => {
              const prod = products.find(p => p.id === item.productId);
              return (
                <tr key={item.productId} className={`border-b border-zinc-100 ${idx % 2 === 0 ? 'bg-zinc-50' : ''}`}>
                  <td className="py-2 text-[9px] font-mono text-zinc-400">{item.productId}</td>
                  <td className="py-2 text-[10px] font-bold uppercase">{prod?.name}</td>
                  <td className="py-2 text-center text-[10px] font-bold">
                    {item.quantity} <span className="text-[8px] font-black text-zinc-400">{prod?.uom?.toUpperCase() || 'UN'}</span>
                  </td>
                  <td className="py-2 text-right text-[10px] font-bold">R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="py-2 text-right text-[10px] font-black">R$ {(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex justify-between items-start gap-12">
          <div className="flex-1 space-y-10">
            <div className="border border-zinc-200 p-3 h-20">
              <p className="text-[8px] font-black uppercase text-zinc-400 mb-1">Observações:</p>
              {(order as any).observations && (
                <p className="text-[9px] font-medium text-zinc-600">{(order as any).observations}</p>
              )}
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
          <div className="w-56 space-y-1 text-[9px]">
            <div className="flex justify-between font-bold text-zinc-500">
              <span>Peso total:</span><span>{order.totalWeight?.toFixed(2)} KG</span>
            </div>
            <div className="flex justify-between font-bold text-zinc-500">
              <span>Qtd. itens:</span><span>{order.items.reduce((acc, i) => acc + i.quantity, 0)} un</span>
            </div>
            <div className="flex justify-between items-baseline pt-3 border-t-2 border-black mt-2">
              <span className="text-xs font-black uppercase">Valor Total:</span>
              <span className="text-2xl font-black">R$ {order.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────
// SUB-COMPONENTE — MODAL VISUALIZAR COTAÇÃO
// ─────────────────────────────────────────────
function QuoteDetailsModal({
  quote,
  products,
  onClose,
  onConvert,
}: {
  quote: SavedQuote | null;
  products: Product[];
  onClose: () => void;
  onConvert: (quote: SavedQuote) => void;
}) {
  if (!quote) return null;

  return (
    <Dialog open={!!quote} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl w-[95vw] p-0 overflow-hidden bg-white">
        <DialogTitle className="sr-only">{quote.id} - {quote.customerName}</DialogTitle>

        <div className="flex flex-col max-h-[90vh]">
          <div className="bg-primary px-4 sm:px-8 py-4 sm:py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-0.5">{quote.id}</p>
              <h2 className="text-lg sm:text-xl font-black uppercase text-white tracking-tight">{quote.customerName}</h2>
              <div className="flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-white/60" />
                <span className="text-sm font-black text-white/90 uppercase">{quote.customerCity || '---'}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={`${QUOTE_STATUS_MAP[quote.status]?.color} text-[9px] font-black uppercase px-3 h-6`}>
                {QUOTE_STATUS_MAP[quote.status]?.label}
              </Badge>
              {quote.status === 'ABERTA' && (
                <Button size="sm" className="h-8 gap-2 font-black text-[10px] uppercase bg-green-500 hover:bg-green-600 border-0"
                  onClick={() => { onConvert(quote); onClose(); }}>
                  <ArrowRight className="w-3.5 h-3.5" /> Converter em Pedido
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b">
              <InfoRow label="Contato" value={quote.customerPhone} />
              <InfoRow label="Tabela de Preços" value={quote.priceTableId} />
              <InfoRow label="Data" value={format(new Date(quote.createdAt), 'dd/MM/yyyy HH:mm')} />
            </div>

            <InfoSection title="Itens da Cotação" icon={<Package className="w-3 h-3" />}>
              <div className="space-y-2">
                {quote.items.map((item, idx) => {
                  const prod = products.find(p => p.id === item.productId);
                  const total = item.price * item.quantity - (item.discount || 0);
                  return (
                    <div key={item.productId}
                      className={`flex items-center justify-between py-3 px-4 rounded-lg ${idx % 2 === 0 ? 'bg-muted/40' : ''}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black uppercase truncate">{prod?.name || item.productId}</p>
                        <p className="text-[9px] text-muted-foreground font-bold">R$ {item.price.toLocaleString()} / {prod?.uom || 'un'}</p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-[10px] font-black">
                          <span className="text-primary font-black text-sm">{item.quantity}</span>
                          <span className="text-[9px] font-black text-muted-foreground ml-1 uppercase">{prod?.uom || 'un'}</span>
                          {item.discount ? <span className="text-[9px] text-red-400 ml-1">− R$ {item.discount.toLocaleString()}</span> : null}
                        </p>
                        <p className="text-xs font-black text-primary">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </InfoSection>

            <div className="flex justify-between items-baseline pt-4 border-t">
              <span className="text-xs font-black uppercase text-primary">Total da Cotação</span>
              <span className="text-3xl font-black text-primary">
                R$ {quote.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


// ─────────────────────────────────────────────
// SUB-COMPONENTES AUXILIARES DE UI
// ─────────────────────────────────────────────
function InfoSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 pb-2 border-b">
        {icon} {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[8px] font-black uppercase text-muted-foreground mb-0.5">{label}</p>
      <p className="text-xs font-bold">{value || '---'}</p>
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
      <p className="text-[8px] font-bold text-right pr-10 -mt-2 text-zinc-400">Válida por 5 dias úteis</p>

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
  totalCost,
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
  totalCost: number;
}) {
  const grossProfit = totalValue - totalCost;
  const margin = totalValue > 0 ? ((grossProfit / totalValue) * 100).toFixed(1) : '0';

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
    <div className="w-full sm:w-[320px] bg-white border-r flex flex-col overflow-hidden shrink-0 no-print no-export">
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

        {/* Análise de margem */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 border-b pb-1">
            <Badge className="bg-blue-600 font-black text-[8px] h-4">INTERNO</Badge>
            <p className="text-[9px] font-black uppercase text-blue-600">Análise de Margem</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 space-y-2">
            <div className="flex justify-between text-[10px]">
              <span className="font-bold text-blue-700">Custo Total:</span>
              <span className="font-black">R$ {totalCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="font-bold text-blue-700">Lucro Bruto:</span>
              <span className="font-black text-green-600">R$ {grossProfit.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[10px] pt-1 border-t border-blue-200">
              <span className="font-black text-blue-800 uppercase">Margem:</span>
              <span className="font-black text-blue-800 text-sm">{margin}%</span>
            </div>
          </div>
        </div>
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
  const totalCost = items.reduce((acc, item) => {
    const prod = products.find(p => p.id === item.productId);
    return acc + (0) * item.quantity;
  }, 0);

  const handleExportPNG = async () => {
    if (!quoteRef.current) return;
    try {
      const canvas = await html2canvas(quoteRef.current, {
        scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true,
        ignoreElements: el => el.classList.contains('no-export'),
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
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1300px] w-[98vw] h-[95vh] flex flex-col p-0 overflow-hidden bg-zinc-100">
        <DialogTitle className="sr-only">Gerador de Cotação</DialogTitle>

        {/* Header */}
        <div className="bg-white border-b px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-black uppercase tracking-tight">Gerador de Cotação</p>
              <p className="text-[9px] font-bold text-muted-foreground uppercase">Preencha o painel lateral e exporte</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
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

        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
          <QuoteSidePanel
            items={items} setItems={setItems}
            customerName={customerName} setCustomerName={setCustomerName}
            customerCity={customerCity} setCustomerCity={setCustomerCity}
            customerPhone={customerPhone} setCustomerPhone={setCustomerPhone}
            priceList={priceList} setPriceList={setPriceList}
            products={products} priceTables={priceTables}
            totalValue={totalValue} totalCost={totalCost}
          />

          {/* Área do documento */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-10 bg-zinc-100">
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

  // ── FIX: único ponto de inicialização — roda apenas quando `open` muda para true ──
  useEffect(() => {
    if (!open) return;

    if (editingOrder) {
      setCustomerId(editingOrder.customerName);
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
    if (!customerId && !editingOrder) {
      toast({ variant: "destructive", title: "Cliente obrigatório" }); return;
    }
    if (!customer.name || !seller || cart.length === 0 || !deliveryDate) {
      toast({ variant: "destructive", title: "Preencha todos os campos obrigatórios." }); return;
    }
    onSave({
      isEdit: !!editingOrder,
      originalId: editingOrder?.id,
      customerName: customer.name, customerEmail: customer.email,
      customerPhone: customer.phone, customerAddress: customer.address,
      customerCpfCnpj: customer.document, city: customer.city,
      items: cart,
      totalValue: calcCartTotal(cart),
      totalWeight: calcCartWeight(cart, products),
      seller, closedBy: closingPerson || undefined,
      paymentCondition, deliveryDate, priceTableId: priceList,
      observations,
    });
    onOpenChange(false);
  };

  const cartTotal = calcCartTotal(cart);
  const cartWeight = calcCartWeight(cart, products);

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onOpenChange(false); }}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto p-0 gap-0">
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

            {customerId ? (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-2 flex items-center justify-between">
                  <p className="text-[9px] font-bold text-green-700">✓ Cliente selecionado</p>
                  <Button size="sm" variant="ghost" className="h-6 text-xs text-green-600"
                    onClick={() => { setCustomerSearch(''); setCustomerId(''); setCustomer({ ...EMPTY_CUSTOMER }); }}>
                    Alterar
                  </Button>
                </div>
                <Input value={customer.document} disabled className="h-9 text-xs bg-muted" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input value={customer.city} disabled className="h-9 text-xs bg-muted" />
                  <Input value={customer.phone} disabled className="h-9 text-xs bg-muted" />
                </div>
                <Input value={customer.email} disabled className="h-9 text-xs bg-muted" />
                <Input value={customer.address} disabled className="h-9 text-xs bg-muted" />
              </>
            ) : (
              <>
                <Input value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} placeholder="Nome / Razão Social" className="h-9 text-xs" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input value={customer.document} onChange={e => setCustomer({ ...customer, document: e.target.value })} placeholder="CPF / CNPJ" className="h-9 text-xs" />
                  <Input value={customer.city} onChange={e => setCustomer({ ...customer, city: e.target.value })} placeholder="Cidade - UF" className="h-9 text-xs" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} placeholder="Telefone" className="h-9 text-xs" />
                  <Input value={customer.email} onChange={e => setCustomer({ ...customer, email: e.target.value })} placeholder="E-mail" className="h-9 text-xs" />
                </div>
                <Input value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} placeholder="Endereço de Entrega" className="h-9 text-xs" />
              </>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Select onValueChange={(val: PaymentCondition) => setPaymentCondition(val)} value={paymentCondition}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pagamento *" /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="h-9 text-xs" />
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


// ─────────────────────────────────────────────
// MÓDULO — ABA DE PEDIDOS
// ─────────────────────────────────────────────
function OrdersTab({
  orders,
  products,
  members,
  onApprove,
  onEdit,
  onDelete,
  onViewDetails,
}: {
  orders: Order[];
  products: Product[];
  members: any[];
  onApprove: (id: string) => void;
  onEdit: (order: Order) => void;
  onDelete: (id: string) => void;
  onViewDetails: (order: Order) => void;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sellerFilter, setSellerFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [groupByCity, setGroupByCity] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (!o) return false;
      const orderDate = new Date(o.createdAt);
      return (
        ((o.customerName || '').toLowerCase().includes(search.toLowerCase()) || (o.id || '').toLowerCase().includes(search.toLowerCase())) &&
        (statusFilter === 'ALL' || o.status === statusFilter) &&
        (sellerFilter === 'ALL' || o.seller === sellerFilter) &&
        (!dateRange.from || orderDate >= new Date(dateRange.from)) &&
        (!dateRange.to || orderDate <= new Date(dateRange.to))
      );
    });
  }, [orders, search, statusFilter, sellerFilter, dateRange]);

  // Reset página ao mudar filtros
  useEffect(() => { setPage(1); }, [search, statusFilter, sellerFilter, dateRange, groupByCity]);

  const groupedOrders = useMemo(() => {
    if (!groupByCity) {
      const start = (page - 1) * pageSize;
      return { 'Listagem Geral': filteredOrders.slice(start, start + pageSize) };
    }
    // Com agrupamento: pagina dentro do total filtrado
    const start = (page - 1) * pageSize;
    const paged = filteredOrders.slice(start, start + pageSize);
    return paged.reduce((acc, order) => {
      const city = order.city || 'Sem Cidade';
      if (!acc[city]) acc[city] = [];
      acc[city].push(order);
      return acc;
    }, {} as Record<string, Order[]>);
  }, [filteredOrders, groupByCity, page, pageSize]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filteredOrders.map(o => ({
      'ID': o.id, 'Data Emissão': format(new Date(o.createdAt), 'dd/MM/yyyy'),
      'Previsão Entrega': o.deliveryDate ? format(new Date(o.deliveryDate), 'dd/MM/yyyy') : '---',
      'Cliente': o.customerName, 'Cidade': o.city, 'Vendedor': o.seller,
      'Valor Total': o.totalValue, 'Status': STATUS_MAP[o.status]?.label || o.status,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pedidos");
    XLSX.writeFile(wb, "Relatorio_Pedidos.xlsx");
  };

  const totalFaturamento = filteredOrders.reduce((acc, o) => acc + (o.totalValue || 0), 0);
  const totalQuantidade = filteredOrders.reduce((acc, o) => acc + (o.items || []).reduce((s, i) => s + i.quantity, 0), 0);
  const totalKg = filteredOrders.reduce((acc, o) => acc + (o.totalWeight || 0), 0);
  const allSellers = [...new Set(orders.map(o => o?.seller).filter(Boolean))];

  return (
    <div className="space-y-4">
      {/* Cards de totais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Faturamento Total', value: `R$ ${totalFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
          { label: 'Quantidade Total', value: `${totalQuantidade.toLocaleString()} sc` },
          { label: 'Peso Total', value: `${totalKg.toFixed(2)} kg` },
        ].map(({ label, value }) => (
          <Card key={label} className="border shadow-sm">
            <CardContent className="p-4">
              <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">{label}</p>
              <p className="text-xl font-black text-primary">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 font-bold uppercase text-[10px]">
              <Filter className="w-3.5 h-3.5" /> Filtros Avançados
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 sm:w-80 p-4">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os Status</SelectItem>
                    {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase">Vendedor</label>
                <Select value={sellerFilter} onValueChange={setSellerFilter}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    {allSellers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase">De</label>
                  <Input type="date" className="h-8 text-xs" value={dateRange.from} onChange={e => setDateRange({ ...dateRange, from: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase">Até</label>
                  <Input type="date" className="h-8 text-xs" value={dateRange.to} onChange={e => setDateRange({ ...dateRange, to: e.target.value })} />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <Button variant="outline" size="sm"
          className={`gap-2 font-bold uppercase text-[10px] ${groupByCity ? 'bg-primary/10 border-primary text-primary' : ''}`}
          onClick={() => setGroupByCity(!groupByCity)}>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${groupByCity ? 'rotate-180' : ''}`} /> Agrupar Cidade
        </Button>
        <Button variant="outline" size="sm" className="gap-2 font-bold uppercase text-[10px]" onClick={handleExport}>
          <FileDown className="w-3.5 h-3.5" /> Exportar
        </Button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Pesquisar por cliente, código ou cidade..."
          className="pl-10 h-11 text-xs font-bold uppercase tracking-widest shadow-inner bg-white border-2 focus-visible:ring-primary"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Tabela agrupada */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {Object.entries(groupedOrders).map(([groupName, groupOrders], idx) => (
              <div key={groupName} className={idx > 0 ? "border-t-4 border-primary/10" : ""}>
                {groupByCity && (
                  <div className="bg-primary/5 px-4 py-2 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                      <Truck className="w-3.5 h-3.5" /> {groupName}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[9px] bg-white">{groupOrders.length} PEDIDOS</Badge>
                      <Badge variant="outline" className="text-[9px] bg-white">
                        {groupOrders.reduce((acc, o) => acc + (o.totalValue || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] bg-white">
                        {groupOrders.reduce((acc, o) => acc + (o.items || []).reduce((s, i) => s + i.quantity, 0), 0)} UN
                      </Badge>
                      <Badge variant="outline" className="text-[9px] bg-white">
                        {groupOrders.reduce((acc, o) => acc + (o.totalWeight || 0), 0).toFixed(2)} KG
                      </Badge>
                    </div>
                  </div>
                )}
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="h-10">
                      {['Ref.', 'Cliente', 'Vendedor', 'Cidade', 'Qtd', 'KG', 'Data', 'Valor', 'Status', 'Ações'].map(h => (
                        <TableHead key={h} className="text-[9px] font-black uppercase whitespace-nowrap">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupOrders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-20 text-muted-foreground italic font-bold text-xs uppercase opacity-30">
                          Nenhum pedido encontrado
                        </TableCell>
                      </TableRow>
                    )}
                    {[...groupOrders]
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map(order => {
                        const totalItems = (order.items || []).reduce((acc, i) => acc + i.quantity, 0);
                        const StatusIcon = STATUS_MAP[order.status]?.icon || AlertCircle;
                        return (
                          <TableRow key={order.id} className="hover:bg-muted/20 h-14">
                            <TableCell className="font-mono text-[11px] font-black text-primary whitespace-nowrap">{order.id}</TableCell>
                            <TableCell className="text-[11px] font-black uppercase text-slate-700 max-w-[120px] truncate">{order.customerName}</TableCell>
                            <TableCell className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">{order.seller || '---'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                                <span className="text-[10px] font-black text-slate-700 uppercase whitespace-nowrap">{order.city || '---'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-[10px] font-black">{totalItems}</TableCell>
                            <TableCell className="text-center text-[10px] font-black">{order.totalWeight?.toFixed(1)}</TableCell>
                            <TableCell className="text-center text-[10px] whitespace-nowrap">
                              {order.createdAt ? format(new Date(order.createdAt), 'dd/MM/yy') : '---'}
                            </TableCell>
                            <TableCell className="text-right text-[11px] font-black whitespace-nowrap">R$ {(order.totalValue || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline"
                                className={`${STATUS_MAP[order.status]?.color} text-[8px] font-black uppercase tracking-tighter px-2 h-5 flex items-center gap-1 justify-center whitespace-nowrap`}>
                                <StatusIcon className="w-2.5 h-2.5" />
                                {STATUS_MAP[order.status]?.label || order.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-4">
                              <div className="flex justify-end gap-1">
                                {order.status === 'PENDENTE' && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:bg-green-50" onClick={() => onApprove(order.id)}>
                                    <CheckCircle2 className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => onViewDetails(order)}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {!['FATURADO', 'REJEITADO'].includes(order.status) && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => onEdit(order)}>
                                    <Edit3 className="w-4 h-4" />
                                  </Button>
                                )}
                                {['PENDENTE', 'PRODUCAO'].includes(order.status) && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => onDelete(order.id)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
          <Pagination
            total={filteredOrders.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>
    </div>
  );
}


// ─────────────────────────────────────────────
// MÓDULO — ABA DE COTAÇÕES SALVAS
// ─────────────────────────────────────────────
function QuotesTab({
  quotes,
  products,
  onConvert,
  onCancel,
  onView,
}: {
  quotes: SavedQuote[];
  products: Product[];
  onConvert: (quote: SavedQuote) => void;
  onCancel: (id: string) => void;
  onView: (quote: SavedQuote) => void;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() =>
    quotes.filter(q => {
      const matchSearch = !search || q.customerName.toLowerCase().includes(search.toLowerCase()) || q.id.toLowerCase().includes(search.toLowerCase());
      return matchSearch && (statusFilter === 'ALL' || q.status === statusFilter);
    }),
    [quotes, search, statusFilter]
  );

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Pesquisar cotação ou cliente..." className="pl-10 h-9 text-xs font-bold w-full"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 text-xs w-full sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="ABERTA">Abertas</SelectItem>
            <SelectItem value="CONVERTIDA">Convertidas</SelectItem>
            <SelectItem value="CANCELADA">Canceladas</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-[9px] font-bold text-muted-foreground uppercase sm:ml-auto">{filtered.length} cotações</span>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="h-10">
                  {['ID', 'Cliente', 'Cidade', 'Itens', 'Valor Total', 'Data', 'Status', 'Ações'].map(h => (
                    <TableHead key={h} className="text-[9px] font-black uppercase whitespace-nowrap">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-20 text-muted-foreground italic font-bold text-xs uppercase opacity-30">
                      Nenhuma cotação salva
                    </TableCell>
                  </TableRow>
                )}
                {paged.map(quote => (
                  <TableRow key={quote.id} className="hover:bg-muted/20 h-14">
                    <TableCell className="font-mono text-[11px] font-black text-primary whitespace-nowrap">{quote.id}</TableCell>
                    <TableCell className="text-[11px] font-black uppercase text-slate-700 max-w-[120px] truncate">{quote.customerName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-[10px] font-black text-slate-700 uppercase whitespace-nowrap">{quote.customerCity || '---'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-[10px] font-black">
                      {quote.items.reduce((acc, i) => acc + i.quantity, 0)} un
                    </TableCell>
                    <TableCell className="text-right text-[11px] font-black whitespace-nowrap">
                      R$ {quote.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center text-[10px] whitespace-nowrap">
                      {format(new Date(quote.createdAt), 'dd/MM/yy')}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`${QUOTE_STATUS_MAP[quote.status]?.color} text-[8px] font-black uppercase px-2 h-5 whitespace-nowrap`}>
                        {QUOTE_STATUS_MAP[quote.status]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => onView(quote)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {quote.status === 'ABERTA' && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:bg-green-50"
                              title="Converter em Pedido" onClick={() => onConvert(quote)}>
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50"
                              title="Cancelar Cotação" onClick={() => onCancel(quote.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination
            total={filtered.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>
    </div>
  );
}


// ─────────────────────────────────────────────
// COMPONENTE RAIZ
// ─────────────────────────────────────────────
export default function PedidosPage() {
  const {
    orders, products, priceTables, customers, members,
    isReady, addOrder, updateOrderStatus, deleteOrder, updateOrder
  } = useSystemData();

  // ── Modais de ação ──
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Pré-preenchimento quando converte cotação → pedido
  const [pendingCart, setPendingCart] = useState<OrderItem[] | undefined>();
  const [pendingCustomer, setPendingCustomer] = useState<Partial<CustomerForm> | undefined>();
  const [pendingPriceList, setPendingPriceList] = useState<string | undefined>();

  // ── Modais de detalhe / confirmação ──
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<SavedQuote | null>(null);
  const [orderToApprove, setOrderToApprove] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);

  // ── Cotações salvas ──
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>(loadQuotesFromStorage);

  const persistQuotes = (quotes: SavedQuote[]) => {
    setSavedQuotes(quotes);
    saveQuotesToStorage(quotes);
  };

  // ── Handlers de Pedido ──
  const handleSaveOrder = async (data: Partial<Order> & { isEdit: boolean; originalId?: string }) => {
    const { isEdit, originalId, ...orderData } = data;

    if (isEdit && originalId) {
      await updateOrder(originalId, orderData);
      toast({ title: "Pedido atualizado com sucesso." });
    } else {
      const newId = `PED-${1000 + orders.length + 1}`;
      const newOrder: Order = {
        id: newId,
        status: 'PENDENTE',
        createdAt: new Date().toISOString(),
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

  // ── Handlers de Cotação ──
  const handleSaveQuote = (data: Omit<SavedQuote, 'id' | 'createdAt' | 'status'>) => {
    const newQuote: SavedQuote = {
      id: `COT-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'ABERTA',
      ...data,
    };
    persistQuotes([newQuote, ...savedQuotes]);
    toast({ title: "Cotação salva", description: `${newQuote.id} registrada com sucesso.` });
  };

  const handleConvertQuoteToOrder = (items: OrderItem[], customerName: string, customerCity: string, customerPhone: string, priceList: string, quoteId?: string) => {
    setPendingCart(items);
    setPendingCustomer({ name: customerName, city: customerCity, phone: customerPhone });
    setPendingPriceList(priceList);
    if (quoteId) {
      persistQuotes(savedQuotes.map(q => q.id === quoteId ? { ...q, status: 'CONVERTIDA' as const } : q));
    }
    setIsOrderFormOpen(true);
    toast({ title: "Cotação convertida", description: "Revise e confirme o pedido." });
  };

  const handleCancelQuote = (quoteId: string) => {
    persistQuotes(savedQuotes.map(q => q.id === quoteId ? { ...q, status: 'CANCELADA' as const } : q));
    toast({ title: "Cotação cancelada." });
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
          <Button variant="outline" size="sm" className="gap-2 font-bold uppercase text-[10px] border-primary text-primary hover:bg-primary/5"
            onClick={() => setIsQuoteOpen(true)}>
            <FileText className="w-3.5 h-3.5" /> Cotação
          </Button>
          <Button size="sm" className="gap-2 font-black uppercase text-[10px] shadow-lg"
            onClick={() => { setEditingOrder(null); setPendingCart(undefined); setPendingCustomer(undefined); setPendingPriceList(undefined); setIsOrderFormOpen(true); }}>
            <Plus className="w-4 h-4" /> Novo Pedido
          </Button>
        </div>
      </div>

      {/* ── Tabs: Pedidos / Cotações ── */}
      <Tabs defaultValue="pedidos" className="w-full">
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="pedidos" className="gap-2 font-bold text-xs uppercase">
            <ClipboardList className="w-4 h-4" /> Pedidos
          </TabsTrigger>
          <TabsTrigger value="cotacoes" className="gap-2 font-bold text-xs uppercase">
            <BookOpen className="w-4 h-4" /> Cotações
            {savedQuotes.filter(q => q.status === 'ABERTA').length > 0 && (
              <Badge className="bg-primary text-white text-[8px] h-4 px-1.5 ml-1">
                {savedQuotes.filter(q => q.status === 'ABERTA').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pedidos" className="mt-4">
          <OrdersTab
            orders={orders}
            products={products}
            members={members}
            onApprove={id => setOrderToApprove(id)}
            onEdit={order => setOrderToEdit(order)}
            onDelete={id => setOrderToDelete(id)}
            onViewDetails={order => setSelectedOrder(order)}
          />
        </TabsContent>

        <TabsContent value="cotacoes" className="mt-4">
          <QuotesTab
            quotes={savedQuotes}
            products={products}
            onConvert={quote => handleConvertQuoteToOrder(quote.items, quote.customerName, quote.customerCity, quote.customerPhone, quote.priceTableId, quote.id)}
            onCancel={handleCancelQuote}
            onView={quote => setSelectedQuote(quote)}
          />
        </TabsContent>
      </Tabs>

      {/* ── Modais ── */}
      <QuoteGeneratorModal
        open={isQuoteOpen}
        onOpenChange={setIsQuoteOpen}
        products={products}
        priceTables={priceTables}
        onConvertToOrder={(items, name, city, phone, priceList) =>
          handleConvertQuoteToOrder(items, name, city, phone, priceList)
        }
        onSaveQuote={handleSaveQuote}
      />

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
        order={selectedOrder}
        products={products}
        onClose={() => setSelectedOrder(null)}
        onApprove={handleApproveOrder}
      />

      <QuoteDetailsModal
        quote={selectedQuote}
        products={products}
        onClose={() => setSelectedQuote(null)}
        onConvert={quote =>
          handleConvertQuoteToOrder(quote.items, quote.customerName, quote.customerCity, quote.customerPhone, quote.priceTableId, quote.id)
        }
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