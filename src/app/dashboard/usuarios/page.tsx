'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/frontend/protected-route';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/use-auth';
import { User, UserRole } from '@/lib/types';
import { Plus, Edit, Trash2, UserCheck, UserX } from 'lucide-react';
import { format } from 'date-fns';

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

export default function UsuariosPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editUserData, setEditUserData] = useState({
    name: '',
    email: '',
    role: 'COMERCIAL' as UserRole,
    active: true,
    password: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'COMERCIAL' as UserRole,
    password: '',
  });

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
        setIsLoading(false);
      }
    };

    loadUsers();
  }, []);

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        const createdUser = await response.json();
        setUsers([...users, createdUser]);
        setNewUser({ name: '', email: '', role: 'COMERCIAL', password: '' });
        setIsCreateDialogOpen(false);
      }
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const handleToggleUserStatus = async (userId: string, active: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user status');
      }

      const updatedUser = await response.json();
      setUsers(users.map(u => u.id === userId ? updatedUser : u));
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditUserData({
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      password: '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    const payload: any = {
      name: editUserData.name,
      email: editUserData.email,
      role: editUserData.role,
      active: editUserData.active,
    };
    if (editUserData.password) {
      payload.password = editUserData.password;
    }

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      const updatedUser = await response.json();
      setUsers(users.map(u => (u.id === updatedUser.id ? updatedUser : u)));
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      setUsers(users.filter(u => u.id !== userId));
      if (selectedUser?.id === userId) {
        setSelectedUser(null);
        setIsEditDialogOpen(false);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute requiredRoles={['ADMIN']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Carregando usuários...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={['ADMIN']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-primary uppercase tracking-tight">Usuários</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Gerenciamento de usuários do sistema
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="usuario@email.com"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Função *</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value) => setNewUser({ ...newUser, role: value as UserRole })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COMERCIAL">Comercial</SelectItem>
                      <SelectItem value="PRODUCAO">Produção</SelectItem>
                      <SelectItem value="LOGISTICA">Logística</SelectItem>
                      <SelectItem value="ADMIN">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="password">Senha *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleCreateUser} className="flex-1">
                    Criar Usuário
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Usuários</p>
                  <p className="text-lg font-black">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Ativos</p>
                  <p className="text-lg font-black">{users.filter(u => u.active).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <UserX className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Inativos</p>
                  <p className="text-lg font-black">{users.filter(u => !u.active).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <UserCheck className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Administradores</p>
                  <p className="text-lg font-black">{users.filter(u => u.role === 'ADMIN').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Usuários */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Usuários do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Último Login</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge className={roleColors[user.role]}>
                        {roleLabels[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={user.active}
                          onCheckedChange={(checked) => handleToggleUserStatus(user.id, checked)}
                          disabled={user.id === currentUser?.id} // Não pode desativar a si mesmo
                        />
                        <span className="text-sm">
                          {user.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(user.createdAt), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      {user.lastLogin ? format(new Date(user.lastLogin), 'dd/MM/yyyy HH:mm') : 'Nunca'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={user.id === currentUser?.id}
                        >
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

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Nome Completo</Label>
                <Input
                  id="edit-name"
                  value={editUserData.name}
                  onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editUserData.email}
                  onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-role">Função</Label>
                <Select
                  value={editUserData.role}
                  onValueChange={(value) => setEditUserData({ ...editUserData, role: value as UserRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMERCIAL">Comercial</SelectItem>
                    <SelectItem value="PRODUCAO">Produção</SelectItem>
                    <SelectItem value="LOGISTICA">Logística</SelectItem>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={editUserData.active}
                  onCheckedChange={(value) => setEditUserData({ ...editUserData, active: value })}
                />
                <span className="text-sm">{editUserData.active ? 'Ativo' : 'Inativo'}</span>
              </div>
              <div>
                <Label htmlFor="edit-password">Senha (deixe em branco para manter)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={editUserData.password}
                  onChange={(e) => setEditUserData({ ...editUserData, password: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleUpdateUser} className="flex-1">
                  Salvar Alterações
                </Button>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}