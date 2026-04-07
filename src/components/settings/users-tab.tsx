/**
 * Componente de gerenciamento de usuários/equipe
 * Integrado com API v1
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit, Copy, Eye, EyeOff } from 'lucide-react';
import { UserRole } from '@/server/auth';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  COMERCIAL: 'Comercial',
  PRODUCAO: 'Produção',
  LOGISTICA: 'Logística',
  FINANCEIRO: 'Financeiro',
  RH: 'Recursos Humanos',
};

const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN: 'bg-red-50 text-red-700 border-red-200',
  COMERCIAL: 'bg-blue-50 text-blue-700 border-blue-200',
  PRODUCAO: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  LOGISTICA: 'bg-green-50 text-green-700 border-green-200',
  FINANCEIRO: 'bg-purple-50 text-purple-700 border-purple-200',
  RH: 'bg-orange-50 text-orange-700 border-orange-200',
};

export function UsersSettingsTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: UserRole.COMERCIAL,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/users?limit=100');
      if (!res.ok) throw new Error('Erro ao carregar usuários');
      const data = await res.json();
      setUsers(data.data || []);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao carregar usuários',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: UserRole.COMERCIAL,
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      // Validações
      if (!formData.name || !formData.email) {
        toast({ variant: 'destructive', title: 'Nome e email são obrigatórios' });
        return;
      }

      if (!editingUser && !formData.password) {
        toast({ variant: 'destructive', title: 'Senha é obrigatória para novo usuário' });
        return;
      }

      const url = editingUser ? `/api/v1/users/${editingUser.id}` : '/api/v1/users';
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          ...(formData.password && { password: formData.password }),
          role: formData.role,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erro ao salvar usuário');
      }

      toast({ title: editingUser ? 'Usuário atualizado' : 'Usuário criado' });
      setIsModalOpen(false);
      loadUsers();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar',
      });
    }
  };

  const handleDelete = async (user: User) => {
    try {
      const res = await fetch(`/api/v1/users/${user.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Erro ao deletar usuário');

      toast({ title: 'Usuário deletado' });
      setDeleteConfirm(null);
      loadUsers();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao deletar',
      });
    }
  };

  const generateTemporaryPassword = () => {
    // Gera uma senha temporária forte
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    password += 'A'; // Maiúscula
    password += 'a'; // Minúscula
    password += '1'; // Número
    password += '!'; // Especial
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const finalPassword = password.split('').sort(() => Math.random() - 0.5).join('');
    setFormData(prev => ({ ...prev, password: finalPassword }));
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-md">
        <CardHeader className="bg-white border-b flex flex-row items-center justify-between py-3">
          <div>
            <CardTitle className="text-sm font-black uppercase tracking-tight">Usuários e Funções</CardTitle>
            <p className="text-[9px] font-bold text-muted-foreground uppercase">Gerencie acesso e permissões</p>
          </div>
          <Button size="sm" className="gap-2 font-black uppercase text-xs" onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4" /> Novo Usuário
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando usuários...</div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-[9px] font-black uppercase">Nome</TableHead>
                  <TableHead className="text-[9px] font-black uppercase">Email</TableHead>
                  <TableHead className="text-[9px] font-black uppercase">Função</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-center">Status</TableHead>
                  <TableHead className="w-20 text-right pr-4"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs font-medium">{user.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge className={`text-[9px] font-bold lowercase ${ROLE_COLORS[user.role]}`}>
                        {ROLE_LABELS[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={user.active ? 'default' : 'secondary'} className="text-[9px] font-bold">
                        {user.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenModal(user)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirm(user)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Edição/Criação */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="usuario@empresa.com"
                disabled={!!editingUser}
              />
            </div>
            <div>
              <label className="text-sm font-medium flex items-center justify-between">
                Senha
                {!editingUser && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-6 px-2"
                    onClick={generateTemporaryPassword}
                  >
                    <Copy className="w-3 h-3 mr-1" /> Gerar
                  </Button>
                )}
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder={editingUser ? 'Deixe em branco para manter' : 'Digite a senha'}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Função</label>
              <Select value={formData.role} onValueChange={value => setFormData(prev => ({ ...prev, role: value as UserRole }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingUser ? 'Atualizar' : 'Criar'} Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Deleção */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar {deleteConfirm?.name}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
