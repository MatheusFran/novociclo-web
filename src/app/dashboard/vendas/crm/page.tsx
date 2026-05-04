"use client";

import { useState, useMemo, useRef } from 'react';
import { useSystemData } from '@/server/store';
import { Customer } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
    Plus, Search, Trash2, Edit3, AlertTriangle,
    TrendingUp, Users, Building2, UserCheck,
    Save, Loader2, BarChart3,
    CheckCircle2, XCircle,
    Eye,
} from 'lucide-react';
import { addDays, differenceInDays } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';
import { useRouter } from 'next/navigation';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────
type ColunaId = 'ENTRADA' | 'QUALIFICACAO' | 'PROPOSTA' | 'FECHADO';

interface CRMExtra {
    segmento: string;
    responsavel: string;
    contatoPrincipal: string;
    cargo: string;
    uf: string;
    dataInicio: string;
    cicloCompra: number;
    ultimoPedido: string;
    ticketMedio: number;
    observacoes: string;
    statusCRM: 'Ativo' | 'Em Risco' | 'Inativo' | 'Entrada';
}

const EMPTY_EXTRA: CRMExtra = {
    segmento: '', responsavel: '', contatoPrincipal: '', cargo: '', uf: '',
    dataInicio: '', cicloCompra: 35, ultimoPedido: '', ticketMedio: 0,
    observacoes: '', statusCRM: 'Entrada',
};

interface Pipeline {
    id: string;
    customerId: string;
    objetivo: string;
    coluna: ColunaId;
}


// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function calcProxContato(ultimoPedido: string, ciclo: number): Date | null {
    if (!ultimoPedido) return null;
    return addDays(new Date(ultimoPedido), ciclo);
}

function calcDiasRestantes(proxContato: Date | null): number | null {
    if (!proxContato) return null;
    return differenceInDays(proxContato, new Date());
}

function Label({ children }: { children: React.ReactNode }) {
    return <p className="text-[8px] font-black uppercase text-muted-foreground mb-1">{children}</p>;
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 pb-2 border-b">
                {icon} {title}
            </p>
            {children}
        </div>
    );
}


// ─────────────────────────────────────────────
// COLUNAS
// ─────────────────────────────────────────────
const COLUNAS: { id: ColunaId; label: string; cor: string; corBg: string; corBorda: string; icon: React.ReactNode; desc: string }[] = [
    {
        id: 'ENTRADA',
        label: 'Entrada',
        cor: 'text-blue-700',
        corBg: 'bg-blue-50',
        corBorda: 'border-blue-300',
        icon: <Plus className="w-3.5 h-3.5" />,
        desc: 'Lead, cliente ativo ou reativação',
    },
    {
        id: 'QUALIFICACAO',
        label: 'Qualificação',
        cor: 'text-yellow-700',
        corBg: 'bg-yellow-50',
        corBorda: 'border-yellow-300',
        icon: <Search className="w-3.5 h-3.5" />,
        desc: 'Diagnóstico e necessidade',
    },
    {
        id: 'PROPOSTA',
        label: 'Proposta',
        cor: 'text-purple-700',
        corBg: 'bg-purple-50',
        corBorda: 'border-purple-300',
        icon: <TrendingUp className="w-3.5 h-3.5" />,
        desc: 'Proposta e negociação',
    },
    {
        id: 'FECHADO',
        label: 'Fechado',
        cor: 'text-green-700',
        corBg: 'bg-green-50',
        corBorda: 'border-green-300',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        desc: 'Ganho ou perdido',
    },
];


// ─────────────────────────────────────────────
// MODAL PIPELINE
// ─────────────────────────────────────────────
function PipelineModal({
    open, onOpenChange, customers, onCreate,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    customers: Customer[];
    onCreate: (p: Pipeline) => void;
}) {
    const [customerId, setCustomerId] = useState('');
    const [objetivo, setObjetivo] = useState('');

    const handleCreate = () => {
        if (!customerId || !objetivo.trim()) {
            toast({ variant: 'destructive', title: 'Selecione um cliente e informe o objetivo.' });
            return;
        }
        onCreate({
            id: crypto.randomUUID(),
            customerId,
            objetivo: objetivo.trim(),
            coluna: 'ENTRADA',
        });
        setCustomerId('');
        setObjetivo('');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle>Novo Pipeline</DialogTitle>
                <div className="space-y-3 pt-2">
                    <div>
                        <Label>Cliente</Label>
                        <Select value={customerId} onValueChange={setCustomerId}>
                            <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Selecionar cliente..." />
                            </SelectTrigger>
                            <SelectContent>
                                {customers.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Objetivo</Label>
                        <Input
                            className="h-9 text-xs"
                            placeholder="Ex: contrato mensal 50m³"
                            value={objetivo}
                            onChange={e => setObjetivo(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 pt-1">
                        <Button variant="ghost" className="flex-1 text-xs uppercase font-bold h-9" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button className="flex-1 font-black uppercase text-xs h-9" onClick={handleCreate}>
                            <Plus className="w-4 h-4 mr-1" /> Criar Pipeline
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}


// ─────────────────────────────────────────────
// CARD DO PIPELINE (kanban)
// ─────────────────────────────────────────────
function PipelineCard({
    pipeline, customer, coluna, onDelete,
    onDragStart,
}: {
    pipeline: Pipeline;
    customer: Customer | undefined;
    coluna: typeof COLUNAS[number];
    onDelete: () => void;
    onDragStart: (e: React.DragEvent) => void;
}) {
    const router = useRouter();

    const status = customer?.status || 'SEM STATUS';

    const statusColor =
        status === 'ATIVO' ? 'bg-green-100 text-green-700 border-green-300' :
            status === 'INATIVO' ? 'bg-red-100 text-red-700 border-red-300' :
                status === 'EM RISCO' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                    'bg-slate-100 text-slate-600 border-slate-300';

    return (
        <div
            draggable
            onDragStart={onDragStart}
            className="group relative rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-xs font-black uppercase text-slate-800 truncate">
                        {customer?.name ?? '—'}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                        {pipeline.objetivo}
                    </p>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                        onClick={() => router.push(`/dashboard/vendas/clientes/${customer?.id}`)}
                        className="p-1 rounded hover:bg-slate-100"
                    >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                    </button>

                    <button
                        onClick={onDelete}
                        className="p-1 rounded hover:bg-red-50"
                    >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                </div>
            </div>

            {/* Info */}
            <div className="mt-3 flex items-center justify-between gap-2">
                {/* Cidade */}
                <span className="text-[9px] text-muted-foreground uppercase font-bold truncate">
                    {customer?.city || '—'}
                </span>

                {/* Status cliente */}
                <Badge
                    variant="outline"
                    className={`text-[8px] font-black uppercase px-2 h-5 flex items-center ${statusColor}`}
                >
                    {status}
                </Badge>
            </div>

            {/* Footer linha pipeline */}
            <div className="mt-3 pt-2 border-t flex items-center justify-between">
                <span className={`text-[9px] font-black uppercase ${coluna.cor}`}>
                    {coluna.label}
                </span>

                <span className="text-[8px] text-muted-foreground font-bold">
                    CRM
                </span>
            </div>
        </div>
    );
}


// ─────────────────────────────────────────────
// COLUNA DO KANBAN
// ─────────────────────────────────────────────
function KanbanColuna({
    coluna, pipelines, customers, onDelete, onDragStart, onDrop, onDragOver,
}: {
    coluna: typeof COLUNAS[number];
    pipelines: Pipeline[];
    customers: Customer[];
    onDelete: (pipelineId: string) => void;
    onDragStart: (e: React.DragEvent, pipelineId: string) => void;
    onDrop: (e: React.DragEvent, colunaId: ColunaId) => void;
    onDragOver: (e: React.DragEvent) => void;
}) {
    const [isDragOver, setIsDragOver] = useState(false);

    return (
        <div
            className={`flex flex-col rounded-2xl border-2 transition-colors min-h-[500px] ${isDragOver ? `${coluna.corBorda} ${coluna.corBg}` : 'border-slate-200 bg-slate-50/50'}`}
            onDragOver={e => { e.preventDefault(); onDragOver(e); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={e => { setIsDragOver(false); onDrop(e, coluna.id); }}
        >
            <div className={`px-4 py-3 border-b ${isDragOver ? coluna.corBorda : 'border-slate-200'}`}>
                <div className="flex items-center gap-2">
                    <span className={coluna.cor}>{coluna.icon}</span>
                    <div>
                        <p className={`text-[11px] font-black uppercase ${coluna.cor}`}>{coluna.label}</p>
                        <p className="text-[9px] text-muted-foreground">{coluna.desc}</p>
                    </div>
                    <Badge className={`ml-auto text-[9px] font-black h-5 px-2 ${coluna.corBg} ${coluna.cor} border ${coluna.corBorda}`}>
                        {(pipelines ?? []).length}
                    </Badge>
                </div>
            </div>

            <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                {pipelines.length === 0 && (
                    <div className="flex items-center justify-center h-32 text-[10px] text-muted-foreground uppercase font-bold opacity-40">
                        Nenhum pipeline
                    </div>
                )}
                {pipelines.map(p => (
                    <PipelineCard
                        key={p.id}
                        pipeline={p}
                        customer={customers.find(c => c.id === p.customerId)}
                        coluna={coluna}
                        onDelete={() => onDelete(p.id)}
                        onDragStart={e => onDragStart(e, p.id)}
                    />
                ))}
            </div>
        </div>
    );
}


// ─────────────────────────────────────────────
// ABA CRM — KANBAN
// ─────────────────────────────────────────────
function CRMKanban({
    pipelines, customers, onMoverColuna, onDelete, onNewPipeline,
}: {
    pipelines: Pipeline[];
    customers: Customer[];
    onMoverColuna: (pipelineId: string, coluna: ColunaId) => void;
    onDelete: (pipelineId: string) => void;
    onNewPipeline: () => void;
}) {
    const [search, setSearch] = useState('');
    const dragId = useRef<string | null>(null);

    const filtered = useMemo(() => {
        if (!search) return pipelines;
        const s = search.toLowerCase();
        return pipelines.filter(p => {
            const c = customers.find(c => c.id === p.customerId);
            return (
                c?.name.toLowerCase().includes(s) ||
                (c?.city ?? '').toLowerCase().includes(s) ||
                p.objetivo.toLowerCase().includes(s)
            );
        });
    }, [pipelines, customers, search]);

    const porColuna = useMemo(() => {
        const map: Record<ColunaId, Pipeline[]> = { ENTRADA: [], QUALIFICACAO: [], PROPOSTA: [], FECHADO: [] };
        filtered.forEach(p => { map[p.coluna].push(p); });
        return map;
    }, [filtered]);

    const handleDragStart = (e: React.DragEvent, pipelineId: string) => {
        dragId.current = pipelineId;
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = (e: React.DragEvent, colunaId: ColunaId) => {
        e.preventDefault();
        if (dragId.current) {
            onMoverColuna(dragId.current, colunaId);
            dragId.current = null;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="PESQUISAR EMPRESA, CIDADE, OBJETIVO..."
                        className="pl-10 h-10 text-xs font-bold uppercase"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <Button size="sm" className="gap-2 font-black uppercase text-[10px] h-10 shadow" onClick={onNewPipeline}>
                    <Plus className="w-4 h-4" /> Novo Pipeline
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {COLUNAS.map(col => (
                    <KanbanColuna
                        key={col.id}
                        coluna={col}
                        pipelines={porColuna[col.id]}
                        customers={customers}
                        onDelete={onDelete}
                        onDragStart={handleDragStart}
                        onDrop={handleDrop}
                        onDragOver={e => e.preventDefault()}
                    />
                ))}
            </div>
        </div>
    );
}


// ─────────────────────────────────────────────
// ABA RELATÓRIOS
// ─────────────────────────────────────────────
function RelatoriosTab({ pipelines, customers, extras }: {
    pipelines: Pipeline[];
    customers: Customer[];
    extras: Record<string, CRMExtra>;
}) {
    const porColuna = COLUNAS.map(c => ({
        name: c.label,
        value: pipelines.filter(p => p.coluna === c.id).length,
        fill: c.id === 'ENTRADA' ? '#3b82f6' : c.id === 'QUALIFICACAO' ? '#f59e0b' : c.id === 'PROPOSTA' ? '#a855f7' : '#10b981',
    })).filter(d => d.value > 0);

    const porSegmento = pipelines.reduce((acc: Record<string, number>, p) => {
        const s = extras[p.customerId]?.segmento || 'Sem Segmento';
        acc[s] = (acc[s] ?? 0) + 1;
        return acc;
    }, {});
    const segmentosChart = Object.entries(porSegmento).map(([name, value]) => ({ name, value }));

    const ticketTotal = pipelines.reduce((acc, p) => acc + (extras[p.customerId]?.ticketMedio ?? 0), 0);
    const ticketMedio = pipelines.length > 0 ? ticketTotal / pipelines.length : 0;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total de Pipelines', value: pipelines.length, color: 'text-primary' },
                    { label: 'Em Entrada', value: pipelines.filter(p => p.coluna === 'ENTRADA').length, color: 'text-blue-600' },
                    { label: 'Em Proposta', value: pipelines.filter(p => p.coluna === 'PROPOSTA').length, color: 'text-purple-600' },
                    { label: 'Ticket Médio', value: `R$ ${ticketMedio.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, color: 'text-green-600' },
                ].map(({ label, value, color }) => (
                    <Card key={label} className="border shadow-sm">
                        <CardContent className="p-4">
                            <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">{label}</p>
                            <p className={`text-2xl font-black ${color}`}>{value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border shadow-sm">
                    <CardContent className="p-6">
                        <p className="text-sm font-black uppercase text-muted-foreground mb-4">Pipelines por Coluna</p>
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={porColuna} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" label={e => `${e.name}: ${e.value}`}>
                                    {porColuna.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                </Pie>
                                <RechartsTooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border shadow-sm">
                    <CardContent className="p-6">
                        <p className="text-sm font-black uppercase text-muted-foreground mb-4">Pipelines por Segmento</p>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={segmentosChart} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" tick={{ fontSize: 11 }} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                                <RechartsTooltip />
                                <Bar dataKey="value" fill="#3b82f6" name="Pipelines" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


// ─────────────────────────────────────────────
// COMPONENTE RAIZ
// ─────────────────────────────────────────────
export default function CRMPage() {
    const { customers, crmPipelines, addCrmPipeline, updateCrmPipeline, deleteCrmPipeline, isReady } = useSystemData();
    const [extras, setExtras] = useState<Record<string, CRMExtra>>({});
    const [pipelineModal, setPipelineModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    const handleCreatePipeline = async (p: Pipeline) => {
        await addCrmPipeline({
            customerId: p.customerId,
            objetivo: p.objetivo,
        });
        toast({ title: 'Pipeline criado.' });
    };

    const handleMoverColuna = async (pipelineId: string, coluna: ColunaId) => {
        await updateCrmPipeline(pipelineId, { coluna: coluna.toUpperCase() });
    };

    const handleDeletePipeline = async () => {
        if (!deleteTarget) return;
        await deleteCrmPipeline(deleteTarget);
        toast({ title: 'Pipeline removido.' });
        setDeleteTarget(null);
    };

    const totalProposta = crmPipelines.filter(p => p.coluna === 'proposta').length;
    const totalFechado = crmPipelines.filter(p => p.coluna === 'fechado').length;

    if (!isReady) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-black text-primary uppercase tracking-tight">CRM B2B</h1>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Gestão de Relacionamento e Recorrência</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total de Pipelines', value: crmPipelines.length, icon: Users, color: 'text-primary' },
                    { label: 'Em Entrada', value: crmPipelines.filter(p => p.coluna === 'entrada').length, icon: Plus, color: 'text-blue-600' },
                    { label: 'Em Proposta', value: totalProposta, icon: TrendingUp, color: 'text-purple-500' },
                    { label: 'Fechados', value: totalFechado, icon: CheckCircle2, color: 'text-green-500' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <Card key={label} className="border shadow-sm">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-muted/50">
                                <Icon className={`w-5 h-5 ${color}`} />
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase text-muted-foreground">{label}</p>
                                <p className={`text-xl font-black ${color}`}>{value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Tabs defaultValue="crm" className="w-full">
                <TabsList className="grid w-full max-w-xs grid-cols-2">
                    <TabsTrigger value="crm" className="gap-2 font-bold text-xs uppercase">
                        <Users className="w-3.5 h-3.5" /> CRM
                    </TabsTrigger>
                    <TabsTrigger value="relatorios" className="gap-2 font-bold text-xs uppercase">
                        <BarChart3 className="w-3.5 h-3.5" /> Relatórios
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="crm" className="mt-4">
                    <CRMKanban
                        pipelines={crmPipelines}
                        customers={customers}
                        onMoverColuna={handleMoverColuna}
                        onDelete={id => setDeleteTarget(id)}
                        onNewPipeline={() => setPipelineModal(true)}
                    />
                </TabsContent>

                <TabsContent value="relatorios" className="mt-4">
                    <RelatoriosTab pipelines={crmPipelines} customers={customers} extras={extras} />
                </TabsContent>
            </Tabs>

            <PipelineModal
                open={pipelineModal}
                onOpenChange={setPipelineModal}
                customers={customers}
                onCreate={handleCreatePipeline}
            />

            <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Pipeline</AlertDialogTitle>
                        <AlertDialogDescription>
                            Deseja excluir este pipeline? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeletePipeline}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}