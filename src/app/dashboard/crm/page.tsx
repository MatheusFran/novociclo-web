"use client";

import { useState, useMemo } from 'react';
import { useSystemData } from '@/server/store';
import { Customer } from '@/lib/types';
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
} from '@/components/ui/alert-dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
    Plus, Search, Trash2, Edit3, MapPin, AlertTriangle,
    TrendingUp, Users, Activity, Target, RefreshCw, Building2, UserCheck,
    CalendarClock, FileDown, Save, Loader2, Phone,
} from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';


// ─────────────────────────────────────────────
// TIPOS LOCAIS
// Pipeline e Atividades ficam em estado local —
// não há tabela no schema atual para esses dados.
// ─────────────────────────────────────────────
type PipelineEtapa = 'Prospecção' | 'Qualificação' | 'Proposta Enviada' | 'Negociação' | 'Fechado Ganho' | 'Fechado Perdido';
type AtividadeTipo = 'Ligação' | 'Reunião' | 'E-mail' | 'Visita' | 'WhatsApp';
type AtividadeStatus = 'Agendado' | 'Realizado' | 'Cancelado';

interface Oportunidade {
    id: string;
    clienteId: string;
    empresa: string;
    descricao: string;
    etapa: PipelineEtapa;
    probabilidade: number;
    valorEstimado: number;
    responsavel: string;
    dataAbertura: string;
    previsaoFechamento: string;
    acaoProxima: string;
    dataProximaAcao: string;
    observacoes: string;
}

interface Atividade {
    id: string;
    clienteId: string;
    empresa: string;
    tipo: AtividadeTipo;
    responsavel: string;
    dataPrevista: string;
    dataRealizada: string;
    status: AtividadeStatus;
    duracao: number;
    resultado: string;
    proximoPasso: string;
    observacoes: string;
}

// Campos extras de CRM que não existem no schema Customer.
// Armazenados localmente indexados por customer.id.
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
    statusCRM: 'Ativo' | 'Em Risco' | 'Inativo' | 'Novo';
}

const EMPTY_EXTRA: CRMExtra = {
    segmento: '', responsavel: '', contatoPrincipal: '', cargo: '', uf: '',
    dataInicio: '', cicloCompra: 30, ultimoPedido: '', ticketMedio: 0,
    observacoes: '', statusCRM: 'Ativo',
};

const EMPTY_OPO: Omit<Oportunidade, 'id'> = {
    clienteId: '', empresa: '', descricao: '', etapa: 'Prospecção', probabilidade: 50,
    valorEstimado: 0, responsavel: '', dataAbertura: '', previsaoFechamento: '',
    acaoProxima: '', dataProximaAcao: '', observacoes: '',
};

const EMPTY_ATV: Omit<Atividade, 'id'> = {
    clienteId: '', empresa: '', tipo: 'Ligação', responsavel: '', dataPrevista: '',
    dataRealizada: '', status: 'Agendado', duracao: 30, resultado: '',
    proximoPasso: '', observacoes: '',
};


// ─────────────────────────────────────────────
// MAPAS
// ─────────────────────────────────────────────
const PIPELINE_ETAPAS: PipelineEtapa[] = [
    'Prospecção', 'Qualificação', 'Proposta Enviada', 'Negociação', 'Fechado Ganho', 'Fechado Perdido',
];

const ETAPA_COLOR: Record<PipelineEtapa, string> = {
    'Prospecção': 'bg-zinc-100 text-zinc-700',
    'Qualificação': 'bg-blue-100 text-blue-700',
    'Proposta Enviada': 'bg-indigo-100 text-indigo-700',
    'Negociação': 'bg-orange-100 text-orange-700',
    'Fechado Ganho': 'bg-green-100 text-green-700',
    'Fechado Perdido': 'bg-red-100 text-red-700',
};

const ATIVIDADE_STATUS_COLOR: Record<AtividadeStatus, string> = {
    Agendado: 'bg-blue-100 text-blue-700',
    Realizado: 'bg-green-100 text-green-700',
    Cancelado: 'bg-red-100 text-red-700',
};

const STATUS_CRM_COLOR: Record<string, string> = {
    Ativo: 'bg-green-100 text-green-800 border-green-200',
    'Em Risco': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Inativo: 'bg-red-100 text-red-800 border-red-200',
    Novo: 'bg-blue-100 text-blue-800 border-blue-200',
};

const STATUS_REC_COLOR: Record<string, string> = {
    'MUITO ATRASADO': 'bg-red-100 text-red-700',
    'ATRASADO': 'bg-orange-100 text-orange-700',
    'URGENTE': 'bg-yellow-100 text-yellow-700',
    'NO PRAZO': 'bg-green-100 text-green-700',
    'Sem dado': 'bg-gray-100 text-gray-500',
};


// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function calcProxContato(ultimoPedido: string, ciclo: number) {
    if (!ultimoPedido) return null;
    return addDays(new Date(ultimoPedido), ciclo);
}

function calcDiasRestantes(proxContato: Date | null) {
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
// MODAL CLIENTE
// Campos da API (Customer): name, cpfcnpj, IE, phone, email, address, city
// Campos CRM extras (local): segmento, responsavel, contatoPrincipal, cargo,
//   uf, dataInicio, cicloCompra, ultimoPedido, ticketMedio, observacoes, statusCRM
// ─────────────────────────────────────────────
function ClienteModal({
    open, onOpenChange, editingCustomer, editingExtra, onSave,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    editingCustomer: Customer | null;
    editingExtra: CRMExtra;
    onSave: (apiData: Omit<Customer, 'id'>, extra: CRMExtra, customerId?: string) => Promise<void>;
}) {
    const [loading, setLoading] = useState(false);

    const [name, setName] = useState(editingCustomer?.name ?? '');
    const [cpfcnpj, setCpfcnpj] = useState(editingCustomer?.cpfcnpj ?? '');
    const [ie, setIe] = useState(editingCustomer?.IE ?? '');
    const [phone, setPhone] = useState(editingCustomer?.phone ?? '');
    const [email, setEmail] = useState(editingCustomer?.email ?? '');
    const [address, setAddress] = useState(editingCustomer?.address ?? '');
    const [city, setCity] = useState(editingCustomer?.city ?? '');
    const [extra, setExtra] = useState<CRMExtra>({ ...editingExtra });
    const setE = (k: keyof CRMExtra, v: any) => setExtra(prev => ({ ...prev, [k]: v }));

    const handleSave = async () => {
        if (!name.trim()) {
            toast({ variant: 'destructive', title: 'Nome / Razão Social é obrigatório.' });
            return;
        }
        setLoading(true);
        try {
            await onSave(
                {
                    name: name.trim(),
                    cpfcnpj: cpfcnpj || null,
                    IE: ie || null,
                    phone: phone || null,
                    email: email || null,
                    address: address || null,
                    city: city || null,
                },
                extra,
                editingCustomer?.id,
            );
            onOpenChange(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
                <DialogTitle className="sr-only">{editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
                <div className="sticky top-0 z-10 bg-primary px-6 py-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/50">
                        {editingCustomer ? editingCustomer.id : 'Novo Registro'}
                    </p>
                    <h2 className="text-lg font-black uppercase text-white">
                        {editingCustomer ? 'Editar Cliente' : 'Cadastrar Cliente'}
                    </h2>
                </div>

                <div className="px-6 py-6 space-y-5">
                    <Section title="Dados da Empresa" icon={<Building2 className="w-3 h-3" />}>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <Label>Razão Social *</Label>
                                <Input className="h-9 text-xs" value={name} onChange={e => setName(e.target.value)} disabled={loading} />
                            </div>
                            <div>
                                <Label>CNPJ</Label>
                                <Input className="h-9 text-xs" placeholder="00.000.000/0001-00" value={cpfcnpj ?? ''} onChange={e => setCpfcnpj(e.target.value)} disabled={loading} />
                            </div>
                            <div>
                                <Label>Inscrição Estadual</Label>
                                <Input className="h-9 text-xs" value={ie ?? ''} onChange={e => setIe(e.target.value)} disabled={loading} />
                            </div>
                            <div>
                                <Label>Segmento</Label>
                                <Select value={extra.segmento} onValueChange={v => setE('segmento', v)} disabled={loading}>
                                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                                    <SelectContent>
                                        {['Indústria', 'Distribuição', 'Construção', 'Agronegócio', 'Comércio', 'Serviços', 'Outro'].map(s => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Status CRM</Label>
                                <Select value={extra.statusCRM} onValueChange={v => setE('statusCRM', v)} disabled={loading}>
                                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {['Ativo', 'Em Risco', 'Inativo', 'Novo'].map(s => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Cidade</Label>
                                <Input className="h-9 text-xs" value={city ?? ''} onChange={e => setCity(e.target.value)} disabled={loading} />
                            </div>
                            <div>
                                <Label>UF</Label>
                                <Input className="h-9 text-xs" value={extra.uf} onChange={e => setE('uf', e.target.value)} maxLength={2} disabled={loading} />
                            </div>
                            <div className="col-span-2">
                                <Label>Endereço</Label>
                                <Input className="h-9 text-xs" value={address ?? ''} onChange={e => setAddress(e.target.value)} disabled={loading} />
                            </div>
                        </div>
                    </Section>

                    <Separator />

                    <Section title="Contato Principal" icon={<UserCheck className="w-3 h-3" />}>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Nome do Contato</Label>
                                <Input className="h-9 text-xs" value={extra.contatoPrincipal} onChange={e => setE('contatoPrincipal', e.target.value)} disabled={loading} />
                            </div>
                            <div>
                                <Label>Cargo</Label>
                                <Input className="h-9 text-xs" value={extra.cargo} onChange={e => setE('cargo', e.target.value)} disabled={loading} />
                            </div>
                            <div>
                                <Label>E-mail</Label>
                                <Input className="h-9 text-xs" type="email" value={email ?? ''} onChange={e => setEmail(e.target.value)} disabled={loading} />
                            </div>
                            <div>
                                <Label>Telefone</Label>
                                <Input className="h-9 text-xs" value={phone ?? ''} onChange={e => setPhone(e.target.value)} disabled={loading} />
                            </div>
                        </div>
                    </Section>

                    <Separator />

                    <Section title="Dados Comerciais" icon={<TrendingUp className="w-3 h-3" />}>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Responsável Interno</Label>
                                <Input className="h-9 text-xs" value={extra.responsavel} onChange={e => setE('responsavel', e.target.value)} disabled={loading} />
                            </div>
                            <div>
                                <Label>Data Início</Label>
                                <Input className="h-9 text-xs" type="date" value={extra.dataInicio} onChange={e => setE('dataInicio', e.target.value)} disabled={loading} />
                            </div>
                            <div>
                                <Label>Ciclo de Compra (dias)</Label>
                                <Input className="h-9 text-xs" type="number" value={extra.cicloCompra} onChange={e => setE('cicloCompra', parseInt(e.target.value) || 30)} disabled={loading} />
                            </div>
                            <div>
                                <Label>Ticket Médio (R$)</Label>
                                <Input className="h-9 text-xs" type="number" value={extra.ticketMedio} onChange={e => setE('ticketMedio', parseFloat(e.target.value) || 0)} disabled={loading} />
                            </div>
                            <div className="col-span-2">
                                <Label>Último Pedido</Label>
                                <Input className="h-9 text-xs" type="date" value={extra.ultimoPedido} onChange={e => setE('ultimoPedido', e.target.value)} disabled={loading} />
                            </div>
                        </div>
                        <div>
                            <Label>Observações</Label>
                            <Textarea className="text-xs resize-none min-h-[70px]" value={extra.observacoes} onChange={e => setE('observacoes', e.target.value)} disabled={loading} />
                        </div>
                    </Section>
                </div>

                <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 text-xs uppercase font-bold h-9" disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} className="flex-1 font-black uppercase text-xs h-9" disabled={loading}>
                        {loading
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <><Save className="w-4 h-4 mr-1" />{editingCustomer ? 'Salvar Alterações' : 'Cadastrar Cliente'}</>
                        }
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}


// ─────────────────────────────────────────────
// MODAL OPORTUNIDADE
// ─────────────────────────────────────────────
function OportunidadeModal({
    open, onOpenChange, editing, customers, onSave,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    editing: Oportunidade | null;
    customers: Customer[];
    onSave: (data: Omit<Oportunidade, 'id'>, id?: string) => void;
}) {
    const [form, setForm] = useState<Omit<Oportunidade, 'id'>>(editing ? { ...editing } : { ...EMPTY_OPO });
    const set = (k: keyof Omit<Oportunidade, 'id'>, v: any) => setForm(f => ({ ...f, [k]: v }));

    const handleSelectCliente = (clienteId: string) => {
        const c = customers.find(c => c.id === clienteId);
        setForm(f => ({ ...f, clienteId, empresa: c?.name || '' }));
    };

    const handleSave = () => {
        if (!form.clienteId || !form.descricao) {
            toast({ variant: 'destructive', title: 'Cliente e descrição são obrigatórios.' });
            return;
        }
        onSave(form, editing?.id);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0 gap-0">
                <DialogTitle className="sr-only">{editing ? 'Editar Oportunidade' : 'Nova Oportunidade'}</DialogTitle>
                <div className="sticky top-0 z-10 bg-primary px-6 py-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/50">{editing ? editing.id : 'Nova'}</p>
                    <h2 className="text-lg font-black uppercase text-white">{editing ? 'Editar Oportunidade' : 'Nova Oportunidade'}</h2>
                </div>

                <div className="px-6 py-6 space-y-4">
                    <div>
                        <Label>Cliente *</Label>
                        <Select value={form.clienteId} onValueChange={handleSelectCliente}>
                            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecionar cliente..." /></SelectTrigger>
                            <SelectContent>
                                {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Descrição *</Label>
                        <Input className="h-9 text-xs" value={form.descricao} onChange={e => set('descricao', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Etapa</Label>
                            <Select value={form.etapa} onValueChange={v => set('etapa', v as PipelineEtapa)}>
                                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {PIPELINE_ETAPAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Probabilidade (%)</Label>
                            <Input className="h-9 text-xs" type="number" min={0} max={100} value={form.probabilidade} onChange={e => set('probabilidade', parseInt(e.target.value) || 0)} />
                        </div>
                        <div>
                            <Label>Valor Estimado (R$)</Label>
                            <Input className="h-9 text-xs" type="number" value={form.valorEstimado} onChange={e => set('valorEstimado', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                            <Label>Responsável</Label>
                            <Input className="h-9 text-xs" value={form.responsavel} onChange={e => set('responsavel', e.target.value)} />
                        </div>
                        <div>
                            <Label>Data Abertura</Label>
                            <Input className="h-9 text-xs" type="date" value={form.dataAbertura} onChange={e => set('dataAbertura', e.target.value)} />
                        </div>
                        <div>
                            <Label>Previsão Fechamento</Label>
                            <Input className="h-9 text-xs" type="date" value={form.previsaoFechamento} onChange={e => set('previsaoFechamento', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <Label>Ação Próxima</Label>
                        <Input className="h-9 text-xs" value={form.acaoProxima} onChange={e => set('acaoProxima', e.target.value)} />
                    </div>
                    <div>
                        <Label>Data da Próxima Ação</Label>
                        <Input className="h-9 text-xs" type="date" value={form.dataProximaAcao} onChange={e => set('dataProximaAcao', e.target.value)} />
                    </div>
                    <div>
                        <Label>Observações</Label>
                        <Textarea className="text-xs resize-none min-h-[60px]" value={form.observacoes} onChange={e => set('observacoes', e.target.value)} />
                    </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 text-xs uppercase font-bold h-9">Cancelar</Button>
                    <Button onClick={handleSave} className="flex-1 font-black uppercase text-xs h-9">
                        <Save className="w-4 h-4 mr-1" />Salvar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}


// ─────────────────────────────────────────────
// MODAL ATIVIDADE
// ─────────────────────────────────────────────
function AtividadeModal({
    open, onOpenChange, editing, customers, onSave,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    editing: Atividade | null;
    customers: Customer[];
    onSave: (data: Omit<Atividade, 'id'>, id?: string) => void;
}) {
    const [form, setForm] = useState<Omit<Atividade, 'id'>>(editing ? { ...editing } : { ...EMPTY_ATV });
    const set = (k: keyof Omit<Atividade, 'id'>, v: any) => setForm(f => ({ ...f, [k]: v }));

    const handleSelectCliente = (clienteId: string) => {
        const c = customers.find(c => c.id === clienteId);
        setForm(f => ({ ...f, clienteId, empresa: c?.name || '' }));
    };

    const handleSave = () => {
        if (!form.clienteId || !form.dataPrevista) {
            toast({ variant: 'destructive', title: 'Cliente e data são obrigatórios.' });
            return;
        }
        onSave(form, editing?.id);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0">
                <DialogTitle className="sr-only">{editing ? 'Editar Atividade' : 'Nova Atividade'}</DialogTitle>
                <div className="sticky top-0 z-10 bg-primary px-6 py-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/50">{editing ? editing.id : 'Nova'}</p>
                    <h2 className="text-lg font-black uppercase text-white">{editing ? 'Editar Atividade' : 'Registrar Atividade'}</h2>
                </div>

                <div className="px-6 py-6 space-y-4">
                    <div>
                        <Label>Cliente *</Label>
                        <Select value={form.clienteId} onValueChange={handleSelectCliente}>
                            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecionar cliente..." /></SelectTrigger>
                            <SelectContent>
                                {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Tipo</Label>
                            <Select value={form.tipo} onValueChange={v => set('tipo', v as AtividadeTipo)}>
                                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {(['Ligação', 'Reunião', 'E-mail', 'Visita', 'WhatsApp'] as AtividadeTipo[]).map(t => (
                                        <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Status</Label>
                            <Select value={form.status} onValueChange={v => set('status', v as AtividadeStatus)}>
                                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {(['Agendado', 'Realizado', 'Cancelado'] as AtividadeStatus[]).map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Responsável</Label>
                            <Input className="h-9 text-xs" value={form.responsavel} onChange={e => set('responsavel', e.target.value)} />
                        </div>
                        <div>
                            <Label>Duração (min)</Label>
                            <Input className="h-9 text-xs" type="number" value={form.duracao} onChange={e => set('duracao', parseInt(e.target.value) || 0)} />
                        </div>
                        <div>
                            <Label>Data Prevista *</Label>
                            <Input className="h-9 text-xs" type="date" value={form.dataPrevista} onChange={e => set('dataPrevista', e.target.value)} />
                        </div>
                        <div>
                            <Label>Data Realizada</Label>
                            <Input className="h-9 text-xs" type="date" value={form.dataRealizada} onChange={e => set('dataRealizada', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <Label>Resultado</Label>
                        <Input className="h-9 text-xs" value={form.resultado} onChange={e => set('resultado', e.target.value)} />
                    </div>
                    <div>
                        <Label>Próximo Passo</Label>
                        <Input className="h-9 text-xs" value={form.proximoPasso} onChange={e => set('proximoPasso', e.target.value)} />
                    </div>
                    <div>
                        <Label>Observações</Label>
                        <Textarea className="text-xs resize-none min-h-[60px]" value={form.observacoes} onChange={e => set('observacoes', e.target.value)} />
                    </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 text-xs uppercase font-bold h-9">Cancelar</Button>
                    <Button onClick={handleSave} className="flex-1 font-black uppercase text-xs h-9">
                        <Save className="w-4 h-4 mr-1" />Salvar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}


// ─────────────────────────────────────────────
// ABA CLIENTES
// ─────────────────────────────────────────────
function ClientesTab({ customers, extras, loading, onNew, onEdit, onDelete }: {
    customers: Customer[];
    extras: Record<string, CRMExtra>;
    loading: boolean;
    onNew: () => void;
    onEdit: (c: Customer) => void;
    onDelete: (c: Customer) => void;
}) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const filtered = useMemo(() => customers.filter(c => {
        const matchSearch = !search ||
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            (c.city ?? '').toLowerCase().includes(search.toLowerCase()) ||
            (extras[c.id]?.responsavel ?? '').toLowerCase().includes(search.toLowerCase());
        const st = extras[c.id]?.statusCRM ?? 'Ativo';
        return matchSearch && (statusFilter === 'ALL' || st === statusFilter);
    }), [customers, extras, search, statusFilter]);

    const handleExport = () => {
        const ws = XLSX.utils.json_to_sheet(filtered.map(c => {
            const ex = extras[c.id] ?? EMPTY_EXTRA;
            return {
                Nome: c.name, CNPJ: c.cpfcnpj, Segmento: ex.segmento, Responsavel: ex.responsavel,
                Contato: ex.contatoPrincipal, Cargo: ex.cargo, Email: c.email, Telefone: c.phone,
                Cidade: c.city, UF: ex.uf, Status: ex.statusCRM, 'Ciclo (dias)': ex.cicloCompra,
                'Ticket Médio': ex.ticketMedio, 'Último Pedido': ex.ultimoPedido,
            };
        }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Clientes CRM');
        XLSX.writeFile(wb, 'CRM_Clientes.xlsx');
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="PESQUISAR EMPRESA, CIDADE, RESPONSÁVEL..."
                        className="pl-10 h-10 text-xs font-bold uppercase"
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-10 text-xs w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todos</SelectItem>
                        {['Ativo', 'Em Risco', 'Novo', 'Inativo'].map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="gap-2 font-bold uppercase text-[10px] h-10" onClick={handleExport}>
                    <FileDown className="w-3.5 h-3.5" /> Exportar
                </Button>
                <Button size="sm" className="gap-2 font-black uppercase text-[10px] h-10 shadow" onClick={onNew} disabled={loading}>
                    <Plus className="w-4 h-4" /> Novo Cliente
                </Button>
            </div>

            <Card className="border-none shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow className="h-10">
                                {['Empresa', 'Segmento', 'Responsável', 'Contato', 'Cidade', 'Ciclo', 'Próx. Contato', 'Ticket Médio', 'Status', 'Ações'].map(h => (
                                    <TableHead key={h} className="text-[9px] font-black uppercase">{h}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center py-16 text-muted-foreground text-xs uppercase opacity-30">
                                        {loading ? 'Carregando...' : 'Nenhum cliente encontrado'}
                                    </TableCell>
                                </TableRow>
                            )}
                            {filtered.map(c => {
                                const ex = extras[c.id] ?? EMPTY_EXTRA;
                                const proxContato = calcProxContato(ex.ultimoPedido, ex.cicloCompra);
                                const diasRestantes = calcDiasRestantes(proxContato);
                                return (
                                    <TableRow key={c.id} className="hover:bg-muted/20 h-14">
                                        <TableCell>
                                            <p className="text-[11px] font-black uppercase text-slate-700">{c.name}</p>
                                            <p className="text-[9px] font-mono text-muted-foreground">{c.cpfcnpj || '---'}</p>
                                        </TableCell>
                                        <TableCell className="text-[10px] font-bold text-slate-500">{ex.segmento || '---'}</TableCell>
                                        <TableCell className="text-[10px] font-bold text-slate-600">{ex.responsavel || '---'}</TableCell>
                                        <TableCell>
                                            <p className="text-[10px] font-bold">{ex.contatoPrincipal || '---'}</p>
                                            <p className="text-[9px] text-muted-foreground">{c.phone || ''}</p>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                                                <span className="text-[10px] font-bold">{c.city || '---'}{ex.uf ? ` - ${ex.uf}` : ''}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center text-[10px] font-black">{ex.cicloCompra}d</TableCell>
                                        <TableCell className="text-center">
                                            {proxContato && diasRestantes !== null ? (
                                                <span className={`text-[10px] font-black ${diasRestantes < 0 ? 'text-red-600' : diasRestantes <= 7 ? 'text-orange-600' : 'text-green-600'}`}>
                                                    {diasRestantes < 0 ? `${Math.abs(diasRestantes)}d atraso` : `${diasRestantes}d`}
                                                </span>
                                            ) : '---'}
                                        </TableCell>
                                        <TableCell className="text-right text-[11px] font-black">
                                            R$ {ex.ticketMedio.toLocaleString('pt-BR')}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`${STATUS_CRM_COLOR[ex.statusCRM]} text-[8px] font-black uppercase px-2 h-5`}>
                                                {ex.statusCRM}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-4">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => onEdit(c)}>
                                                    <Edit3 className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => onDelete(c)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}


// ─────────────────────────────────────────────
// ABA PIPELINE
// ─────────────────────────────────────────────
function PipelineTab({ oportunidades, customers, onNew, onEdit, onDelete }: {
    oportunidades: Oportunidade[];
    customers: Customer[];
    onNew: () => void;
    onEdit: (o: Oportunidade) => void;
    onDelete: (id: string) => void;
}) {
    const [search, setSearch] = useState('');
    const [etapaFilter, setEtapaFilter] = useState('ALL');

    const filtered = useMemo(() => oportunidades.filter(o => {
        const matchSearch = !search ||
            o.empresa.toLowerCase().includes(search.toLowerCase()) ||
            o.descricao.toLowerCase().includes(search.toLowerCase());
        return matchSearch && (etapaFilter === 'ALL' || o.etapa === etapaFilter);
    }), [oportunidades, search, etapaFilter]);

    const totalPipeline = filtered.reduce((acc, o) => acc + o.valorEstimado, 0);
    const totalPonderado = filtered.reduce((acc, o) => acc + (o.valorEstimado * o.probabilidade / 100), 0);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Pipeline Total', value: `R$ ${totalPipeline.toLocaleString('pt-BR')}` },
                    { label: 'Valor Ponderado', value: `R$ ${Math.round(totalPonderado).toLocaleString('pt-BR')}` },
                    { label: 'Oportunidades', value: `${filtered.length}` },
                ].map(({ label, value }) => (
                    <Card key={label} className="border shadow-sm">
                        <CardContent className="p-4">
                            <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">{label}</p>
                            <p className="text-xl font-black text-primary">{value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="PESQUISAR EMPRESA OU OPORTUNIDADE..."
                        className="pl-10 h-10 text-xs font-bold uppercase"
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={etapaFilter} onValueChange={setEtapaFilter}>
                    <SelectTrigger className="h-10 text-xs w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todas as Etapas</SelectItem>
                        {PIPELINE_ETAPAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Button size="sm" className="gap-2 font-black uppercase text-[10px] h-10 shadow" onClick={onNew}>
                    <Plus className="w-4 h-4" /> Nova Oportunidade
                </Button>
            </div>

            <Card className="border-none shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow className="h-10">
                                {['Empresa', 'Descrição', 'Etapa', 'Prob.', 'Valor Est.', 'Responsável', 'Prev. Fechamento', 'Próxima Ação', 'Ações'].map(h => (
                                    <TableHead key={h} className="text-[9px] font-black uppercase">{h}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-16 text-muted-foreground text-xs uppercase opacity-30">
                                        Nenhuma oportunidade
                                    </TableCell>
                                </TableRow>
                            )}
                            {filtered.map(o => (
                                <TableRow key={o.id} className="hover:bg-muted/20 h-14">
                                    <TableCell>
                                        <p className="text-[11px] font-black uppercase text-slate-700">{o.empresa}</p>
                                        <p className="text-[9px] font-mono text-muted-foreground">{o.id}</p>
                                    </TableCell>
                                    <TableCell className="text-[10px] font-bold max-w-[140px] truncate">{o.descricao}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`${ETAPA_COLOR[o.etapa]} text-[8px] font-black uppercase px-2 h-5`}>
                                            {o.etapa}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center gap-1 min-w-[60px]">
                                            <div className="flex-1 bg-muted rounded-full h-1.5">
                                                <div className="bg-primary h-1.5 rounded-full" style={{ width: `${o.probabilidade}%` }} />
                                            </div>
                                            <span className="text-[9px] font-black w-6">{o.probabilidade}%</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right text-[11px] font-black">
                                        R$ {o.valorEstimado.toLocaleString('pt-BR')}
                                    </TableCell>
                                    <TableCell className="text-[10px] font-bold">{o.responsavel}</TableCell>
                                    <TableCell className="text-center text-[10px]">
                                        {o.previsaoFechamento ? format(new Date(o.previsaoFechamento), 'dd/MM/yy') : '---'}
                                    </TableCell>
                                    <TableCell className="text-[10px] max-w-[120px]">
                                        <p className="font-bold truncate">{o.acaoProxima || '---'}</p>
                                        {o.dataProximaAcao && (
                                            <p className="text-[9px] text-muted-foreground">{format(new Date(o.dataProximaAcao), 'dd/MM/yy')}</p>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right pr-4">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => onEdit(o)}>
                                                <Edit3 className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => onDelete(o.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}


// ─────────────────────────────────────────────
// ABA ATIVIDADES
// ─────────────────────────────────────────────
function AtividadesTab({ atividades, onNew, onEdit, onDelete }: {
    atividades: Atividade[];
    onNew: () => void;
    onEdit: (a: Atividade) => void;
    onDelete: (id: string) => void;
}) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const filtered = useMemo(() => atividades.filter(a => {
        const matchSearch = !search ||
            a.empresa.toLowerCase().includes(search.toLowerCase()) ||
            a.responsavel.toLowerCase().includes(search.toLowerCase());
        return matchSearch && (statusFilter === 'ALL' || a.status === statusFilter);
    }), [atividades, search, statusFilter]);

    const agendados = atividades.filter(a => a.status === 'Agendado').length;

    return (
        <div className="space-y-4">
            {agendados > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-3">
                    <CalendarClock className="w-4 h-4 text-blue-600 shrink-0" />
                    <p className="text-xs font-bold text-blue-700">
                        {agendados} atividade{agendados > 1 ? 's' : ''} agendada{agendados > 1 ? 's' : ''} pendente{agendados > 1 ? 's' : ''}
                    </p>
                </div>
            )}

            <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="PESQUISAR EMPRESA OU RESPONSÁVEL..."
                        className="pl-10 h-10 text-xs font-bold uppercase"
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-10 text-xs w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todos</SelectItem>
                        {(['Agendado', 'Realizado', 'Cancelado'] as AtividadeStatus[]).map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button size="sm" className="gap-2 font-black uppercase text-[10px] h-10 shadow" onClick={onNew}>
                    <Plus className="w-4 h-4" /> Registrar Atividade
                </Button>
            </div>

            <Card className="border-none shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow className="h-10">
                                {['Empresa', 'Tipo', 'Responsável', 'Data Prevista', 'Data Realizada', 'Duração', 'Status', 'Resultado', 'Próximo Passo', 'Ações'].map(h => (
                                    <TableHead key={h} className="text-[9px] font-black uppercase">{h}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center py-16 text-muted-foreground text-xs uppercase opacity-30">
                                        Nenhuma atividade
                                    </TableCell>
                                </TableRow>
                            )}
                            {filtered.map(a => (
                                <TableRow key={a.id} className="hover:bg-muted/20 h-14">
                                    <TableCell>
                                        <p className="text-[11px] font-black uppercase text-slate-700">{a.empresa}</p>
                                        <p className="text-[9px] font-mono text-muted-foreground">{a.id}</p>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-[8px] font-black uppercase px-2 h-5 bg-slate-100 text-slate-700">
                                            {a.tipo}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-[10px] font-bold">{a.responsavel}</TableCell>
                                    <TableCell className="text-center text-[10px]">
                                        {a.dataPrevista ? format(new Date(a.dataPrevista), 'dd/MM/yy') : '---'}
                                    </TableCell>
                                    <TableCell className="text-center text-[10px]">
                                        {a.dataRealizada ? format(new Date(a.dataRealizada), 'dd/MM/yy') : <span className="text-muted-foreground">---</span>}
                                    </TableCell>
                                    <TableCell className="text-center text-[10px] font-bold">
                                        {a.duracao > 0 ? `${a.duracao}min` : '---'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`${ATIVIDADE_STATUS_COLOR[a.status]} text-[8px] font-black uppercase px-2 h-5`}>
                                            {a.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-[10px] max-w-[120px] truncate">{a.resultado || '---'}</TableCell>
                                    <TableCell className="text-[10px] max-w-[120px] truncate font-bold">{a.proximoPasso || '---'}</TableCell>
                                    <TableCell className="text-right pr-4">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => onEdit(a)}>
                                                <Edit3 className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => onDelete(a.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}


// ─────────────────────────────────────────────
// ABA RECORRÊNCIA
// ─────────────────────────────────────────────
function RecorrenciaTab({ customers, extras }: { customers: Customer[]; extras: Record<string, CRMExtra> }) {
    const recorrencia = useMemo(() => customers.map(c => {
        const ex = extras[c.id] ?? EMPTY_EXTRA;
        const proxPedido = calcProxContato(ex.ultimoPedido, ex.cicloCompra);
        const diasRestantes = calcDiasRestantes(proxPedido);
        let statusRec: string;
        if (diasRestantes === null) statusRec = 'Sem dado';
        else if (diasRestantes < -7) statusRec = 'MUITO ATRASADO';
        else if (diasRestantes < 0) statusRec = 'ATRASADO';
        else if (diasRestantes <= 7) statusRec = 'URGENTE';
        else statusRec = 'NO PRAZO';
        return { customer: c, extra: ex, proxPedido, diasRestantes, statusRec };
    }).sort((a, b) => (a.diasRestantes ?? 999) - (b.diasRestantes ?? 999)), [customers, extras]);

    const contagens = {
        muitoAtrasado: recorrencia.filter(r => r.statusRec === 'MUITO ATRASADO').length,
        atrasado: recorrencia.filter(r => r.statusRec === 'ATRASADO').length,
        urgente: recorrencia.filter(r => r.statusRec === 'URGENTE').length,
        noPrazo: recorrencia.filter(r => r.statusRec === 'NO PRAZO').length,
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: 'Muito Atrasados', value: contagens.muitoAtrasado, color: 'text-red-600' },
                    { label: 'Atrasados', value: contagens.atrasado, color: 'text-orange-600' },
                    { label: 'Urgente (≤7d)', value: contagens.urgente, color: 'text-yellow-600' },
                    { label: 'No Prazo', value: contagens.noPrazo, color: 'text-green-600' },
                ].map(({ label, value, color }) => (
                    <Card key={label} className="border shadow-sm">
                        <CardContent className="p-4">
                            <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">{label}</p>
                            <p className={`text-2xl font-black ${color}`}>{value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="border-none shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow className="h-10">
                                {['Cliente', 'Responsável', 'Ciclo', 'Último Pedido', 'Próx. Pedido', 'Dias Restantes', 'Ticket Médio', 'Status', 'Ação'].map(h => (
                                    <TableHead key={h} className="text-[9px] font-black uppercase">{h}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recorrencia.map(({ customer: c, extra: ex, proxPedido, diasRestantes, statusRec }) => (
                                <TableRow key={c.id} className="hover:bg-muted/20 h-14">
                                    <TableCell>
                                        <p className="text-[11px] font-black uppercase text-slate-700">{c.name}</p>
                                        <p className="text-[9px] text-muted-foreground">{c.city || '---'}{ex.uf ? ` - ${ex.uf}` : ''}</p>
                                    </TableCell>
                                    <TableCell className="text-[10px] font-bold">{ex.responsavel || '---'}</TableCell>
                                    <TableCell className="text-center text-[10px] font-black">{ex.cicloCompra}d</TableCell>
                                    <TableCell className="text-center text-[10px]">
                                        {ex.ultimoPedido ? format(new Date(ex.ultimoPedido), 'dd/MM/yy') : '---'}
                                    </TableCell>
                                    <TableCell className="text-center text-[10px]">
                                        {proxPedido ? format(proxPedido, 'dd/MM/yy') : '---'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {diasRestantes !== null ? (
                                            <span className={`text-[11px] font-black ${diasRestantes < 0 ? 'text-red-600' : diasRestantes <= 7 ? 'text-orange-600' : 'text-green-600'}`}>
                                                {diasRestantes < 0 ? `-${Math.abs(diasRestantes)}d` : `+${diasRestantes}d`}
                                            </span>
                                        ) : '---'}
                                    </TableCell>
                                    <TableCell className="text-right text-[10px] font-black">
                                        R$ {ex.ticketMedio.toLocaleString('pt-BR')}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`${STATUS_REC_COLOR[statusRec]} text-[8px] font-black uppercase px-2 h-5`}>
                                            {statusRec}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="sm" className="h-7 text-[9px] font-black uppercase text-primary gap-1">
                                            <Phone className="w-3 h-3" /> Contatar
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}


// ─────────────────────────────────────────────
// COMPONENTE RAIZ
// ─────────────────────────────────────────────
export default function CRMPage() {
    const { customers, addCustomer, updateCustomer, deleteCustomer, isReady } = useSystemData();

    // Campos extras de CRM não existentes no schema — estado local indexado por customer.id
    const [extras, setExtras] = useState<Record<string, CRMExtra>>({});

    // Pipeline e Atividades — estado local (sem tabela no schema)
    const [oportunidades, setOportunidades] = useState<Oportunidade[]>([]);
    const [atividades, setAtividades] = useState<Atividade[]>([]);

    // Modais
    const [clienteModal, setClienteModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
    const [opoModal, setOpoModal] = useState(false);
    const [editingOpo, setEditingOpo] = useState<Oportunidade | null>(null);
    const [atvModal, setAtvModal] = useState(false);
    const [editingAtv, setEditingAtv] = useState<Atividade | null>(null);

    // KPIs
    const totalAtivos = customers.filter(c => (extras[c.id]?.statusCRM ?? 'Ativo') === 'Ativo').length;
    const emRisco = customers.filter(c => extras[c.id]?.statusCRM === 'Em Risco').length;
    const totalPipeline = oportunidades.reduce((acc, o) => acc + o.valorEstimado, 0);
    const atividadesPendentes = atividades.filter(a => a.status === 'Agendado').length;

    // ── Handlers Clientes ──
    const handleSaveCliente = async (
        apiData: Omit<Customer, 'id'>,
        extra: CRMExtra,
        customerId?: string,
    ) => {
        if (customerId) {
            await updateCustomer(customerId, apiData);
            setExtras(prev => ({ ...prev, [customerId]: extra }));
            toast({ title: 'Cliente atualizado.' });
        } else {
            // addCustomer deve retornar o registro criado com id
            const created = await addCustomer(apiData) as Customer;
            if (created?.id) {
                setExtras(prev => ({ ...prev, [created.id]: extra }));
            }
            toast({ title: 'Cliente cadastrado.' });
        }
        setEditingCustomer(null);
    };

    const handleDeleteCliente = async () => {
        if (!deleteTarget) return;
        await deleteCustomer(deleteTarget.id);
        setExtras(prev => {
            const next = { ...prev };
            delete next[deleteTarget.id];
            return next;
        });
        toast({ title: 'Cliente removido.' });
        setDeleteTarget(null);
    };

    // ── Handlers Oportunidades ──
    const handleSaveOpo = (data: Omit<Oportunidade, 'id'>, id?: string) => {
        if (id) {
            setOportunidades(os => os.map(o => o.id === id ? { ...o, ...data } : o));
            toast({ title: 'Oportunidade atualizada.' });
        } else {
            const newId = `OPO${String(oportunidades.length + 1).padStart(3, '0')}`;
            setOportunidades(os => [...os, { id: newId, ...data }]);
            toast({ title: 'Oportunidade registrada.' });
        }
        setEditingOpo(null);
    };

    // ── Handlers Atividades ──
    const handleSaveAtv = (data: Omit<Atividade, 'id'>, id?: string) => {
        if (id) {
            setAtividades(as => as.map(a => a.id === id ? { ...a, ...data } : a));
            toast({ title: 'Atividade atualizada.' });
        } else {
            const newId = `ATV${String(atividades.length + 1).padStart(3, '0')}`;
            setAtividades(as => [...as, { id: newId, ...data }]);
            toast({ title: 'Atividade registrada.' });
        }
        setEditingAtv(null);
    };

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

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Clientes Ativos', value: totalAtivos, icon: Users, color: 'text-green-600' },
                    { label: 'Em Risco', value: emRisco, icon: AlertTriangle, color: 'text-yellow-600' },
                    { label: 'Pipeline Total', value: `R$ ${totalPipeline.toLocaleString('pt-BR')}`, icon: Target, color: 'text-primary' },
                    { label: 'Atividades Pendentes', value: atividadesPendentes, icon: CalendarClock, color: 'text-blue-600' },
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

            {/* Tabs */}
            <Tabs defaultValue="clientes" className="w-full">
                <TabsList className="grid w-full max-w-lg grid-cols-4">
                    <TabsTrigger value="clientes" className="gap-2 font-bold text-xs uppercase">
                        <Users className="w-3.5 h-3.5" /> Clientes
                    </TabsTrigger>
                    <TabsTrigger value="pipeline" className="gap-2 font-bold text-xs uppercase">
                        <Target className="w-3.5 h-3.5" /> Pipeline
                    </TabsTrigger>
                    <TabsTrigger value="atividades" className="gap-2 font-bold text-xs uppercase">
                        <Activity className="w-3.5 h-3.5" /> Atividades
                        {atividadesPendentes > 0 && (
                            <Badge className="bg-primary text-white text-[8px] h-4 px-1.5 ml-1">{atividadesPendentes}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="recorrencia" className="gap-2 font-bold text-xs uppercase">
                        <RefreshCw className="w-3.5 h-3.5" /> Recorrência
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="clientes" className="mt-4">
                    <ClientesTab
                        customers={customers}
                        extras={extras}
                        loading={!isReady}
                        onNew={() => { setEditingCustomer(null); setClienteModal(true); }}
                        onEdit={c => { setEditingCustomer(c); setClienteModal(true); }}
                        onDelete={c => setDeleteTarget(c)}
                    />
                </TabsContent>

                <TabsContent value="pipeline" className="mt-4">
                    <PipelineTab
                        oportunidades={oportunidades}
                        customers={customers}
                        onNew={() => { setEditingOpo(null); setOpoModal(true); }}
                        onEdit={o => { setEditingOpo(o); setOpoModal(true); }}
                        onDelete={id => setOportunidades(os => os.filter(o => o.id !== id))}
                    />
                </TabsContent>

                <TabsContent value="atividades" className="mt-4">
                    <AtividadesTab
                        atividades={atividades}
                        onNew={() => { setEditingAtv(null); setAtvModal(true); }}
                        onEdit={a => { setEditingAtv(a); setAtvModal(true); }}
                        onDelete={id => setAtividades(as => as.filter(a => a.id !== id))}
                    />
                </TabsContent>

                <TabsContent value="recorrencia" className="mt-4">
                    <RecorrenciaTab customers={customers} extras={extras} />
                </TabsContent>
            </Tabs>

            {/* Modal Cliente — montado condicionalmente para resetar estado interno */}
            {clienteModal && (
                <ClienteModal
                    open={clienteModal}
                    onOpenChange={v => { setClienteModal(v); if (!v) setEditingCustomer(null); }}
                    editingCustomer={editingCustomer}
                    editingExtra={editingCustomer ? (extras[editingCustomer.id] ?? EMPTY_EXTRA) : EMPTY_EXTRA}
                    onSave={handleSaveCliente}
                />
            )}

            {opoModal && (
                <OportunidadeModal
                    open={opoModal}
                    onOpenChange={v => { setOpoModal(v); if (!v) setEditingOpo(null); }}
                    editing={editingOpo}
                    customers={customers}
                    onSave={handleSaveOpo}
                />
            )}

            {atvModal && (
                <AtividadeModal
                    open={atvModal}
                    onOpenChange={v => { setAtvModal(v); if (!v) setEditingAtv(null); }}
                    editing={editingAtv}
                    customers={customers}
                    onSave={handleSaveAtv}
                />
            )}

            <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Cliente</AlertDialogTitle>
                        <AlertDialogDescription>
                            Deseja excluir <strong>{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteCliente}>
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}