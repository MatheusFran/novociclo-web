"use client";

import { useState } from 'react';
import { useSystemData } from '@/server/store';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Customer } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { Plus, Trash2, Edit, Save, Download, Eye } from 'lucide-react';
import { OrderTable } from '@/components/shared';
import { useRouter } from 'next/navigation';


const emptyCustomer = {
    name: '',
    cpfcnpj: '',
    IE: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    status: 'ATIVO',
};


export default function ConfiguracoesPage() {
    const { customers, addCustomer, updateCustomer, deleteCustomer, } = useSystemData();

    const [loading, setLoading] = useState(false);
    const router = useRouter();


    // Clientes
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [customerData, setCustomerData] = useState<Omit<Customer, 'id'>>(emptyCustomer);


    // Delete confirm
    const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null);



    // ─── Clientes ───────────────────────────────────────────────
    const [importPreview, setImportPreview] = useState<any[]>([]);

    const handleImportCustomers = async () => {
        setLoading(true);
        let success = 0;
        let errors = 0;

        try {
            for (const row of importPreview) {
                try {
                    await addCustomer({
                        name: String(row.name).trim(),
                        cpfcnpj: row.cpfcnpj ? String(row.cpfcnpj).trim() : null,
                        IE: row.IE ? String(row.IE).trim() : null,
                        phone: row.phone ? String(row.phone).trim() : null,
                        email: row.email ? String(row.email).trim() : null,
                        address: row.address ? String(row.address).trim() : null,
                        city: row.city ? String(row.city).trim() : null,
                    });
                    success++;
                } catch {
                    errors++;
                }
            }

            toast({ title: `${success} importado(s)${errors > 0 ? `, ${errors} erro(s)` : ''}` });
            setImportPreview([]);
            setIsCustomerModalOpen(false);
        } finally {
            setLoading(false);
        }
    };
    const handleOpenCustomerModal = (c: Customer | null) => {
        setEditingCustomer(c);
        setImportPreview([]); // <- adicionar
        setCustomerData(c ? {
            name: c.name,
            cpfcnpj: c.cpfcnpj ?? '',
            IE: c.IE ?? '',
            phone: c.phone ?? '',
            email: c.email ?? '',
            address: c.address ?? '',
            city: c.city ?? '',
            status: c.status ?? '',
        } : emptyCustomer);
        setIsCustomerModalOpen(true);
    };

    const handleSaveCustomer = async () => {
        if (!customerData.name) { toast({ variant: "destructive", title: "Nome é obrigatório" }); return; }
        setLoading(true);
        try {
            if (editingCustomer) {
                await updateCustomer(editingCustomer.id, { ...customerData });
            } else {
                await addCustomer({ ...customerData });
            }
            toast({ title: "Cliente salvo." });
            setIsCustomerModalOpen(false);
        } catch (error) {
            toast({ variant: "destructive", title: "Erro ao salvar cliente", description: (error as Error)?.message });
        } finally {
            setLoading(false);
        }
    };


    // ─── Delete ─────────────────────────────────────────────────
    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        setLoading(true);
        try {
            switch (deleteTarget.type) {
                case 'customer': await deleteCustomer(deleteTarget.id); break;
            }
            toast({ title: "Registro excluído com sucesso." });
        } catch (error) {
            const err = error as any;

            // Verificar se é erro de dependência (status 409)
            if (err?.status === 409 || err?.payload?.reason) {
                const reason = err?.payload?.reason || 'Este registro está relacionado com outros dados do sistema';

                toast({
                    variant: "destructive",
                    title: "Não é possível deletar",
                    description: reason
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Erro ao excluir",
                    description: (error as Error)?.message || "Verifique se este registro está sendo usado em outras partes do sistema"
                });
            }
        } finally {
            setDeleteTarget(null);
            setLoading(false);
        }
    };

    const confirmDelete = (type: string, id: string, name: string) => setDeleteTarget({ type, id, name });






    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-black text-primary uppercase tracking-tight">
                        Gestão de Clientes
                    </h1>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        Cadastros e parâmetros operacionais de clientes
                    </p>
                </div>

                <Button
                    size="sm"
                    className="gap-2 font-black uppercase text-xs"
                    onClick={() => handleOpenCustomerModal(null)}
                    disabled={loading}
                >
                    <Plus className="w-4 h-4" /> Novo Cliente
                </Button>
            </div>



            <OrderTable
                orders={customers as any}
                showSearch
                columns={[
                    {
                        key: 'name',
                        header: 'Nome / Razão Social',
                        render: c => (
                            <span className="text-[11px] font-black uppercase text-slate-700 max-w-[180px] truncate block">
                                {c.customerName}
                            </span>
                        ),
                    },
                    {
                        key: 'cpfcnpj',
                        header: 'CPF / CNPJ',
                        render: c => (
                            <span className="text-[10px] font-mono font-bold">
                                {c.customerCpfCnpj || '---'}
                            </span>
                        ),
                    },
                    {
                        key: 'city',
                        header: 'Cidade',
                        render: c => (
                            <span className="text-[10px] font-black text-slate-700 uppercase">
                                {c.city || '---'}
                            </span>
                        ),
                    },
                    {
                        key: 'phone',
                        header: 'Telefone',
                        render: c => (
                            <span className="text-[10px] text-muted-foreground">
                                {c.customerPhone || '---'}
                            </span>
                        ),
                    },
                    {
                        key: 'status',
                        header: 'Status',
                        align: 'center',
                        render: c => (
                            <Badge
                                variant="outline"
                                className="text-[8px] font-black uppercase px-2 h-5 flex items-center justify-center"
                            >
                                {c.status}
                            </Badge>
                        ),
                    },
                ]}
                actions={[
                    {
                        label: 'Visualizar',
                        icon: <Eye className="w-3.5 h-3.5" />,
                        variant: 'ghost',
                        className: 'text-blue-600',
                        onClick: c => router.push(`/dashboard/vendas/clientes/${c.id}`),
                    },
                    {
                        label: 'Editar',
                        icon: <Edit className="w-3.5 h-3.5" />,
                        variant: 'ghost',
                        className: 'text-blue-600',
                        onClick: c => handleOpenCustomerModal(c as unknown as Customer),
                    },
                    {
                        label: 'Excluir',
                        icon: <Trash2 className="w-3.5 h-3.5" />,
                        variant: 'ghost',
                        className: 'text-red-500 hover:bg-red-50',
                        onClick: c => confirmDelete('customer', c.id, c.customerName),
                    },
                ]}
                emptyMessage="Nenhum cliente encontrado"
            />




            {/* MODAL CLIENTE */}
            <Dialog open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="font-black uppercase">{editingCustomer ? 'Editar' : 'Novo'} Cliente</DialogTitle>
                    </DialogHeader>

                    <Tabs defaultValue="manual">
                        <TabsList className="w-full">
                            <TabsTrigger value="manual" className="flex-1 text-xs font-black uppercase">Manual</TabsTrigger>
                            {!editingCustomer && (
                                <TabsTrigger value="importar" className="flex-1 text-xs font-black uppercase">Importar Planilha</TabsTrigger>
                            )}
                        </TabsList>

                        <TabsContent value="manual">
                            <div className="py-4 space-y-4">

                                {/* ───────── EMPRESA ───────── */}
                                <div className="space-y-3">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground">Empresa</p>

                                    <Input
                                        placeholder="Nome / Razão Social *"
                                        value={customerData.name}
                                        onChange={e => setCustomerData({ ...customerData, name: e.target.value })}
                                        className="h-9 text-xs"
                                        disabled={loading}
                                    />

                                    <div className="grid grid-cols-2 gap-3">
                                        <Input
                                            placeholder="CPF / CNPJ"
                                            value={customerData.cpfcnpj || ''}
                                            onChange={e => setCustomerData({ ...customerData, cpfcnpj: e.target.value })}
                                            className="h-9 text-xs"
                                            disabled={loading}
                                        />
                                        <Input
                                            placeholder="Inscrição Estadual"
                                            value={customerData.IE || ''}
                                            onChange={e => setCustomerData({ ...customerData, IE: e.target.value })}
                                            className="h-9 text-xs"
                                            disabled={loading}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <Input
                                            placeholder="Cidade"
                                            value={customerData.city || ''}
                                            onChange={e => setCustomerData({ ...customerData, city: e.target.value })}
                                            className="h-9 text-xs"
                                            disabled={loading}
                                        />
                                        <Input
                                            placeholder="Status (Ativo/Inativo)"
                                            value={customerData.status || ''}
                                            onChange={e => setCustomerData({ ...customerData, status: e.target.value })}
                                            className="h-9 text-xs"
                                            disabled={loading}
                                        />
                                    </div>

                                    <Input
                                        placeholder="Endereço"
                                        value={customerData.address || ''}
                                        onChange={e => setCustomerData({ ...customerData, address: e.target.value })}
                                        className="h-9 text-xs"
                                        disabled={loading}
                                    />
                                </div>

                                {/* ───────── CONTATO ───────── */}
                                <div className="space-y-3">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground">Contato</p>

                                    <div className="grid grid-cols-2 gap-3">
                                        <Input
                                            placeholder="Telefone"
                                            value={customerData.phone || ''}
                                            onChange={e => setCustomerData({ ...customerData, phone: e.target.value })}
                                            className="h-9 text-xs"
                                            disabled={loading}
                                        />
                                        <Input
                                            placeholder="E-mail"
                                            value={customerData.email || ''}
                                            onChange={e => setCustomerData({ ...customerData, email: e.target.value })}
                                            className="h-9 text-xs"
                                            disabled={loading}
                                        />
                                    </div>


                                </div>

                            </div>

                            <DialogFooter>
                                <Button
                                    variant="ghost"
                                    onClick={() => setIsCustomerModalOpen(false)}
                                    className="font-bold text-xs uppercase"
                                    disabled={loading}
                                >
                                    Cancelar
                                </Button>

                                <Button
                                    onClick={handleSaveCustomer}
                                    className="gap-2 font-black text-xs uppercase"
                                    disabled={loading}
                                >
                                    <Save className="w-4 h-4" /> Salvar
                                </Button>
                            </DialogFooter>
                        </TabsContent>

                        {!editingCustomer && (
                            <TabsContent value="importar">
                                <div className="py-4 space-y-4">
                                    <div className="text-[10px] text-muted-foreground space-y-1">
                                        <p className="font-black uppercase">Colunas esperadas na planilha:</p>
                                        <p className="font-mono">name, cpfcnpj, IE, phone, email, address, city</p>
                                        <p>A coluna <span className="font-bold">name</span> é obrigatória.</p>
                                    </div>

                                    <Button variant="outline" size="sm" className="text-xs font-black uppercase gap-2 w-full" disabled={loading}
                                        onClick={() => {
                                            const ws = XLSX.utils.aoa_to_sheet([['name', 'cpfcnpj', 'IE', 'phone', 'email', 'address', 'city']]);
                                            const wb = XLSX.utils.book_new();
                                            XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
                                            XLSX.writeFile(wb, 'modelo_clientes.xlsx');
                                        }}>
                                        <Download className="w-4 h-4" /> Baixar Modelo
                                    </Button>

                                    <Input type="file" accept=".xlsx,.xls,.csv" className="h-9 text-xs" disabled={loading}
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;

                                            const buffer = await file.arrayBuffer();
                                            const wb = XLSX.read(buffer, { type: 'array' });
                                            const ws = wb.Sheets[wb.SheetNames[0]];
                                            const rows = XLSX.utils.sheet_to_json<any>(ws);

                                            if (rows.length === 0) {
                                                toast({ variant: 'destructive', title: 'Planilha vazia ou inválida' });
                                                return;
                                            }

                                            const invalid = rows.filter(r => !r.name);
                                            if (invalid.length > 0) {
                                                toast({ variant: 'destructive', title: `${invalid.length} linha(s) sem nome serão ignoradas` });
                                            }

                                            const valid = rows.filter(r => !!r.name);
                                            if (valid.length === 0) {
                                                toast({ variant: 'destructive', title: 'Nenhuma linha válida encontrada' });
                                                return;
                                            }

                                            setImportPreview(valid);
                                        }} />

                                    {importPreview.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black uppercase text-muted-foreground">{importPreview.length} cliente(s) encontrados</p>
                                            <div className="max-h-40 overflow-y-auto border rounded text-[10px] divide-y">
                                                {importPreview.map((r, i) => (
                                                    <div key={i} className="px-3 py-1.5 flex justify-between">
                                                        <span className="font-bold uppercase">{r.name}</span>
                                                        <span className="text-muted-foreground">{r.city || '-'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <Button className="w-full gap-2 font-black text-xs uppercase" onClick={handleImportCustomers} disabled={loading}>
                                                <Save className="w-4 h-4" /> Importar {importPreview.length} cliente(s)
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        )}
                    </Tabs>
                </DialogContent>
            </Dialog>





            {/* CONFIRM DELETE */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            Deseja excluir <strong>{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleConfirmDelete}>
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}