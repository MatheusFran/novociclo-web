"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from '@/hooks/use-toast';
import { Save, Camera } from 'lucide-react';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  joinDate: string;
  avatar?: string;
}

export default function PerfilPage() {
  const [profile, setProfile] = useState<UserProfile>({
    name: 'João Silva',
    email: 'joao.silva@novociclo.com.br',
    phone: '(11) 98765-4321',
    department: 'Vendas',
    role: 'Gerente',
    joinDate: '2024-01-15',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=joao',
  });

  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);
      // Simulação de salvamento - integrar com API real
      await new Promise(resolve => setTimeout(resolve, 500));
      toast({ title: "Perfil atualizado com sucesso!" });
      setIsEditing(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>
        <p className="text-gray-600 mt-1">Gerencie suas informações pessoais</p>
      </div>

      {/* Card Principal */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Informações Pessoais</CardTitle>
          {!isEditing && (
            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
              disabled={loading}
            >
              Editar Perfil
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <img
                src={profile.avatar}
                alt="Avatar"
                className="w-24 h-24 rounded-full border-4 border-gray-200"
              />
              {isEditing && (
                <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700">
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Foto de Perfil</p>
              <p className="text-xs text-gray-500 mt-1">
                {isEditing ? 'Clique no ícone da câmera para alterar' : 'Último atualizado: há 2 meses'}
              </p>
            </div>
          </div>

          <Separator />

          {/* Informações Editáveis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Nome Completo</label>
              <Input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                disabled={!isEditing}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <Input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                disabled={!isEditing}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Telefone</label>
              <Input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                disabled={!isEditing}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Departamento</label>
              <Input
                value={profile.department}
                onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                disabled={!isEditing}
                className="mt-1"
              />
            </div>
          </div>

          <Separator />

          {/* Informações Somente Leitura */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Função</label>
              <div className="mt-1">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {profile.role}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Data de Entrada</label>
              <p className="mt-1 text-sm text-gray-600">
                {new Date(profile.joinDate).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          {isEditing && (
            <>
              <Separator />
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={loading} className="gap-2">
                  <Save className="w-4 h-4" />
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Segurança */}
      <Card>
        <CardHeader>
          <CardTitle>Segurança</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">Alterar Senha</p>
              <p className="text-sm text-gray-600">Atualize sua senha regularmente</p>
            </div>
            <Button variant="outline" size="sm">
              Alterar
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">Autenticação de Dois Fatores</p>
              <p className="text-sm text-gray-600">Proteja sua conta com 2FA</p>
            </div>
            <Button variant="outline" size="sm">
              Configurar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
