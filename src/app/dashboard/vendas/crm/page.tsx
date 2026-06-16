"use client";

import { useState, useMemo, useRef } from 'react';
import { useSystemData } from '@/server/store';
import { Customer, CrmPipeline } from '@/lib/types';
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
    open, onOpenChange, customers, onCreate, onEdit, editingPipeline
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    customers: Customer[];
    onCreate: (p: Partial<CrmPipeline>) => void;
    onEdit?: (id: string, p: Partial<CrmPipeline>) => void;
    editingPipeline?: CrmPipeline | null;
}) {
    const isEditing = !!editingPipeline;
    
    const [formData, setFormData] = useState<Partial<CrmPipeline>>({
        customerId: '',
        objetivo: '',
        canal: 'Whatsapp',
        statusCrm: 'Em andamento',
        resultado: 'Aguardando',
        proximaAcao: '',
        valorRecuperado: 0,
        observacao: '',
        nomeContato: '',
        ultimoContato: '',
    });

    // Sync when edit opens
    useMemo(() => {
        if (open) {
            if (editingPipeline) {
                setFormData({
                    customerId: editingPipeline.customerId || '',
                    objetivo: editingPipeline.objetivo || '',
                    canal: editingPipeline.canal || 'Whatsapp',
                    statusCrm: editingPipeline.statusCrm || 'Em andamento',
                    resultado: editingPipeline.resultado || 'Aguardando',
                    proximaAcao: editingPipeline.proximaAcao || '',
                    valorRecuperado: editingPipeline.valorRecuperado || 0,
                    observacao: editingPipeline.observacao || '',
                    nomeContato: editingPipeline.nomeContato || '',
                    ultimoContato: editingPipeline.ultimoContato?.substring(0, 10) || '',
                });
            } else {
                setFormData({
                    customerId: '', objetivo: '', canal: 'Whatsapp', statusCrm: 'Em andamento', 
                    resultado: 'Aguardando', proximaAcao: '', valorRecuperado: 0, 
                    observacao: '', nomeContato: '', ultimoContato: new Date().toISOString().substring(0,10)
                });
            }
        }
    }, [open, editingPipeline]);

    const handleSave = () => {
        if (!formData.customerId || !formData.objetivo?.trim()) {
            toast({ variant: 'destructive', title: 'Selecione um cliente e informe o objetivo.' });
            return;
        }

        const payload: Partial<CrmPipeline> = {
            ...formData,
            valorRecuperado: Number(formData.valorRecuperado) || 0,
            ultimoContato: formData.ultimoContato ? new Date(formData.ultimoContato).toISOString() : undefined
        };

        if (isEditing && onEdit) {
            onEdit(editingPipeline.id, payload);
        } else {
            onCreate({ ...payload, coluna: 'ENTRADA' });
        }
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogTitle>{isEditing ? 'Editar Pipeline' : 'Novo Pipeline'}</DialogTitle>
                <div className="space-y-4 pt-2">
                    {/* Básico */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Cliente *</Label>
                            <Select 
                                value={formData.customerId} 
                                onValueChange={v => setFormData({...formData, customerId: v})}
                                disabled={isEditing}
                            >
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
                            <Label>Objetivo / Negociação *</Label>
                            <Input
                                className="h-9 text-xs"
                                placeholder="Ex: contrato mensal 50m³"
                                value={formData.objetivo}
                                onChange={e => setFormData({...formData, objetivo: e.target.value})}
                            />
                        </div>
                    </div>

                    <Separator className="my-2" />

                    {/* Contato & Canal */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <Label>Nome do Contato</Label>
                            <Input
                                className="h-9 text-xs"
                                placeholder="Ex: João Silva"
                                value={formData.nomeContato || ''}
                                onChange={e => setFormData({...formData, nomeContato: e.target.value})}
                            />
                        </div>
                        <div>
                            <Label>Canal de Contato</Label>
                            <Select value={formData.canal || ''} onValueChange={v => setFormData({...formData, canal: v})}>
                                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Whatsapp">WhatsApp</SelectItem>
                                    <SelectItem value="Telefone">Telefone</SelectItem>
                                    <SelectItem value="Email">E-mail</SelectItem>
                                    <SelectItem value="Reunião">Reunião Presencial</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Data Último Contato</Label>
                            <Input
                                type="date"
                                className="h-9 text-xs"
                                value={formData.ultimoContato || ''}
                                onChange={e => setFormData({...formData, ultimoContato: e.target.value})}
                            />
                        </div>
                    </div>

                    {/* Status & Resultado */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Status do Funil</Label>
                            <Select value={formData.statusCrm || ''} onValueChange={v => setFormData({...formData, statusCrm: v})}>
                                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Em andamento">Em andamento</SelectItem>
                                    <SelectItem value="Em negociação">Em negociação</SelectItem>
                                    <SelectItem value="Venda Realizada">Venda Realizada</SelectItem>
                                    <SelectItem value="Sem interesse">Sem interesse</SelectItem>
                                    <SelectItem value="Perdido">Perdido</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Resultado / Momento</Label>
                            <Select value={formData.resultado || ''} onValueChange={v => setFormData({...formData, resultado: v})}>
                                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Aguardando">Aguardando Retorno</SelectItem>
                                    <SelectItem value="Proposta Enviada">Proposta Enviada</SelectItem>
                                    <SelectItem value="Pedido Realizado">Pedido Realizado</SelectItem>
                                    <SelectItem value="Apresentação Feita">Apresentação Feita</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Financeiro e Próxima Ação */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Próxima Ação</Label>
                            <Input
                                className="h-9 text-xs"
                                placeholder="Ex: Retornar amanhã de manhã"
                                value={formData.proximaAcao || ''}
                                onChange={e => setFormData({...formData, proximaAcao: e.target.value})}
                            />
                        </div>
                        <div>
                            <Label>Potencial / Valor Recuperado (R$)</Label>
                            <Input
                                type="number"
                                className="h-9 text-xs"
                                placeholder="0.00"
                                value={formData.valorRecuperado || ''}
                                onChange={e => setFormData({...formData, valorRecuperado: parseFloat(e.target.value) || 0})}
                            />
                        </div>
                    </div>

                    {/* Obsevação */}
                    <div>
                        <Label>Observações Log</Label>
                        <Textarea 
                            className="h-20 text-xs resize-none"
                            placeholder="Anotações do contato..."
                            value={formData.observacao || ''}
                            onChange={e => setFormData({...formData, observacao: e.target.value})}
                        />
                    </div>

                    <div className="flex gap-2 pt-2 border-t">
                        <Button variant="ghost" className="flex-1 text-xs uppercase font-bold h-9" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button className="flex-1 font-black uppercase text-xs h-9 bg-emerald-600 hover:bg-emerald-700" onClick={handleSave}>
                            {isEditing ? <Save className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />} 
                            {isEditing ? 'Salvar Edição' : 'Criar Pipeline'}
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
    pipeline, customer, coluna, onDelete, onEdit,
    onDragStart,
}: {
    pipeline: CrmPipeline;
    customer: Customer | undefined;
    coluna: typeof COLUNAS[number];
    onDelete: () => void;
    onEdit: () => void;
    onDragStart: (e: React.DragEvent) => void;
}) {
    const router = useRouter();

    const status = customer?.status || 'SEM STATUS';

    const statusColor =
        status === 'ATIVO' ? 'bg-green-100 text-green-700 border-green-300' :
            status === 'INATIVO' ? 'bg-red-100 text-red-700 border-red-300' :
                status === 'EM RISCO' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                    'bg-slate-100 text-slate-600 border-slate-300';
    
    const ultimaCompra = customer?.ultimoContato ? new Date(customer.ultimoContato).toLocaleDateString('pt-BR') : 'Sem dados';

    return (
        <div
            draggable
            onDragStart={onDragStart}
            className="group relative rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-grab active:cursor-grabbing flex flex-col gap-2"
        >
            {/* Header: Nome e Icones */}
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0" onClick={onEdit} role="button">
                    <p className="text-[11px] font-black uppercase text-slate-800 truncate hover:text-emerald-700 transition-colors">
                        {customer?.name ?? '—'}
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-1 font-bold">
                        {pipeline.objetivo}
                    </p>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={onEdit}
                        className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-slate-100"
                        title="Editar Oportunidade"
                    >
                        <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="Excluir Oportunidade"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Informações Extras CRM */}
            <div className="flex flex-col gap-1.5 mt-1">
                 <div className="flex items-center justify-between text-[9px]">
                    <span className="text-slate-500 uppercase font-bold">Última Compra/Ct:</span>
                    <span className="font-black text-slate-700">{ultimaCompra}</span>
                 </div>
                 {pipeline.proximaAcao && (
                    <div className="flex items-center justify-between text-[9px] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                        <span className="text-amber-700 uppercase font-bold">Ação:</span>
                        <span className="font-black text-amber-900 truncate max-w-[120px]">{pipeline.proximaAcao}</span>
                    </div>
                 )}
                 {pipeline.valorRecuperado ? (
                     <div className="flex items-center justify-between text-[9px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                        <span className="text-emerald-700 uppercase font-bold">Potencial:</span>
                        <span className="font-black text-emerald-900 truncate">R$ {pipeline.valorRecuperado.toLocaleString('pt-BR')}</span>
                    </div>
                 ) : null}
                 {pipeline.statusCrm && (
                     <div className="flex items-center justify-between text-[9px]">
                        <span className="text-slate-500 uppercase font-bold">Status:</span>
                        <span className="font-black text-slate-700 truncate">{pipeline.statusCrm} ({pipeline.canal || '-'})</span>
                    </div>
                 )}
            </div>

            {/* Footer linha pipeline */}
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                <Badge
                    variant="outline"
                    className={`text-[7px] font-black uppercase px-1.5 py-0 h-4 flex items-center ${statusColor}`}
                >
                    {status}
                </Badge>

                <span className={`text-[9px] font-black uppercase ${coluna.cor}`}>
                    {coluna.label}
                </span>
            </div>
        </div>
    );
}


// ─────────────────────────────────────────────
// COLUNA DO KANBAN
// ─────────────────────────────────────────────
function KanbanColuna({
    coluna, pipelines, customers, onDelete, onEdit, onDragStart, onDrop, onDragOver,
}: {
    coluna: typeof COLUNAS[number];
    pipelines: CrmPipeline[];
    customers: Customer[];
    onDelete: (pipelineId: string) => void;
    onEdit: (pipeline: CrmPipeline) => void;
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

            <div className="flex-1 p-2 space-y-2 overflow-y-auto">
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
                        onEdit={() => onEdit(p)}
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
    pipelines, customers, onMoverColuna, onDelete, onEdit, onNewPipeline,
}: {
    pipelines: CrmPipeline[];
    customers: Customer[];
    onMoverColuna: (pipelineId: string, coluna: ColunaId) => void;
    onDelete: (pipelineId: string) => void;
    onEdit: (pipeline: CrmPipeline) => void;
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
        const map: Record<ColunaId, CrmPipeline[]> = { ENTRADA: [], QUALIFICACAO: [], PROPOSTA: [], FECHADO: [] };
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
                        onEdit={onEdit}
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
// COMPONENTE RAIZ
// ─────────────────────────────────────────────
export default function CRMPage() {
    const { customers, crmPipelines, orders, addCrmPipeline, updateCrmPipeline, deleteCrmPipeline, isReady } = useSystemData();
    const [extras, setExtras] = useState<Record<string, CRMExtra>>({});
    
    const [pipelineModal, setPipelineModal] = useState(false);
    const [editingPipeline, setEditingPipeline] = useState<CrmPipeline | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    const handleCreatePipeline = async (p: Partial<CrmPipeline>) => {
        await addCrmPipeline({
            customerId: p.customerId!,
            objetivo: p.objetivo!,
            canal: p.canal,
            statusCrm: p.statusCrm,
            resultado: p.resultado,
            proximaAcao: p.proximaAcao,
            valorRecuperado: p.valorRecuperado,
            observacao: p.observacao,
            nomeContato: p.nomeContato,
            ultimoContato: p.ultimoContato,
        });
        toast({ title: 'Pipeline criado.' });
    };

    const handleEditPipeline = async (id: string, p: Partial<CrmPipeline>) => {
        await updateCrmPipeline(id, p);
        toast({ title: 'Pipeline atualizado.' });
    };

    const openCreateModal = (prefillCustomer?: string) => {
        setEditingPipeline(null);
        if (prefillCustomer) {
            // we can handle prefill by checking editingPipeline concept or passing to a prop.
            // for brevity, let's just open the modal. A more advanced way is to set a template to start with.
        }
        setPipelineModal(true);
    };

    const openEditModal = (pipeline: CrmPipeline) => {
        setEditingPipeline(pipeline);
        setPipelineModal(true);
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

    const totalProposta = crmPipelines.filter(p => p.coluna?.toUpperCase() === 'PROPOSTA').length;
    const totalFechado = crmPipelines.filter(p => p.coluna?.toUpperCase() === 'FECHADO').length;

    // RADAR DE VENDAS (> 30 dias sem comprar ou contato)
    const radarList = useMemo(() => {
        return customers.map(c => {
            const hasOpenPipeline = crmPipelines.some(p => p.customerId === c.id && p.coluna !== 'FECHADO');
            if (hasOpenPipeline) return null; // Já está sendo trabalhado

            const cOrders = (orders || []).filter(o => o.customerId === c.id);
            cOrders.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            
            let lastDate: Date | null = null;
            if (cOrders.length > 0) lastDate = new Date(cOrders[0].createdAt);
            else if (c.ultimoContato) lastDate = new Date(c.ultimoContato);
            
            let days = -1;
            if (lastDate) days = differenceInDays(new Date(), lastDate);

            // Consideramos inativo se nunca comprou (days === -1), 
            // ou se comprou/contatou há >= 30 dias.
            if (days >= 30 || days === -1) {
                return {
                    customer: c,
                    days: days,
                    lastDate: lastDate
                };
            }
            return null;
        }).filter(Boolean) as { customer: Customer, days: number, lastDate: Date | null }[];
    }, [customers, crmPipelines, orders]);

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

            {/* RADAR DE VENDAS (> 30 DIAS INATIVO) */}
            {radarList.length > 0 && (
                <div className="space-y-4 bg-white p-4 pt-3 rounded-xl border border-amber-200/50 shadow-sm">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        <h2 className="text-sm font-black uppercase text-slate-800 tracking-tight">Radar de Recuperação</h2>
                        <Badge variant="outline" className="text-[10px] font-bold bg-amber-50 text-amber-700 border-amber-200 ml-auto">
                            {radarList.length} clientes na mira (&gt;30 dias sem compras)
                        </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {radarList.map((item) => (
                            <div key={item.customer.id} className="border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors p-3 rounded-lg flex flex-col justify-between gap-3 relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-amber-400" />
                                <div className="pl-1">
                                    <p className="text-[11px] font-black uppercase text-slate-800 line-clamp-1" title={item.customer.name}>
                                        {item.customer.name}
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-500 mt-0.5">
                                        {item.days === -1 ? 'Nunca fechou ou Lead Novo' : `Inativo há ${item.days} dias`}
                                    </p>
                                </div>
                                <Button 
                                    size="sm"
                                    className="w-full text-[10px] h-7 uppercase font-black bg-white text-amber-700 border border-amber-200 hover:bg-amber-500 hover:text-white transition-colors opacity-90 group-hover:opacity-100"
                                    onClick={() => {
                                        setEditingPipeline({
                                            customerId: item.customer.id,
                                            objetivo: 'Recuperação de Venda',
                                            canal: 'Whatsapp',
                                            statusCrm: 'Em andamento',
                                            resultado: 'Aguardando',
                                            proximaAcao: 'Entrar em contato hoje',
                                            valorRecuperado: 0,
                                            observacao: `Cliente inativo há ${item.days > 0 ? item.days + ' dias' : 'tempo indeterminado'}.`,
                                        } as any);
                                        setPipelineModal(true);
                                    }}
                                >
                                    Iniciar Negociação
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total de Pipelines', value: crmPipelines.length, icon: Users, color: 'text-primary' },
                    { label: 'Em Entrada', value: crmPipelines.filter(p => p.coluna?.toUpperCase() === 'ENTRADA').length, icon: Plus, color: 'text-blue-600' },
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

            <div className="mt-4">
                <CRMKanban
                    pipelines={crmPipelines}
                    customers={customers}
                    onMoverColuna={handleMoverColuna}
                    onDelete={id => setDeleteTarget(id)}
                    onEdit={openEditModal}
                    onNewPipeline={openCreateModal}
                />
            </div>

            <PipelineModal
                open={pipelineModal}
                onOpenChange={setPipelineModal}
                customers={customers}
                onCreate={handleCreatePipeline}
                onEdit={handleEditPipeline}
                editingPipeline={editingPipeline}
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