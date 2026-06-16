'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSystemData } from '@/server/store';
import { Product } from '@/lib/types';
import { Loader2, ArrowLeft, ShieldCheck, ShieldAlert, FileText, Receipt, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function fmt(date?: string | null) {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('pt-BR');
}
function fmtDateTime(date?: string | null) {
    if (!date) return '—';
    return new Date(date).toLocaleString('pt-BR');
}
function fmtCurrency(value?: number | null, decimals = 2) {
    if (value == null) return '—';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtDuration(start?: string | null, end?: string | null) {
    if (!start) return '—';
    const endTime = end ? new Date(end).getTime() : new Date().getTime();
    const diffMs = endTime - new Date(start).getTime();
    if (diffMs <= 0) return '—';
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const h = hours % 24;
    const m = minutes % 60;
    if (days > 0) return `${days}d ${h}h`;
    if (hours > 0) return `${hours}h ${m}min`;
    return `${minutes}min`;
}

// ─────────────────────────────────────────────
// ATOMS
// ─────────────────────────────────────────────
function TimeLineItem({ label, date, nextDate, isLast, isFinished }: { label: string; date?: string | null; nextDate?: string | null; isLast?: boolean; isFinished?: boolean }) {
    if (!date) return null;
    const duration = nextDate ? fmtDuration(date, nextDate) : null;

    return (
        <div className="flex gap-4 relative">
            {!isLast && <div className="absolute left-[7px] top-6 bottom-0 w-[2px] bg-emerald-100" />}
            <div className="w-4 h-4 rounded-full border-2 border-emerald-500 bg-white shrink-0 mt-0.5 z-10" />
            <div className="pb-6 w-full">
                <p className="text-[11px] font-bold uppercase text-emerald-900 tracking-wider mb-1 mt-0">{label}</p>
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-mono text-[11px] font-medium">{fmtDateTime(date)}</span>
                    {duration && (
                        <span className="flex items-center gap-1.5 font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px]">
                            <Clock className="w-3 h-3 text-emerald-500" />
                            {duration}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
    return (
        <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-0.5">{label}</p>
            <p className="text-sm font-medium text-slate-900">{value ?? '—'}</p>
        </div>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-800 border-b border-slate-200 pb-2 mb-4">{children}</p>
    );
}

const STATUS_MAP: Record<string, [string, string]> = {
    PENDENTE: ['Pendente', 'bg-yellow-100 text-yellow-800 border-yellow-300'],
    FINANCEIRO: ['Aprovação Financeira', 'bg-cyan-100 text-cyan-800 border-cyan-300'],
    PRODUCAO: ['Produção', 'bg-blue-100 text-blue-800 border-blue-300'],
    ENTREGUE: ['Entregue', 'bg-green-100 text-green-800 border-green-300'],
    REJEITADO: ['Rejeitado', 'bg-red-100 text-red-800 border-red-300'],
    FATURADO: ['Faturado', 'bg-purple-100 text-purple-800 border-purple-300'],
    PRONTO_LOGISTICA: ['Pronto Logística', 'bg-cyan-100 text-cyan-800 border-cyan-300'],
    ENTREGA: ['Em Entrega', 'bg-orange-100 text-orange-800 border-orange-300'],
    AGUARDANDO_FATURAMENTO: ['Aguard. Faturamento', 'bg-slate-100 text-slate-700 border-slate-300'],
};

const STAGE_MAP: Record<string, string> = {
    FILA: 'Fila', PROCESSO: 'Em Processo', QUALIDADE: 'Qualidade', CONCLUIDO: 'Concluído',
};

// ─────────────────────────────────────────────
// PÁGINA
// ─────────────────────────────────────────────
export default function OrderDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const { orders, products: storeProducts, updateOrderStatus, isReady } = useSystemData();
    const products: Product[] = storeProducts ?? [];

    const order = useMemo(() => orders.find(o => o.id === id), [orders, id]);

    // ── Faturamento
    const [faturarOpen, setFaturarOpen] = useState(false);
    const [nfNumero, setNfNumero] = useState('');
    const [vendaDireta, setVendaDireta] = useState('');
    const [processing, setProcessing] = useState(false);

    // ── Cancelamento
    const [cancelarOpen, setCancelarOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');

    const openFaturar = () => { setNfNumero(''); setVendaDireta(''); setFaturarOpen(true); };
    const openCancelar = () => { setCancelReason(''); setCancelarOpen(true); };

    const handleConfirmFaturar = async () => {
        if (!vendaDireta.trim()) {
            toast({ variant: 'destructive', title: 'Informe o número da Venda Direta.' });
            return;
        }
        setProcessing(true);
        try {
            await updateOrderStatus(order!.id, 'FATURADO', {
                invoicedAt: new Date().toISOString(),
                nfNumero: nfNumero.trim() || null,
                vendaDiretaNumero: vendaDireta.trim(),
            } as any);
            toast({ title: 'Pedido faturado com sucesso.' });
            setFaturarOpen(false);
        } catch {
            toast({ variant: 'destructive', title: 'Erro ao faturar pedido.' });
        } finally {
            setProcessing(false);
        }
    };

    const handleRejeitar = async () => {
        try {
            await updateOrderStatus(order!.id, 'REJEITADO', { rejectedAt: new Date().toISOString() } as any);
            toast({ variant: 'destructive', title: 'Pedido rejeitado.' });
        } catch {
            toast({ variant: 'destructive', title: 'Erro ao rejeitar pedido.' });
        }
    };

    const handleConfirmCancelar = async () => {
        if (!cancelReason.trim()) {
            toast({ variant: 'destructive', title: 'Informe o motivo do cancelamento.' });
            return;
        }
        setProcessing(true);
        try {
            await updateOrderStatus(order!.id, 'REJEITADO', {
                canceledAt: new Date().toISOString(),
                observations: cancelReason.trim(),
            } as any);
            toast({ title: 'Pedido REJEITADO com sucesso.' });
            setCancelarOpen(false);
        } catch {
            toast({ variant: 'destructive', title: 'Erro ao cancelar pedido.' });
        } finally {
            setProcessing(false);
        }
    };

    if (!isReady) return (
        <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );

    if (!order) return (
        <div className="flex items-center justify-center h-[60vh] text-sm text-muted-foreground">
            Pedido não encontrado
        </div>
    );

    const events = [
        { label: 'Pedido Criado', date: order.createdAt },
        { label: 'Aprovado para Produção', date: order.approvedAt },
        { label: 'Aprovado Financeiro', date: (order as any).approvedByFinance },
        { label: 'Início Expedição', date: order.acceptedAt },
        { label: 'Saída/Entrega', date: order.departureTime },
        { label: 'Faturamento', date: order.invoicedAt },
        { label: 'Entregue / Concluído', date: order.deliveredAt },
        { label: 'Rejeitado / Cancelado', date: order.rejectedAt },
    ].filter(e => e.date).sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());

    const isFinished = order.status === 'ENTREGUE' || order.status === 'REJEITADO';
    const firstEventDate = events.length > 0 ? events[0].date : order.createdAt;
    const lastEventDate = events.length > 0 ? events[events.length - 1].date : order.createdAt;

    const [statusLabel, statusCls] = STATUS_MAP[order.status] ?? [order.status, 'bg-slate-100 text-slate-500 border-slate-200'];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">

            {/* ── HEADER ── */}
            <div className="bg-white border-b border-slate-200 px-6 py-5 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 shrink-0" onClick={() => router.back()}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-slate-900">{order.id}</h1>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] uppercase font-bold tracking-wider border ${statusCls}`}>
                                    {statusLabel}
                                </span>
                            </div>
                            <p className="text-sm font-medium text-slate-500 mt-1">
                                <span className="text-slate-800">{order.customerName}</span> {order.city && ` • ${order.city}`}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pl-12">
                    <div className="flex flex-wrap items-center gap-6">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-0.5">Valor Total</p>
                            <p className="text-lg font-bold text-slate-900">{fmtCurrency(order.totalValue)}</p>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-0.5">Peso Total</p>
                            <p className="text-lg font-bold text-slate-900">{order.totalWeight != null ? `${order.totalWeight.toFixed(2)} kg` : '—'}</p>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-0.5">Tempo do Pedido</p>
                            <p className="text-lg font-medium text-slate-700">
                                {firstEventDate && lastEventDate && firstEventDate !== lastEventDate 
                                    ? fmtDuration(firstEventDate, lastEventDate) 
                                    : '—'}
                            </p>
                        </div>
                    </div>

                    {order.status !== 'ENTREGUE' && (
                        <div className="flex items-center gap-2">
                            {order.status === 'AGUARDANDO_FATURAMENTO' && (
                                <Button size="sm" className="gap-2 font-medium bg-emerald-600 hover:bg-emerald-700 text-white" onClick={openFaturar}>
                                    <ShieldCheck className="w-4 h-4" /> Faturar Pedido
                                </Button>
                            )}
                            <Button size="sm" variant="outline" className="gap-2 font-medium text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={openCancelar}>
                                <ShieldAlert className="w-4 h-4" /> Cancelar Pedido
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── CONTENT ── */}
            <div className="flex-1 overflow-y-auto px-6 py-8">
                <div className="max-w-screen-2xl mx-auto space-y-8">

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        {/* ── ESQUERDA ── */}
                        <div className="lg:col-span-2 space-y-6">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white border border-slate-200 border-t-4 border-t-emerald-600 p-5 rounded-sm shadow-sm">
                                {/* Cliente */}
                                <div>
                                    <SectionTitle>Cliente</SectionTitle>
                                    <div className="grid grid-cols-2 gap-4">
                                        <InfoField label="Nome" value={order.customerName} />
                                        <InfoField label="CPF / CNPJ" value={order.customerDocument} />
                                        <InfoField label="Telefone" value={order.customerPhone} />
                                        <InfoField label="E-mail" value={order.customerEmail} />
                                        <InfoField label="Cidade" value={order.city} />
                                    </div>
                                    <div className="mt-4 space-y-4">
                                        <InfoField label="Endereço" value={order.customerAddress} />
                                    </div>
                                </div>

                                {/* Comercial */}
                                <div>
                                    <SectionTitle>Comercial</SectionTitle>
                                    <div className="grid grid-cols-2 gap-4">
                                        <InfoField label="Vendedor" value={order.seller} />
                                        <InfoField label="Fechado por" value={order.closedBy} />
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-4">
                                        <InfoField label="Pagamento" value={order.paymentCondition?.replace(/_/g, ' ')} />
                                    </div>
                                    {order.observations && (
                                        <div className="mt-4">
                                            <InfoField label="Observações" value={order.observations} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white border border-slate-200 border-t-4 border-t-emerald-600 p-5 rounded-sm shadow-sm">
                                {/* Carregamento */}
                                <div>
                                    <SectionTitle>Carregamento</SectionTitle>
                                    <div className="grid grid-cols-2 gap-4">
                                        <InfoField label="Tipo de carga" value={order.tipoCarga} />
                                        <InfoField label="Grupo de carga" value={order.grupoCarga} />
                                    </div>
                                </div>

                                {/* Faturamento */}
                                <div>
                                    <SectionTitle>Faturamento</SectionTitle>
                                    <div className="grid grid-cols-2 gap-4">
                                        <InfoField label="NF Número" value={order.nfNumero} />
                                        <InfoField label="Venda Direta Nº" value={order.vendaDiretaNumero} />
                                    </div>
                                </div>
                            </div>

                            {((order as any).meioDescarga || (order as any).responsavelDescarga || (order as any).dataHoraDescarga || (order as any).especificidadesEntrega) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white border border-slate-200 border-t-4 border-t-blue-600 p-5 rounded-sm shadow-sm">
                                    <div>
                                        <SectionTitle>Descarga e Entrega</SectionTitle>
                                        <div className="grid grid-cols-2 gap-4">
                                            {(order as any).meioDescarga && (
                                                <InfoField 
                                                    label="Meio de Descarga" 
                                                    value={
                                                        (order as any).meioDescarga === 'PROPRIO' ? '🏢 Próprio' :
                                                        (order as any).meioDescarga === 'AJUDANTE_EXTERNO' ? '👷 Ajudante Externo' :
                                                        '🏗️ Empilhadeira'
                                                    } 
                                                />
                                            )}
                                            {(order as any).responsavelDescarga && (
                                                <InfoField 
                                                    label="Responsável pela Descarga" 
                                                    value={
                                                        (order as any).responsavelDescarga === 'CLIENTE' ? '👤 Cliente' : '🏪 Lotus'
                                                    } 
                                                />
                                            )}
                                            {(order as any).dataHoraDescarga && (
                                                <InfoField 
                                                    label="Data/Hora da Descarga" 
                                                    value={fmtDateTime((order as any).dataHoraDescarga)} 
                                                />
                                            )}
                                            {(order as any).especificidadesEntrega && (
                                                <InfoField 
                                                    label="Observações de Entrega" 
                                                    value={(order as any).especificidadesEntrega} 
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* ── DIREITA ── */}
                        <div className="flex flex-col gap-6">

                            {/* Linha do Tempo */}
                            <div className="bg-white border border-slate-200 border-t-4 border-t-emerald-600 p-5 rounded-sm shadow-sm sticky top-6">
                                <SectionTitle>Linha do Tempo</SectionTitle>
                                <div className="pt-2 pl-1">
                                    {events.map((event, idx) => (
                                        <TimeLineItem
                                            key={event.label}
                                            label={event.label}
                                            date={event.date}
                                            nextDate={events[idx + 1]?.date}
                                            isLast={idx === events.length - 1}
                                            isFinished={isFinished}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── ITENS (Abaixo ocupando MÁXIMO) ── */}
                    <div className="bg-white border border-slate-200 border-l-4 border-l-emerald-600 p-5 rounded-sm shadow-sm">
                        <SectionTitle>Itens do Pedido</SectionTitle>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-[10px] font-medium uppercase tracking-wider text-slate-500 border-b border-slate-200">
                                        <th className="py-2.5 pr-3">Produto</th>
                                        <th className="py-2.5 text-right">Qtd</th>
                                        <th className="py-2.5 text-right">Peso</th>
                                        <th className="py-2.5 text-right">Unitário</th>
                                        <th className="py-2.5 text-right">Total</th>
                                        <th className="py-2.5 text-right">R$/peso</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(order.items ?? []).map((item) => {
                                        const prod = products.find(p => p.id === item.productId);
                                        const total = (item.finalPrice ?? item.price) * item.quantity;
                                        const weightPerUnit = prod?.weight ?? 0;
                                        const totalWeight = weightPerUnit * item.quantity;
                                        const pricePerKg = totalWeight > 0 ? total / totalWeight : (item.price);

                                        return (
                                            <tr key={item.productId} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                                                <td className="py-2.5 pr-3">
                                                    <p className="font-medium text-slate-800">{prod?.name ?? '—'}</p>
                                                    <p className="text-[10px] text-slate-400 font-mono tracking-wide">{item.productId}</p>
                                                </td>
                                                <td className="py-2.5 text-right font-medium text-slate-800">{item.quantity}</td>
                                                <td className="py-2.5 text-right text-slate-500">{totalWeight > 0 ? `${totalWeight.toFixed(2)} kg` : '—'}</td>
                                                <td className="py-2.5 text-right text-slate-700">{fmtCurrency(item.price)}</td>
                                                <td className="py-2.5 text-right text-slate-800 font-medium">{fmtCurrency(total)}</td>
                                                <td className="py-2.5 text-right text-emerald-700 font-mono text-[11px] font-semibold">{fmtCurrency(pricePerKg, 4)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="mt-6 pt-4 border-t border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-end rounded-md bg-emerald-50/50 border border-emerald-100 p-4">
                            <div className="text-right">
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-800/60 mb-0.5">Qtd Itens</span>
                                <span className="font-bold text-emerald-900 text-lg">{(order.items ?? []).reduce((acc, i) => acc + i.quantity, 0)}</span>
                            </div>
                            <div className="text-right">
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-800/60 mb-0.5">Peso Total</span>
                                <span className="font-bold text-emerald-900 text-lg">{order.totalWeight != null ? `${order.totalWeight.toFixed(2)} kg` : '—'}</span>
                            </div>
                            <div className="text-right">
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-800/60 mb-0.5">R$/peso Médio</span>
                                <span className="font-mono font-bold text-emerald-700 text-lg">
                                    {order.totalWeight && order.totalWeight > 0 && order.totalValue 
                                        ? fmtCurrency(order.totalValue / order.totalWeight, 4) 
                                        : '—'}
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-800/60 mb-0.5">Valor Total</span>
                                <span className="font-black text-emerald-900 text-2xl leading-none">{fmtCurrency(order.totalValue)}</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>


            {/* ── DIALOG FATURAMENTO ── */}
            <Dialog open={faturarOpen} onOpenChange={v => !processing && setFaturarOpen(v)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-black uppercase text-sm flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-green-600" /> Confirmar Faturamento
                        </DialogTitle>
                        <DialogDescription className="text-[10px] font-bold uppercase text-muted-foreground">
                            {order.id} · {order.customerName}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="bg-muted/30 rounded-lg px-4 py-3 flex justify-between items-center border">
                            <div>
                                <p className="text-[9px] font-black uppercase text-muted-foreground">Cliente</p>
                                <p className="text-xs font-black uppercase">{order.customerName}</p>
                                <p className="text-[9px] font-bold text-muted-foreground">{order.city}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black uppercase text-muted-foreground">Valor Total</p>
                                <p className="text-lg font-black text-primary">{fmtCurrency(order.totalValue)}</p>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                                <Receipt className="w-3 h-3" /> Número da Venda Direta <span className="text-red-500">*</span>
                            </label>
                            <Input placeholder="Ex: 123456" className="h-9 text-xs font-bold font-mono" value={vendaDireta} onChange={e => setVendaDireta(e.target.value)} autoFocus />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                                <FileText className="w-3 h-3" /> Número da NF-35 <span className="text-[9px] text-muted-foreground/60 font-normal normal-case">(opcional)</span>
                            </label>
                            <Input placeholder="Ex: 000123" className="h-9 text-xs font-bold font-mono" value={nfNumero} onChange={e => setNfNumero(e.target.value)} />
                        </div>

                        <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3">
                            <p className="text-[9px] font-black uppercase text-green-700 mb-0.5">Data de Faturamento</p>
                            <p className="text-xs font-black text-green-800">{format(new Date(), 'dd/MM/yyyy')} às {format(new Date(), 'HH:mm')} — registrado automaticamente</p>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="ghost" size="sm" className="font-bold text-xs uppercase" onClick={() => setFaturarOpen(false)} disabled={processing}>
                            Cancelar
                        </Button>
                        <Button size="sm" className="gap-2 font-black text-xs uppercase bg-green-600 hover:bg-green-700" onClick={handleConfirmFaturar} disabled={processing}>
                            {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><ShieldCheck className="w-3.5 h-3.5" /> Confirmar Faturamento</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── DIALOG CANCELAMENTO ── */}
            <Dialog open={cancelarOpen} onOpenChange={v => !processing && setCancelarOpen(v)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-black uppercase text-sm flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-gray-600" /> Cancelar Pedido
                        </DialogTitle>
                        <DialogDescription className="text-[10px] font-bold uppercase text-muted-foreground">
                            {order.id} · {order.customerName}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="bg-muted/30 rounded-lg px-4 py-3 flex justify-between items-center border">
                            <div>
                                <p className="text-[9px] font-black uppercase text-muted-foreground">Cliente</p>
                                <p className="text-xs font-black uppercase">{order.customerName}</p>
                                <p className="text-[9px] font-bold text-muted-foreground">{order.city}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black uppercase text-muted-foreground">Valor Total</p>
                                <p className="text-lg font-black text-primary">{fmtCurrency(order.totalValue)}</p>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                                <FileText className="w-3 h-3" /> Motivo da Rejeição <span className="text-red-500">*</span>
                            </label>
                            <Input
                                placeholder="Ex: Cliente solicitou cancelamento, erro no pedido, etc."
                                className="h-9 text-xs font-bold"
                                value={cancelReason}
                                onChange={e => setCancelReason(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                            <p className="text-[9px] font-black uppercase text-red-700 mb-0.5">Aviso</p>
                            <p className="text-xs font-semibold text-red-800">Esta ação marcará o pedido como REJEITADO e não poderá ser desfeita imediatamente. O motivo será registrado em observações.</p>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="ghost" size="sm" className="font-bold text-xs uppercase" onClick={() => setCancelarOpen(false)} disabled={processing}>
                            Manter Pedido
                        </Button>
                        <Button size="sm" className="gap-2 font-black text-xs uppercase bg-red-600 hover:bg-red-700" onClick={handleConfirmCancelar} disabled={processing}>
                            {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><ShieldAlert className="w-3.5 h-3.5" /> Confirmar Rejeição</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}