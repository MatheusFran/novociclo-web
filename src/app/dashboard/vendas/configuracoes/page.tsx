"use client";

import { useState, useEffect } from 'react';
import { useSystemData } from '@/server/store';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PriceTable, Member, User, UserRole } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit, Save, Users, DollarSign, Shield, Settings2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  COMERCIAL: 'Comercial',
  PRODUCAO: 'Produção',
  LOGISTICA: 'Logística',
};

const roleColors: Record<UserRole, string> = {
  ADMIN: 'bg-red-100 text-red-800',
  COMERCIAL: 'bg-blue-100 text-blue-800',
  PRODUCAO: 'bg-orange-100 text-orange-800',
  LOGISTICA: 'bg-green-100 text-green-800',
};


export default function ConfiguracoesPage() {
    const { priceTables, products, members, deleteProduct, deleteCustomer, deleteVehicle, addPriceTable, updatePriceTable, deletePriceTable, addMember, updateMember, deleteMember } = useSystemData();

    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [isUsersLoading, setIsUsersLoading] = useState(true);

    // Tabelas de Preço
    const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
    const [editingTable, setEditingTable] = useState<PriceTable | null>(null);
    const [tableName, setTableName] = useState('');
    const [prices, setPrices] = useState<Record<string, number>>({});

    // Members
    const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [memberData, setMemberData] = useState<Omit<Member, 'id' | 'createdAt' | 'updatedAt'>>({ name: '', funcao: '', active: true });

    // Users
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [newUserData, setNewUserData] = useState({
        name: '',
        email: '',
        role: 'COMERCIAL' as UserRole,
        password: '',
    });

    // Delete confirm
    const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null);

    // Carregar usuários
    useEffect(() => {
        const loadUsers = async () => {
            try {
                const response = await fetch('/api/users');
                if (response.ok) {
                    const usersData = await response.json();
                    setUsers(usersData);
                }
            } catch (error) {
                console.error('Error loading users:', error);
            } finally {
                setIsUsersLoading(false);
            }
        };
        loadUsers();
    }, []);

    // ─── Tabela de Preços ───────────────────────
    const handleOpenPriceModal = (table: PriceTable | null) => {
        setEditingTable(table);
        if (table) {
            setTableName(table.name);
            setPrices(table.prices);
        } else {
            setTableName('');
            const init: Record<string, number> = {};
            products.forEach(p => init[p.id] = p.price);
            setPrices(init);
        }
        setIsPriceModalOpen(true);
    };

    const handleSavePriceTable = async () => {
        if (!tableName) { toast({ variant: "destructive", title: "Nome obrigatório" }); return; }
        setLoading(true);
        try {
            if (editingTable) {
                await updatePriceTable(editingTable.id, { name: tableName, prices });
            } else {
                await addPriceTable({ id: `PT-${Date.now()}`, name: tableName, prices });
            }
            toast({ title: "Tabela salva." });
            setIsPriceModalOpen(false);
        } catch (error) {
            toast({ variant: "destructive", title: "Erro ao salvar tabela", description: (error as Error)?.message });
        } finally {
            setLoading(false);
        }
    };



    const handleOpenTeamModal = (member: Member | null) => {
        setEditingMember(member);
        setMemberData(member ? {
            name: member.name,
            funcao: member.funcao ?? '',
            active: member.active,
        } : { name: '', funcao: '', active: true });
        setIsMemberModalOpen(true);
    };

    const handleSaveTeamMember = async () => {
        if (!memberData.name) {
            toast({ variant: 'destructive', title: 'Nome é obrigatórios' });
            return;
        }
        setLoading(true);
        try {
            if (editingMember) {
                await updateMember(editingMember.id, { ...memberData });
            } else {
                await addMember({ ...memberData });
            }
            toast({ title: 'Membro salvo.' });
            setIsMemberModalOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao salvar membro', description: (error as Error)?.message });
        } finally {
            setLoading(false);
        }
    };

    // ─── Usuários ───────────────────────
    const handleOpenUserModal = (user: User | null) => {
        setEditingUser(user);
        if (user) {
            setNewUserData({
                name: user.name,
                email: user.email,
                role: user.role,
                password: '',
            });
        } else {
            setNewUserData({
                name: '',
                email: '',
                role: 'COMERCIAL',
                password: '',
            });
        }
        setIsUserModalOpen(true);
    };

    const handleSaveUser = async () => {
        if (!newUserData.name || !newUserData.email) {
            toast({ variant: 'destructive', title: 'Nome e email são obrigatórios' });
            return;
        }
        if (!editingUser && !newUserData.password) {
            toast({ variant: 'destructive', title: 'Senha é obrigatória para novo usuário' });
            return;
        }
        setLoading(true);
        try {
            if (editingUser) {
                const response = await fetch(`/api/users/${editingUser.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: newUserData.name,
                        email: newUserData.email,
                        role: newUserData.role,
                        ...(newUserData.password && { password: newUserData.password }),
                    }),
                });
                if (response.ok) {
                    const updated = await response.json();
                    setUsers(users.map(u => u.id === updated.id ? updated : u));
                    toast({ title: 'Usuário atualizado.' });
                }
            } else {
                const response = await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newUserData),
                });
                if (response.ok) {
                    const created = await response.json();
                    setUsers([...users, created]);
                    toast({ title: 'Usuário criado.' });
                }
            }
            setIsUserModalOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao salvar usuário', description: (error as Error)?.message });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        confirmDelete('user', userId, 'Usuário');
    };

    // ─── Delete ─────────────────────────────────────────────────
    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        setLoading(true);
        try {
            switch (deleteTarget.type) {
                case 'priceTable': await deletePriceTable(deleteTarget.id); break;
                case 'customer': await deleteCustomer(deleteTarget.id); break;
                case 'vehicle': await deleteVehicle(deleteTarget.id); break;
                case 'product': await deleteProduct(deleteTarget.id); break;
                case 'member': await deleteMember(deleteTarget.id); break;
                case 'user':
                    const response = await fetch(`/api/users/${deleteTarget.id}`, { method: 'DELETE' });
                    if (response.ok) {
                        setUsers(users.filter(u => u.id !== deleteTarget.id));
                    }
                    break;
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
            <div>
                <h1 className="text-2xl font-black text-primary uppercase tracking-tight">Configurações Comerciais</h1>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Gerenciamento de preços, equipe, usuários e parâmetros</p>
            </div>

            <Tabs defaultValue="precos" className="w-full">
                <TabsList className="grid w-full max-w-full grid-cols-4">
                    <TabsTrigger value="precos" className="gap-1.5 font-bold text-xs uppercase"><DollarSign className="w-3.5 h-3.5" /> Preços</TabsTrigger>
                    <TabsTrigger value="equipe" className="gap-1.5 font-bold text-xs uppercase"><Users className="w-3.5 h-3.5" /> Equipe</TabsTrigger>
                    <TabsTrigger value="usuarios" className="gap-1.5 font-bold text-xs uppercase"><Shield className="w-3.5 h-3.5" /> Usuários</TabsTrigger>
                    <TabsTrigger value="integracao" className="gap-1.5 font-bold text-xs uppercase"><Settings2 className="w-3.5 h-3.5" /> Integração</TabsTrigger>
                </TabsList>

                {/* TABELAS DE PREÇO */}
                <TabsContent value="precos" className="mt-6">
                    <Card className="border-none shadow-md overflow-hidden">
                        <CardHeader className="bg-white border-b flex flex-row items-center justify-between py-3">
                            <div>
                                <CardTitle className="text-sm font-black uppercase tracking-tight">Tabelas de Preços</CardTitle>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase">Preços diferenciados por canal de venda</p>
                            </div>
                            <Button size="sm" className="gap-2 font-black uppercase text-xs" onClick={() => handleOpenPriceModal(null)} disabled={loading}>
                                <Plus className="w-4 h-4" /> Nova Tabela
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="text-[9px] font-black uppercase">Nome da Tabela</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase text-center">Produtos</TableHead>
                                        <TableHead className="w-20 text-right pr-4"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {priceTables.map(table => (
                                        <TableRow key={table.id} className="h-12 hover:bg-muted/20">
                                            <TableCell className="text-[11px] font-black uppercase">{table.name}</TableCell>
                                            <TableCell className="text-center text-[10px] font-bold">{Object.keys(table.prices).length} itens</TableCell>
                                            <TableCell className="text-right pr-4">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenPriceModal(table)}>
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => confirmDelete('priceTable', table.id, table.name)}>
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* EQUIPE */}
                <TabsContent value="equipe" className="mt-6">
                    <Card className="border-none shadow-md overflow-hidden">
                        <CardHeader className="bg-white border-b flex flex-row items-center justify-between py-3">
                            <div>
                                <CardTitle className="text-sm font-black uppercase tracking-tight">Equipe Comercial</CardTitle>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase">Cadastro de membros da equipe de vendas</p>
                            </div>
                            <Button size="sm" className="gap-2 font-black uppercase text-xs" onClick={() => handleOpenTeamModal(null)} disabled={loading}>
                                <Plus className="w-4 h-4" /> Novo Membro
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="text-[9px] font-black uppercase">Nome</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase">Função</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase">Status</TableHead>
                                        <TableHead className="w-20 text-right pr-4"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {members.map(member => (
                                        <TableRow key={member.id} className="h-12 hover:bg-muted/20">
                                            <TableCell className="text-[11px] font-black uppercase">{member.name}</TableCell>
                                            <TableCell className="text-[10px] text-muted-foreground uppercase">{member.funcao || '—'}</TableCell>
                                            <TableCell>
                                                <Badge variant={member.active ? 'default' : 'secondary'} className="text-[9px] font-black">
                                                    {member.active ? 'Ativo' : 'Inativo'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-4">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenTeamModal(member)}>
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => confirmDelete('member', member.id, member.name)}>
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* USUÁRIOS */}
                <TabsContent value="usuarios" className="mt-6">
                    <Card className="border-none shadow-md overflow-hidden">
                        <CardHeader className="bg-white border-b flex flex-row items-center justify-between py-3">
                            <div>
                                <CardTitle className="text-sm font-black uppercase tracking-tight">Usuários do Sistema</CardTitle>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase">Gerenciar acesso e permissões de usuários</p>
                            </div>
                            <Button size="sm" className="gap-2 font-black uppercase text-xs" onClick={() => handleOpenUserModal(null)} disabled={loading || isUsersLoading}>
                                <Plus className="w-4 h-4" /> Novo Usuário
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="text-[9px] font-black uppercase">Nome</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase">E-mail</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase">Função</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase">Data Criação</TableHead>
                                        <TableHead className="w-20 text-right pr-4"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map(user => (
                                        <TableRow key={user.id} className="h-12 hover:bg-muted/20">
                                            <TableCell className="text-[11px] font-black uppercase">{user.name}</TableCell>
                                            <TableCell className="text-[10px] text-muted-foreground">{user.email}</TableCell>
                                            <TableCell>
                                                <Badge className={`text-[9px] font-black ${roleColors[user.role]}`}>
                                                    {roleLabels[user.role]}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-[10px] text-muted-foreground">
                                                {format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                                            </TableCell>
                                            <TableCell className="text-right pr-4">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenUserModal(user)}>
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDeleteUser(user.id)}>
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* INTEGRAÇÃO */}
                <TabsContent value="integracao" className="mt-6">
                    <Card className="border-none shadow-md overflow-hidden">
                        <CardHeader className="bg-white border-b py-3">
                            <div>
                                <CardTitle className="text-sm font-black uppercase tracking-tight">Integrações e API</CardTitle>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Configurações de integrações externas e chaves de API</p>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="text-center py-12 text-muted-foreground">
                                <Settings2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p className="text-sm font-semibold">Integrações em breve</p>
                                <p className="text-xs mt-2">Configurações de integração com serviços externos em desenvolvimento</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>


            </Tabs>



            {/* MODAL TABELA DE PREÇOS */}
            <Dialog open={isPriceModalOpen} onOpenChange={setIsPriceModalOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="font-black uppercase">{editingTable ? 'Editar' : 'Nova'} Tabela de Preços</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-muted-foreground">Nome da Tabela *</label>
                            <Input placeholder="Ex: Varejo, Atacado, Representante" value={tableName} onChange={e => setTableName(e.target.value)} className="h-9 text-xs" disabled={loading} />
                        </div>
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="text-[9px] font-black uppercase">Produto</TableHead>
                                    <TableHead className="text-[9px] font-black uppercase text-center">Preço</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {products.filter(p => !p.isRawMaterial).map(p => (
                                    <TableRow key={p.id} className="h-10">
                                        <TableCell className="text-[11px] font-bold uppercase">{p.name}</TableCell>
                                        <TableCell>
                                            <Input type="number" step="0.01" value={prices[p.id] || ''}
                                                onChange={e => setPrices(prev => ({ ...prev, [p.id]: parseFloat(e.target.value) || 0 }))}
                                                className="h-8 text-xs" disabled={loading} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsPriceModalOpen(false)} className="font-bold text-xs uppercase" disabled={loading}>Cancelar</Button>
                        <Button onClick={handleSavePriceTable} className="gap-2 font-black text-xs uppercase" disabled={loading}><Save className="w-4 h-4" /> Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>



            {/* MODAL EQUIPE */}
            <Dialog open={isMemberModalOpen} onOpenChange={setIsMemberModalOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="font-black uppercase">{editingMember ? 'Editar' : 'Novo'} Membro da Equipe</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-3">
                        <Input placeholder="Nome completo *" value={memberData.name}
                            onChange={e => setMemberData({ ...memberData, name: e.target.value })} className="h-9 text-xs" disabled={loading} />
                        <div className="grid grid-cols-2 gap-3">
                            <Input placeholder="Função (ex: Vendedor)" value={memberData.funcao || ''}
                                onChange={e => setMemberData({ ...memberData, funcao: e.target.value })} className="h-9 text-xs" disabled={loading} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsMemberModalOpen(false)} className="font-bold text-xs uppercase" disabled={loading}>Cancelar</Button>
                        <Button onClick={handleSaveTeamMember} className="gap-2 font-black text-xs uppercase" disabled={loading}><Save className="w-4 h-4" /> Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL USUÁRIOS */}
            <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="font-black uppercase">{editingUser ? 'Editar' : 'Novo'} Usuário</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-3">
                        <Input placeholder="Nome completo *" value={newUserData.name}
                            onChange={e => setNewUserData({ ...newUserData, name: e.target.value })} className="h-9 text-xs" disabled={loading} />
                        <Input placeholder="E-mail *" type="email" value={newUserData.email}
                            onChange={e => setNewUserData({ ...newUserData, email: e.target.value })} className="h-9 text-xs" disabled={loading} />
                        {!editingUser && (
                            <Input placeholder="Senha *" type="password" value={newUserData.password}
                                onChange={e => setNewUserData({ ...newUserData, password: e.target.value })} className="h-9 text-xs" disabled={loading} />
                        )}
                        {editingUser && (
                            <Input placeholder="Senha (deixe em branco para manter a atual)" type="password" value={newUserData.password}
                                onChange={e => setNewUserData({ ...newUserData, password: e.target.value })} className="h-9 text-xs" disabled={loading} />
                        )}
                        <Select value={newUserData.role} onValueChange={(value) => setNewUserData({ ...newUserData, role: value as UserRole })}>
                            <SelectTrigger className="h-9 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ADMIN">Administrador</SelectItem>
                                <SelectItem value="COMERCIAL">Comercial</SelectItem>
                                <SelectItem value="PRODUCAO">Produção</SelectItem>
                                <SelectItem value="LOGISTICA">Logística</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsUserModalOpen(false)} className="font-bold text-xs uppercase" disabled={loading}>Cancelar</Button>
                        <Button onClick={handleSaveUser} className="gap-2 font-black text-xs uppercase" disabled={loading}><Save className="w-4 h-4" /> Salvar</Button>
                    </DialogFooter>
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