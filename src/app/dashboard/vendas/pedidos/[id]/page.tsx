'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSystemData } from '@/server/store';
import { Product } from '@/lib/types';
import { Loader2, ArrowLeft, ShieldCheck, ShieldAlert, FileText, Receipt } from 'lucide-react';
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
function fmtCurrency(value?: number | null) {
    if (value == null) return '—';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ─────────────────────────────────────────────
// ATOMS
// ─────────────────────────────────────────────
function InfoField({ label, value }: { label: string; value?: string | null }) {
    return (
        <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">{label}</p>
            <p className="text-sm font-semibold text-foreground">{value ?? '—'}</p>
        </div>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[10px] font-black uppercase tracking-widest text-foreground border-b pb-2 mb-4">{children}</p>
    );
}

const STATUS_MAP: Record<string, [string, string]> = {
    PENDENTE: ['Pendente', 'bg-yellow-100 text-yellow-800 border-yellow-300'],
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

    const openFaturar = () => { setNfNumero(''); setVendaDireta(''); setFaturarOpen(true); };

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

    const [statusLabel, statusCls] = STATUS_MAP[order.status] ?? [order.status, 'bg-muted text-muted-foreground border-muted'];

    return (
        <div className="min-h-screen bg-white flex flex-col">

            {/* ── HEADER ── */}
            <div className="bg-primary px-6 py-6 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                        <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10 mt-0.5 shrink-0" onClick={() => router.back()}>
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Pedido</p>
                            <h1 className="text-xl font-black text-white font-mono">{order.id}</h1>
                            <p className="text-sm font-semibold text-white/80 mt-0.5">{order.customerName}</p>
                            {order.city && <p className="text-xs text-white/60">{order.city}</p>}
                        </div>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black border ${statusCls}`}>
                        {statusLabel}
                    </span>
                </div>
                {order.status === 'AGUARDANDO_FATURAMENTO' && (
                    <div className="flex gap-2 pl-10">
                        <Button size="sm" className="gap-1.5 text-xs font-black uppercase h-8 bg-green-500 hover:bg-green-400 text-white" onClick={openFaturar}>
                            <ShieldCheck className="w-3.5 h-3.5" /> Faturar Pedido
                        </Button>
                    </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-white pl-10">
                    <div>
                        <p className="text-[10px] text-white/60 font-bold uppercase">Total</p>
                        <p className="text-lg font-black">{fmtCurrency(order.totalValue)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-white/60 font-bold uppercase">Peso Total</p>
                        <p className="text-lg font-black">{order.totalWeight != null ? `${order.totalWeight.toFixed(2)} kg` : '—'}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-white/60 font-bold uppercase">Criado em</p>
                        <p className="text-sm font-semibold">{fmtDateTime(order.createdAt)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-white/60 font-bold uppercase">Entrega</p>
                        <p className="text-sm font-semibold">{fmt(order.deliveryDate)}</p>
                    </div>
                </div>
            </div>

            {/* ── CONTENT ── */}
            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr]">

                    {/* ── ESQUERDA ── */}
                    <div className="p-6 space-y-8 border-r">

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
                                <InfoField label="ID do Cliente" value={order.customerId} />
                            </div>
                        </div>

                        {/* Comercial */}
                        <div>
                            <SectionTitle>Comercial</SectionTitle>
                            <div className="grid grid-cols-2 gap-4">
                                <InfoField label="Vendedor" value={order.seller} />
                                <InfoField label="Fechado por" value={order.closedBy} />
                                <InfoField label="Usuário" value={order.user} />
                                <InfoField label="Pagamento" value={order.paymentCondition?.replace(/_/g, ' ')} />
                                <InfoField label="Tabela de Preço" value={order.priceTableId} />
                            </div>
                            {order.observations && (
                                <div className="mt-4">
                                    <InfoField label="Observações" value={order.observations} />
                                </div>
                            )}
                        </div>

                        {/* Produção */}
                        <div>
                            <SectionTitle>Produção</SectionTitle>
                            <div className="grid grid-cols-2 gap-4">
                                <InfoField label="Estágio" value={order.productionStage ? (STAGE_MAP[order.productionStage] ?? order.productionStage) : null} />
                                <InfoField label="Lote" value={order.loteId} />
                                <InfoField label="Data do Lote" value={fmt(order.loteDate)} />
                                <InfoField label="Aprovado em" value={fmtDateTime(order.approvedAt)} />
                                <InfoField label="Visualizado em" value={fmtDateTime(order.viewedAt)} />
                            </div>
                        </div>

                        {/* Logística */}
                        <div>
                            <SectionTitle>Logística</SectionTitle>
                            <div className="grid grid-cols-2 gap-4">
                                <InfoField label="Veículo" value={order.assignedVehicleId} />
                                <InfoField label="Motorista" value={order.assignedDriverId} />
                                <InfoField label="Aceito em" value={fmtDateTime(order.acceptedAt)} />
                                <InfoField label="Entrega Agendada" value={fmt(order.scheduledDeliveryDate)} />
                                <InfoField label="Saída" value={fmtDateTime(order.departureTime)} />
                                <InfoField label="Data de Entrega" value={fmt(order.deliveryDate)} />
                                <InfoField label="Entregue em" value={fmtDateTime(order.deliveredAt)} />
                            </div>
                        </div>

                        {/* Faturamento */}
                        <div>
                            <SectionTitle>Faturamento</SectionTitle>
                            <div className="grid grid-cols-2 gap-4">
                                <InfoField label="NF Número" value={order.nfNumero} />
                                <InfoField label="Venda Direta Nº" value={order.vendaDiretaNumero} />
                                <InfoField label="Faturado em" value={fmtDateTime(order.invoicedAt)} />
                                <InfoField label="Rejeitado em" value={fmtDateTime(order.rejectedAt)} />
                            </div>
                        </div>

                        {/* Controle */}
                        <div>
                            <SectionTitle>Controle</SectionTitle>
                            <div className="grid grid-cols-2 gap-4">
                                <InfoField label="Criado em" value={fmtDateTime(order.createdAt)} />
                                <InfoField label="Atualizado em" value={fmtDateTime(order.updatedAt)} />
                            </div>
                        </div>
                    </div>

                    {/* ── DIREITA ── */}
                    <div className="p-6 flex flex-col gap-8">

                        {/* Itens */}
                        <div>
                            <SectionTitle>Itens do Pedido</SectionTitle>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground border-b">
                                            <th className="py-2 pr-3">Produto</th>
                                            <th className="py-2 text-right">Qtd</th>
                                            <th className="py-2 text-right">Peso</th>
                                            <th className="py-2 text-right">Unitário</th>
                                            <th className="py-2 text-right">Desc.</th>
                                            <th className="py-2 text-right">Final</th>
                                            <th className="py-2 text-right">Total</th>
                                            <th className="py-2 text-right">R$/kg</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(order.items ?? []).map((item) => {
                                            const prod = products.find(p => p.id === item.productId);
                                            const total = (item.finalPrice ?? item.price) * item.quantity;
                                            const weightPerUnit = prod?.weight ?? 0;
                                            const totalWeight = weightPerUnit * item.quantity;
                                            const pricePerKg = totalWeight > 0 ? total / totalWeight : 0;

                                            return (
                                                <tr key={item.productId} className="border-b last:border-0">
                                                    <td className="py-2.5 pr-3">
                                                        <p className="font-semibold">{prod?.name ?? '—'}</p>
                                                        <p className="text-[10px] text-muted-foreground font-mono">{item.productId}</p>
                                                    </td>
                                                    <td className="py-2.5 text-right font-semibold">{item.quantity}</td>
                                                    <td className="py-2.5 text-right text-muted-foreground">{totalWeight > 0 ? `${totalWeight.toFixed(2)} kg` : '—'}</td>
                                                    <td className="py-2.5 text-right">{fmtCurrency(item.price)}</td>
                                                    <td className="py-2.5 text-right text-orange-500 font-bold">
                                                        {(item.discount ?? 0) > 0 ? `${item.discount}%` : '—'}
                                                    </td>                                                    <td className="py-2.5 text-right">{fmtCurrency(item.finalPrice)}</td>
                                                    <td className="py-2.5 text-right font-black">{fmtCurrency(total)}</td>
                                                    <td className="py-2.5 text-right text-muted-foreground">{pricePerKg > 0 ? fmtCurrency(pricePerKg) : '—'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Totalizador */}
                        <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Quantidade total</span>
                                <span className="font-semibold">{(order.items ?? []).reduce((acc, i) => acc + i.quantity, 0)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Peso total</span>
                                <span className="font-semibold">{order.totalWeight != null ? `${order.totalWeight.toFixed(2)} kg` : '—'}</span>
                            </div>
                            <div className="flex justify-between text-base font-black pt-2 border-t">
                                <span>Total</span>
                                <span>{fmtCurrency(order.totalValue)}</span>
                            </div>
                        </div>

                        {/* Linha do Tempo */}
                        <div>
                            <SectionTitle>Linha do Tempo</SectionTitle>
                            <div className="space-y-2">
                                {([
                                    { label: 'Criado', date: order.createdAt },
                                    { label: 'Visualizado', date: order.viewedAt },
                                    { label: 'Aceito', date: order.acceptedAt },
                                    { label: 'Aprovado', date: order.approvedAt },
                                    { label: 'Saída', date: order.departureTime },
                                    { label: 'Faturado', date: order.invoicedAt },
                                    { label: 'Entregue', date: order.deliveredAt },
                                    { label: 'Rejeitado', date: order.rejectedAt },
                                    { label: 'Atualizado', date: order.updatedAt },
                                ] as { label: string; date: string | null | undefined }[])
                                    .filter(e => e.date)
                                    .map(({ label, date }) => (
                                        <div key={label} className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                                            <p className="text-xs text-muted-foreground w-24 shrink-0 font-bold uppercase">{label}</p>
                                            <p className="text-xs font-mono text-foreground">{fmtDateTime(date)}</p>
                                        </div>
                                    ))}
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
        </div>
    );
}