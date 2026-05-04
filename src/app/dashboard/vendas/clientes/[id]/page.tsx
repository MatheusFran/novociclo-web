'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSystemData } from '@/server/store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Loader2, ArrowLeft, Building2, Phone, Mail, MapPin,
    FileText, TrendingUp, CheckCircle2, Clock, AlertTriangle,
    Package, CreditCard, User, Tag, Calendar, ExternalLink,
    ChevronRight, BarChart3, Activity, ShoppingCart,
    AlertCircle, BadgeCheck, Edit3, Save, X, Plus, Check,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function formatDate(date?: string | Date | null) {
    if (!date) return '—';
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
}
function formatDateTime(date?: string | Date | null) {
    if (!date) return '—';
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
}
function formatCurrency(value?: number | null) {
    if (value == null) return '—';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ─────────────────────────────────────────────
// ATOMS
// ─────────────────────────────────────────────
function Field({ label, value, mono, full }: { label: string; value?: string | null; mono?: boolean; full?: boolean }) {
    return (
        <div className={full ? 'col-span-2' : ''}>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">{label}</p>
            <p className={`text-sm font-semibold text-foreground leading-snug ${mono ? 'font-mono text-xs' : ''}`}>{value ?? '—'}</p>
        </div>
    );
}

function FieldInput({ label, value, onChange, type = 'text', placeholder }: {
    label: string; value: string; onChange: (v: string) => void;
    type?: string; placeholder?: string;
}) {
    return (
        <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
            <Input className="h-8 text-xs" type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
        </div>
    );
}

function BlockTitle({ icon, children, onEdit }: { icon: React.ReactNode; children: React.ReactNode; onEdit?: () => void }) {
    return (
        <div className="flex items-center gap-2 mb-5">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">{icon}</div>
            <p className="text-[10px] font-black uppercase tracking-widest text-foreground flex-1">{children}</p>
            {onEdit && (
                <Button variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground hover:text-foreground" onClick={onEdit}>
                    <Edit3 className="w-3.5 h-3.5" />
                </Button>
            )}
        </div>
    );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2 opacity-50">
            {icon}
            <p className="text-[10px] font-black uppercase">{text}</p>
        </div>
    );
}

function StatCard({ label, value, icon, color, sub }: {
    label: string; value: string | number; icon: React.ReactNode; color: string; sub?: string;
}) {
    return (
        <Card className="border shadow-sm">
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
                        <p className={`text-xl font-black leading-none ${color}`}>{value}</p>
                        {sub && <p className="text-[9px] text-muted-foreground mt-1.5">{sub}</p>}
                    </div>
                    <div className={`p-2 rounded-lg bg-muted/60 shrink-0 ${color}`}>{icon}</div>
                </div>
            </CardContent>
        </Card>
    );
}

function OrderStatusBadge({ status }: { status?: string | null }) {
    if (!status) return <span className="text-xs text-muted-foreground">—</span>;
    const map: Record<string, [string, string]> = {
        PENDENTE: ['Pendente', 'bg-yellow-100 text-yellow-800 border-yellow-300'],
        PRODUCAO: ['Produção', 'bg-blue-100 text-blue-800 border-blue-300'],
        ENTREGUE: ['Entregue', 'bg-green-100 text-green-800 border-green-300'],
        REJEITADO: ['Rejeitado', 'bg-red-100 text-red-800 border-red-300'],
        FATURADO: ['Faturado', 'bg-purple-100 text-purple-800 border-purple-300'],
        PRONTO_LOGISTICA: ['Pronto Log.', 'bg-cyan-100 text-cyan-800 border-cyan-300'],
        ENTREGA: ['Em Entrega', 'bg-orange-100 text-orange-800 border-orange-300'],
        AGUARDANDO_FATURAMENTO: ['Aguard. Fat.', 'bg-slate-100 text-slate-700 border-slate-300'],
    };
    const [label, cls] = map[status] ?? [status, 'bg-muted text-muted-foreground border-muted'];
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border whitespace-nowrap ${cls}`}>
            {label}
        </span>
    );
}

function InadimplenteBadge({ inadimplente, onToggle, saving }: {
    inadimplente?: boolean | null; onToggle: () => void; saving: boolean;
}) {
    if (inadimplente === true) return (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <div className="flex-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-red-500">Status Financeiro</p>
                <p className="text-sm font-black text-red-700">Inadimplente</p>
            </div>
            <Button size="sm" variant="outline" className="text-[10px] font-black uppercase h-7 border-red-300 text-red-700 hover:bg-red-100" onClick={onToggle} disabled={saving}>
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3 mr-1" />Marcar Em Dia</>}
            </Button>
        </div>
    );
    if (inadimplente === false) return (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-50 border border-green-200">
            <BadgeCheck className="w-5 h-5 text-green-600 shrink-0" />
            <div className="flex-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-green-500">Status Financeiro</p>
                <p className="text-sm font-black text-green-700">Em Dia</p>
            </div>
            <Button size="sm" variant="outline" className="text-[10px] font-black uppercase h-7 border-green-300 text-green-700 hover:bg-green-100" onClick={onToggle} disabled={saving}>
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <><AlertCircle className="w-3 h-3 mr-1" />Marcar Inadimplente</>}
            </Button>
        </div>
    );
    return (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/40 border">
            <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0" />
            <div className="flex-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Status Financeiro</p>
                <p className="text-sm font-bold text-muted-foreground">Não definido</p>
            </div>
            <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="text-[10px] font-black uppercase h-7" onClick={onToggle} disabled={saving}>
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Definir'}
                </Button>
            </div>
        </div>
    );
}

const COLUNA_STEPS = ['ENTRADA', 'QUALIFICACAO', 'PROPOSTA', 'FECHADO'] as const;
const COLUNA_LABEL: Record<string, string> = { ENTRADA: 'Entrada', QUALIFICACAO: 'Qualificação', PROPOSTA: 'Proposta', FECHADO: 'Fechado' };
const COLUNA_COLOR: Record<string, string> = { ENTRADA: 'bg-blue-500', QUALIFICACAO: 'bg-yellow-500', PROPOSTA: 'bg-purple-500', FECHADO: 'bg-green-500' };
const COLUNA_BADGE: Record<string, string> = {
    ENTRADA: 'bg-blue-100 text-blue-800 border-blue-200',
    QUALIFICACAO: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    PROPOSTA: 'bg-purple-100 text-purple-800 border-purple-200',
    FECHADO: 'bg-green-100 text-green-800 border-green-200',
};

// ─────────────────────────────────────────────
// MODAL GENÉRICO DE EDIÇÃO
// ─────────────────────────────────────────────
function EditModal({ open, onOpenChange, title, icon, onSave, saving, children }: {
    open: boolean; onOpenChange: (v: boolean) => void;
    title: string; icon: React.ReactNode;
    onSave: () => void; saving: boolean;
    children: React.ReactNode;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg p-0 gap-0">
                <DialogTitle className="sr-only">{title}</DialogTitle>
                <div className="sticky top-0 z-10 bg-primary px-5 py-4 flex items-center gap-2">
                    <div className="text-white/70">{icon}</div>
                    <p className="text-sm font-black uppercase text-white">{title}</p>
                </div>
                <div className="px-5 py-5 space-y-4">{children}</div>
                <div className="sticky bottom-0 bg-white border-t px-5 py-3 flex gap-2">
                    <Button variant="ghost" className="flex-1 text-xs font-bold uppercase h-9" onClick={() => onOpenChange(false)} disabled={saving}>
                        <X className="w-3.5 h-3.5 mr-1" /> Cancelar
                    </Button>
                    <Button className="flex-1 text-xs font-black uppercase h-9" onClick={onSave} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-3.5 h-3.5 mr-1" />Salvar</>}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─────────────────────────────────────────────
// MODAL: NOVA COBRANÇA
// ─────────────────────────────────────────────
interface LocalCobranca {
    id: string; description: string; amount: number;
    dueDate: string; status: 'ABERTA' | 'PAGA';
}

function NovaCobrancaModal({ open, onOpenChange, onCreate }: {
    open: boolean; onOpenChange: (v: boolean) => void;
    onCreate: (c: LocalCobranca) => void;
}) {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState('');

    const handleCreate = () => {
        if (!description.trim() || !amount || !dueDate) {
            toast({ variant: 'destructive', title: 'Preencha todos os campos.' });
            return;
        }
        onCreate({ id: crypto.randomUUID(), description: description.trim(), amount: parseFloat(amount), dueDate, status: 'ABERTA' });
        setDescription(''); setAmount(''); setDueDate('');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm p-0 gap-0">
                <DialogTitle className="sr-only">Nova Cobrança</DialogTitle>
                <div className="bg-primary px-5 py-4">
                    <p className="text-sm font-black uppercase text-white">Nova Cobrança</p>
                </div>
                <div className="px-5 py-5 space-y-3">
                    <FieldInput label="Descrição" value={description} onChange={setDescription} placeholder="Ex: Duplicata #123" />
                    <FieldInput label="Valor (R$)" value={amount} onChange={setAmount} type="number" placeholder="0,00" />
                    <FieldInput label="Vencimento" value={dueDate} onChange={setDueDate} type="date" />
                </div>
                <div className="border-t px-5 py-3 flex gap-2">
                    <Button variant="ghost" className="flex-1 text-xs font-bold uppercase h-9" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button className="flex-1 text-xs font-black uppercase h-9" onClick={handleCreate}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Registrar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────
export default function CustomerPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { customers, orders, updateCustomer, isReady } = useSystemData();

    const customer = useMemo(() => customers.find(c => c.id === id), [customers, id]);

    const customerOrders = useMemo(
        () => (orders ?? []).filter(o => o.customerId === id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        [orders, id]
    );

    const stats = useMemo(() => {
        const total = customerOrders.reduce((acc, o) => acc + (o.totalValue ?? 0), 0);
        const entregues = customerOrders.filter(o => o.status === 'ENTREGUE').length;
        const pendentes = customerOrders.filter(o => ['PENDENTE', 'PRODUCAO', 'ENTREGA', 'PRONTO_LOGISTICA'].includes(o.status)).length;
        const ticketMedio = customerOrders.length > 0 ? total / customerOrders.length : 0;
        return { total, entregues, pendentes, ticketMedio, ultimo: customerOrders[0] };
    }, [customerOrders]);

    const pipelines = useMemo(() => customer?.crmPipelines ?? [], [customer]);
    const followUps = useMemo(() => customer?.followUps ?? [], [customer]);
    const tasks = useMemo(() => customer?.tasks ?? [], [customer]);
    const tags = useMemo(() => customer?.tags?.split(',').map((t: string) => t.trim()).filter(Boolean) ?? [], [customer]);

    // ── Estado local de cobranças (frontend only até conectar API)
    const [localCobrancas, setLocalCobrancas] = useState<LocalCobranca[]>([]);
    const [novaCobrancaModal, setNovaCobrancaModal] = useState(false);

    // ── Saving states
    const [saving, setSaving] = useState(false);
    const [savingInad, setSavingInad] = useState(false);

    // ── Modais de edição
    const [modalEmpresa, setModalEmpresa] = useState(false);
    const [modalContato, setModalContato] = useState(false);
    const [modalComercial, setModalComercial] = useState(false);
    const [modalFinanceiro, setModalFinanceiro] = useState(false);

    // ── Form states — Empresa
    const [fName, setFName] = useState('');
    const [fCnpj, setFCnpj] = useState('');
    const [fIE, setFIE] = useState('');
    const [fCity, setFCity] = useState('');
    const [fAddress, setFAddress] = useState('');

    // ── Form states — Contato
    const [fPhone, setFPhone] = useState('');
    const [fEmail, setFEmail] = useState('');
    const [fObs, setFObs] = useState('');

    // ── Form states — Comercial
    const [fSegmento, setFSegmento] = useState('');
    const [fTipo, setFTipo] = useState('');
    const [fResponsavel, setFResponsavel] = useState('');
    const [fOrigem, setFOrigem] = useState('');
    const [fTags, setFTags] = useState('');

    // ── Form states — Financeiro
    const [fRisco, setFRisco] = useState('');
    const [fScore, setFScore] = useState('');
    const [fPrazo, setFPrazo] = useState('');
    const [fVendaPrazo, setFVendaPrazo] = useState('');

    // ── Abrir modais (preencher form com dados atuais)
    const openEmpresa = () => {
        setFName(customer?.name ?? '');
        setFCnpj(customer?.cpfcnpj ?? '');
        setFIE(customer?.IE ?? '');
        setFCity(customer?.city ?? '');
        setFAddress(customer?.address ?? '');
        setModalEmpresa(true);
    };
    const openContato = () => {
        setFPhone(customer?.phone ?? '');
        setFEmail(customer?.email ?? '');
        setFObs(customer?.observacoes ?? '');
        setModalContato(true);
    };
    const openComercial = () => {
        setFSegmento(customer?.segmento ?? '');
        setFTipo(customer?.tipoCliente ?? '');
        setFResponsavel(customer?.responsavel ?? '');
        setFOrigem(customer?.origemLead ?? '');
        setFTags(customer?.tags ?? '');
        setModalComercial(true);
    };
    const openFinanceiro = () => {
        setFRisco(customer?.risco ?? '');
        setFScore(customer?.scoreInterno?.toString() ?? '');
        setFPrazo(customer?.prazoPagamentoPadrao?.toString() ?? '');
        setFVendaPrazo(customer?.vendaPrazo === true ? 'sim' : customer?.vendaPrazo === false ? 'nao' : '');
        setModalFinanceiro(true);
    };

    // ── Salvar seções
    const save = async (patch: Record<string, any>, closeModal: () => void) => {
        setSaving(true);
        try {
            await updateCustomer(id, patch);
            toast({ title: 'Salvo com sucesso.' });
            closeModal();
        } catch {
            toast({ variant: 'destructive', title: 'Erro ao salvar.' });
        } finally {
            setSaving(false);
        }
    };

    const saveEmpresa = () => save({ name: fName, cpfcnpj: fCnpj, IE: fIE, city: fCity, address: fAddress }, () => setModalEmpresa(false));
    const saveContato = () => save({ phone: fPhone, email: fEmail, observacoes: fObs }, () => setModalContato(false));
    const saveComercial = () => save({ segmento: fSegmento, tipoCliente: fTipo, responsavel: fResponsavel, origemLead: fOrigem, tags: fTags }, () => setModalComercial(false));
    const saveFinanceiro = () => save({
        risco: fRisco,
        scoreInterno: fScore ? parseInt(fScore) : null,
        prazoPagamentoPadrao: fPrazo ? parseInt(fPrazo) : null,
        vendaPrazo: fVendaPrazo === 'sim' ? true : fVendaPrazo === 'nao' ? false : null,
    }, () => setModalFinanceiro(false));

    // ── Toggle inadimplente
    const toggleInadimplente = async () => {
        setSavingInad(true);
        try {
            await updateCustomer(id, { inadimplente: !customer?.inadimplente });
            toast({ title: `Cliente marcado como ${!customer?.inadimplente ? 'Inadimplente' : 'Em Dia'}.` });
        } catch {
            toast({ variant: 'destructive', title: 'Erro ao atualizar status.' });
        } finally {
            setSavingInad(false);
        }
    };

    // ── Baixar cobrança
    const baixarCobranca = (cobId: string) => {
        setLocalCobrancas(prev => prev.map(c => c.id === cobId ? { ...c, status: 'PAGA' } : c));
        toast({ title: 'Cobrança baixada.' });
    };

    if (!isReady) return (
        <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );

    if (!customer) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
            <Building2 className="w-12 h-12 text-muted-foreground/20" />
            <p className="text-sm font-bold text-muted-foreground uppercase">Cliente não encontrado</p>
            <Button variant="ghost" size="sm" onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
        </div>
    );

    return (
        <div className="space-y-6 pb-16">

            {/* ══ HEADER ══ */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3">
                    <Button variant="ghost" size="icon" className="mt-0.5 shrink-0" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-black text-primary uppercase tracking-tight">{customer.name}</h1>
                            {customer.status && (
                                <Badge className={`text-[9px] font-black uppercase border ${customer.status === 'Ativo' ? 'bg-green-100 text-green-800 border-green-300' :
                                    customer.status === 'Inativo' ? 'bg-red-100 text-red-800 border-red-300' :
                                        'bg-muted text-muted-foreground border-muted'
                                    }`}>{customer.status}</Badge>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                            {customer.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{customer.city}</span>}
                            {customer.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{customer.phone}</span>}
                            {customer.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{customer.email}</span>}
                        </div>
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {tags.map((tag: string) => (
                                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border">
                                        <Tag className="w-2.5 h-2.5" />{tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* ══ STATS ══ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Total Comprado" value={formatCurrency(stats.total)} icon={<TrendingUp className="w-4 h-4" />} color="text-primary" sub={`${customerOrders.length} pedidos`} />
                <StatCard label="Ticket Médio" value={formatCurrency(stats.ticketMedio)} icon={<BarChart3 className="w-4 h-4" />} color="text-blue-600" />
                <StatCard label="Entregues" value={stats.entregues} icon={<CheckCircle2 className="w-4 h-4" />} color="text-green-600" />
                <StatCard label="Em Andamento" value={stats.pendentes} icon={<Clock className="w-4 h-4" />} color="text-orange-500" sub={stats.ultimo ? `Último: ${formatDate(stats.ultimo.createdAt)}` : undefined} />
            </div>

            {/* ══ TABS ══ */}
            <Tabs defaultValue="visao-geral" className="w-full">
                <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/60 p-1 w-full md:w-auto md:inline-flex">
                    {[
                        { value: 'visao-geral', label: 'Visão Geral', icon: <BarChart3 className="w-3.5 h-3.5" /> },
                        { value: 'pedidos', label: 'Pedidos', icon: <ShoppingCart className="w-3.5 h-3.5" />, count: customerOrders.length },
                        { value: 'crm', label: 'CRM', icon: <Activity className="w-3.5 h-3.5" />, count: pipelines.length },
                        { value: 'financeiro', label: 'Financeiro', icon: <CreditCard className="w-3.5 h-3.5" /> },
                    ].map(t => (
                        <TabsTrigger key={t.value} value={t.value} className="gap-1.5 font-bold text-[11px] uppercase">
                            {t.icon} {t.label}
                            {t.count != null && t.count > 0 && (
                                <span className="ml-0.5 bg-primary text-primary-foreground rounded-full text-[9px] font-black w-4 h-4 flex items-center justify-center">{t.count}</span>
                            )}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* ══ VISÃO GERAL ══ */}
                <TabsContent value="visao-geral" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-4">

                        {/* 40% */}
                        <div className="space-y-4">
                            <Card className="border shadow-sm">
                                <CardContent className="p-5">
                                    <BlockTitle icon={<Building2 className="w-3.5 h-3.5" />} onEdit={openEmpresa}>Dados da Empresa</BlockTitle>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                                        <Field label="CNPJ / CPF" value={customer.cpfcnpj} mono />
                                        <Field label="Inscrição Estadual" value={customer.IE} mono />
                                        <Field label="Cidade" value={customer.city} />
                                        <Field label="ID" value={customer.id} mono />
                                        {customer.address && <Field label="Endereço" value={customer.address} full />}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border shadow-sm">
                                <CardContent className="p-5">
                                    <BlockTitle icon={<User className="w-3.5 h-3.5" />} onEdit={openContato}>Contato</BlockTitle>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                                        <Field label="Telefone" value={customer.phone} />
                                        <Field label="E-mail" value={customer.email} full />
                                    </div>
                                    {customer.observacoes && (
                                        <>
                                            <Separator className="my-4" />
                                            <Field label="Observações" value={customer.observacoes} />
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* 60% */}
                        <div className="space-y-4">
                            <Card className="border shadow-sm">
                                <CardContent className="p-5">
                                    <BlockTitle icon={<TrendingUp className="w-3.5 h-3.5" />} onEdit={openComercial}>Comercial</BlockTitle>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                                        <Field label="Segmento" value={customer.segmento} />
                                        <Field label="Tipo de Cliente" value={customer.tipoCliente} />
                                        <Field label="Responsável" value={customer.responsavel} />
                                        <Field label="Origem Lead" value={customer.origemLead} />
                                    </div>
                                    {tags.length > 0 && (
                                        <>
                                            <Separator className="my-4" />
                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">Tags</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {tags.map((t: string) => (
                                                    <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border">
                                                        <Tag className="w-2.5 h-2.5" />{t}
                                                    </span>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="border shadow-sm">
                                <CardContent className="p-5">
                                    <BlockTitle icon={<Calendar className="w-3.5 h-3.5" />}>Relacionamento</BlockTitle>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-4 mb-4">
                                        <Field label="Último Contato" value={formatDate(customer.ultimoContato)} />
                                        <Field label="Próximo Follow-up" value={formatDate(customer.proximoFollowUp)} />
                                    </div>
                                    {followUps.length > 0 && (
                                        <>
                                            <Separator className="mb-4" />
                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-3">Histórico</p>
                                            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                                {followUps.map((f: any) => (
                                                    <div key={f.id} className="flex gap-3 px-3 py-2 rounded-lg bg-muted/40 border text-xs">
                                                        <span className="text-muted-foreground font-mono shrink-0">{formatDate(f.date)}</span>
                                                        <span>{f.note}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* ══ PEDIDOS ══ */}
                <TabsContent value="pedidos" className="mt-6">
                    <Card className="border shadow-sm">
                        <CardContent className="p-5">
                            <BlockTitle icon={<ShoppingCart className="w-3.5 h-3.5" />}>Histórico de Pedidos</BlockTitle>
                            {customerOrders.length === 0 ? (
                                <EmptyState icon={<Package className="w-8 h-8" />} text="Nenhum pedido encontrado" />
                            ) : (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-3 pb-2 border-b">
                                        {['Pedido', 'Status', 'Vendedor', 'Valor', ''].map(h => (
                                            <p key={h} className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{h}</p>
                                        ))}
                                    </div>
                                    {customerOrders.map(order => (
                                        <div key={order.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-center px-3 py-3 rounded-xl border bg-slate-50/50 hover:bg-slate-100/60 transition-colors group">
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-black font-mono truncate">{order.id}</p>
                                                <p className="text-[10px] text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                                            </div>
                                            <OrderStatusBadge status={order.status} />
                                            <p className="text-xs text-muted-foreground hidden md:block">{order.seller ?? '—'}</p>
                                            <p className="text-sm font-black tabular-nums">{formatCurrency(order.totalValue)}</p>
                                            <Button variant="ghost" size="icon" className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => window.open(`/pedidos/${order.id}`, '_blank')}>
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ══ CRM ══ */}
                <TabsContent value="crm" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-4">
                        <div className="space-y-4">
                            <Card className="border shadow-sm">
                                <CardContent className="p-5">
                                    <BlockTitle icon={<CheckCircle2 className="w-3.5 h-3.5" />}>Tarefas</BlockTitle>
                                    {tasks.length === 0 ? (
                                        <EmptyState icon={<CheckCircle2 className="w-7 h-7" />} text="Nenhuma tarefa" />
                                    ) : (
                                        <div className="space-y-2">
                                            {tasks.map((t: any) => (
                                                <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-white">
                                                    <div className={`w-2 h-2 rounded-full shrink-0 ${t.status === 'CONCLUIDA' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                                    <p className="text-xs font-semibold flex-1 truncate">{t.title}</p>
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${t.status === 'CONCLUIDA' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}>{t.status}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="border shadow-sm">
                                <CardContent className="p-5">
                                    <BlockTitle icon={<Activity className="w-3.5 h-3.5" />}>Follow-ups</BlockTitle>
                                    {followUps.length === 0 ? (
                                        <EmptyState icon={<Activity className="w-7 h-7" />} text="Nenhum follow-up" />
                                    ) : (
                                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                            {followUps.map((f: any) => (
                                                <div key={f.id} className="flex gap-3 px-3 py-2.5 rounded-lg border bg-white">
                                                    <div className="shrink-0 w-9 text-center">
                                                        <p className="text-sm font-black text-primary leading-none">{format(new Date(f.date), 'dd', { locale: ptBR })}</p>
                                                        <p className="text-[9px] text-muted-foreground uppercase font-bold">{format(new Date(f.date), 'MMM', { locale: ptBR })}</p>
                                                    </div>
                                                    <Separator orientation="vertical" className="h-auto" />
                                                    <p className="text-xs text-foreground leading-relaxed">{f.note}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="border shadow-sm">
                            <CardContent className="p-5">
                                <BlockTitle icon={<TrendingUp className="w-3.5 h-3.5" />}>Pipelines</BlockTitle>
                                {pipelines.length === 0 ? (
                                    <EmptyState icon={<TrendingUp className="w-8 h-8" />} text="Nenhum pipeline" />
                                ) : (
                                    <div className="space-y-4">
                                        {pipelines.map((p: any) => {
                                            const idx = COLUNA_STEPS.indexOf(p.coluna);
                                            return (
                                                <div key={p.id} className="rounded-xl border bg-muted/20 p-4 space-y-3">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <p className="text-sm font-black">{p.objetivo}</p>
                                                            <p className="text-[10px] text-muted-foreground mt-0.5">Criado em {formatDate(p.createdAt)}</p>
                                                        </div>
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${COLUNA_BADGE[p.coluna] ?? ''}`}>
                                                            {COLUNA_LABEL[p.coluna]}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-1">
                                                        {COLUNA_STEPS.map((s, i) => (
                                                            <div key={s}>
                                                                <div className={`h-1.5 rounded-full ${i <= idx ? COLUNA_COLOR[p.coluna] : 'bg-muted'}`} />
                                                                <p className={`text-[8px] mt-1 font-bold truncate ${i <= idx ? 'text-foreground' : 'text-muted-foreground/50'}`}>{COLUNA_LABEL[s]}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {p.movimentos?.length > 0 && (
                                                        <div className="border-t pt-3 space-y-1.5">
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Histórico</p>
                                                            {[...p.movimentos].reverse().slice(0, 5).map((m: any) => (
                                                                <div key={m.id} className="flex items-center gap-2 text-[10px]">
                                                                    <span className="text-muted-foreground font-mono w-16 shrink-0">{formatDate(m.createdAt)}</span>
                                                                    <span className="text-muted-foreground">{COLUNA_LABEL[m.colunaAnterior] ?? '—'}</span>
                                                                    <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                                                                    <span className="font-bold">{COLUNA_LABEL[m.colunaAtual]}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ══ FINANCEIRO ══ */}
                <TabsContent value="financeiro" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-4">

                        {/* 40% */}
                        <div className="space-y-4">
                            <InadimplenteBadge inadimplente={customer.inadimplente} onToggle={toggleInadimplente} saving={savingInad} />

                            <Card className="border shadow-sm">
                                <CardContent className="p-5">
                                    <BlockTitle icon={<CreditCard className="w-3.5 h-3.5" />} onEdit={openFinanceiro}>Perfil Financeiro</BlockTitle>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                                        <Field label="Risco" value={customer.risco} />
                                        <Field label="Score Interno" value={customer.scoreInterno != null ? String(customer.scoreInterno) : undefined} />
                                        <Field label="Venda a Prazo" value={customer.vendaPrazo === true ? 'Sim' : customer.vendaPrazo === false ? 'Não' : undefined} />
                                        <Field label="Prazo Padrão" value={customer.prazoPagamentoPadrao != null ? `${customer.prazoPagamentoPadrao} dias` : undefined} />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border shadow-sm">
                                <CardContent className="p-5">
                                    <BlockTitle icon={<TrendingUp className="w-3.5 h-3.5" />}>Resumo de Compras</BlockTitle>
                                    <div className="divide-y">
                                        {[
                                            { label: 'Volume Total', value: formatCurrency(stats.total) },
                                            { label: 'Total de Pedidos', value: String(customerOrders.length) },
                                            { label: 'Ticket Médio', value: formatCurrency(stats.ticketMedio) },
                                            { label: 'Entregues', value: String(stats.entregues) },
                                            { label: 'Em Andamento', value: String(stats.pendentes) },
                                            { label: 'Último Pedido', value: formatDate(stats.ultimo?.createdAt) },
                                        ].map(({ label, value }) => (
                                            <div key={label} className="flex items-center justify-between py-2.5">
                                                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                                                <p className="text-sm font-black tabular-nums">{value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* 60% */}
                        <Card className="border shadow-sm">
                            <CardContent className="p-5">
                                <BlockTitle icon={<AlertTriangle className="w-3.5 h-3.5" />}>
                                    <span className="flex-1">Cobranças</span>
                                </BlockTitle>

                                <div className="flex justify-end mb-4">
                                    <Button size="sm" className="text-xs font-black uppercase h-8 gap-1.5" onClick={() => setNovaCobrancaModal(true)}>
                                        <Plus className="w-3.5 h-3.5" /> Nova Cobrança
                                    </Button>
                                </div>

                                {localCobrancas.length === 0 ? (
                                    <EmptyState icon={<CheckCircle2 className="w-7 h-7" />} text="Nenhuma cobrança registrada" />
                                ) : (
                                    <div className="space-y-2">
                                        {/* Header */}
                                        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-3 pb-2 border-b">
                                            {['Descrição', 'Vencimento', 'Valor', ''].map(h => (
                                                <p key={h} className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{h}</p>
                                            ))}
                                        </div>
                                        {localCobrancas.map(c => (
                                            <div key={c.id} className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-3 py-3 rounded-xl border ${c.status === 'ABERTA' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold truncate">{c.description}</p>
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${c.status === 'ABERTA' ? 'bg-red-100 text-red-800 border-red-300' : 'bg-green-100 text-green-800 border-green-300'}`}>
                                                        {c.status === 'ABERTA' ? 'Em Aberto' : 'Paga'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground font-mono">{formatDate(c.dueDate)}</p>
                                                <p className="text-sm font-black tabular-nums">{formatCurrency(c.amount)}</p>
                                                {c.status === 'ABERTA' ? (
                                                    <Button size="sm" variant="outline" className="text-[10px] font-black uppercase h-7 border-green-300 text-green-700 hover:bg-green-100" onClick={() => baixarCobranca(c.id)}>
                                                        <Check className="w-3 h-3 mr-1" /> Baixar
                                                    </Button>
                                                ) : (
                                                    <div className="w-16 flex items-center justify-center">
                                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* ══ MODAIS DE EDIÇÃO ══ */}
            <EditModal open={modalEmpresa} onOpenChange={setModalEmpresa} title="Editar Dados da Empresa" icon={<Building2 className="w-4 h-4" />} onSave={saveEmpresa} saving={saving}>
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><FieldInput label="Razão Social *" value={fName} onChange={setFName} /></div>
                    <FieldInput label="CNPJ / CPF" value={fCnpj} onChange={setFCnpj} />
                    <FieldInput label="Inscrição Estadual" value={fIE} onChange={setFIE} />
                    <FieldInput label="Cidade" value={fCity} onChange={setFCity} />
                    <div className="col-span-2"><FieldInput label="Endereço" value={fAddress} onChange={setFAddress} /></div>
                </div>
            </EditModal>

            <EditModal open={modalContato} onOpenChange={setModalContato} title="Editar Contato" icon={<User className="w-4 h-4" />} onSave={saveContato} saving={saving}>
                <div className="grid grid-cols-2 gap-3">
                    <FieldInput label="Telefone" value={fPhone} onChange={setFPhone} />
                    <div className="col-span-2"><FieldInput label="E-mail" value={fEmail} onChange={setFEmail} type="email" /></div>
                </div>
                <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Observações</p>
                    <Textarea className="text-xs resize-none min-h-[80px]" value={fObs} onChange={e => setFObs(e.target.value)} />
                </div>
            </EditModal>

            <EditModal open={modalComercial} onOpenChange={setModalComercial} title="Editar Dados Comerciais" icon={<TrendingUp className="w-4 h-4" />} onSave={saveComercial} saving={saving}>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Segmento</p>
                        <Select value={fSegmento} onValueChange={setFSegmento}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                            <SelectContent>
                                {['Indústria', 'Distribuição', 'Construção', 'Agronegócio', 'Comércio', 'Serviços', 'Outro'].map(s => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <FieldInput label="Tipo de Cliente" value={fTipo} onChange={setFTipo} />
                    <FieldInput label="Responsável" value={fResponsavel} onChange={setFResponsavel} />
                    <FieldInput label="Origem Lead" value={fOrigem} onChange={setFOrigem} />
                    <div className="col-span-2"><FieldInput label="Tags (separadas por vírgula)" value={fTags} onChange={setFTags} placeholder="ex: vip, atacado, sul" /></div>
                </div>
            </EditModal>

            <EditModal open={modalFinanceiro} onOpenChange={setModalFinanceiro} title="Editar Perfil Financeiro" icon={<CreditCard className="w-4 h-4" />} onSave={saveFinanceiro} saving={saving}>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Risco</p>
                        <Select value={fRisco} onValueChange={setFRisco}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                            <SelectContent>
                                {['Baixo', 'Médio', 'Alto'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Venda a Prazo</p>
                        <Select value={fVendaPrazo} onValueChange={setFVendaPrazo}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="sim">Sim</SelectItem>
                                <SelectItem value="nao">Não</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <FieldInput label="Prazo Padrão (dias)" value={fPrazo} onChange={setFPrazo} type="number" />
                    <FieldInput label="Score Interno" value={fScore} onChange={setFScore} type="number" />
                </div>
            </EditModal>

            <NovaCobrancaModal
                open={novaCobrancaModal}
                onOpenChange={setNovaCobrancaModal}
                onCreate={c => setLocalCobrancas(prev => [c, ...prev])}
            />
        </div>
    );
}