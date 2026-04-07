/**
 * Componente de página de configurações refatorada
 * Usa componentes modulares para cada aba
 */

'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Settings, Lock, Package, DollarSign, Truck } from 'lucide-react';
import { UsersSettingsTab } from './users-tab';

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-primary uppercase tracking-tight">
          Configurações do Sistema
        </h1>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          Gerenciamento de usuários, dados e parâmetros operacionais
        </p>
      </div>

      <Tabs defaultValue="usuarios" className="w-full">
        <TabsList className="grid w-full max-w-[1000px] grid-cols-6">
          <TabsTrigger value="usuarios" className="gap-1.5 font-bold text-xs uppercase">
            <Users className="w-3.5 h-3.5" /> Usuários
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="gap-1.5 font-bold text-xs uppercase">
            <Lock className="w-3.5 h-3.5" /> Segurança
          </TabsTrigger>
          <TabsTrigger value="produtos" className="gap-1.5 font-bold text-xs uppercase">
            <Package className="w-3.5 h-3.5" /> Produtos
          </TabsTrigger>
          <TabsTrigger value="precos" className="gap-1.5 font-bold text-xs uppercase">
            <DollarSign className="w-3.5 h-3.5" /> Preços
          </TabsTrigger>
          <TabsTrigger value="veiculos" className="gap-1.5 font-bold text-xs uppercase">
            <Truck className="w-3.5 h-3.5" /> Veículos
          </TabsTrigger>
          <TabsTrigger value="sistema" className="gap-1.5 font-bold text-xs uppercase">
            <Settings className="w-3.5 h-3.5" /> Sistema
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          {/* Usuários */}
          <TabsContent value="usuarios">
            <UsersSettingsTab />
          </TabsContent>

          {/* Segurança */}
          <TabsContent value="seguranca">
            <div className="text-center py-12 text-muted-foreground">
              <p className="font-medium">Configurações de segurança em desenvolvimento</p>
            </div>
          </TabsContent>

          {/* Produtos */}
          <TabsContent value="produtos">
            <div className="text-center py-12 text-muted-foreground">
              <p className="font-medium">Gerenciamento de produtos em desenvolvimento</p>
            </div>
          </TabsContent>

          {/* Preços */}
          <TabsContent value="precos">
            <div className="text-center py-12 text-muted-foreground">
              <p className="font-medium">Tabelas de preços em desenvolvimento</p>
            </div>
          </TabsContent>

          {/* Veículos */}
          <TabsContent value="veiculos">
            <div className="text-center py-12 text-muted-foreground">
              <p className="font-medium">Gerenciamento de veículos em desenvolvimento</p>
            </div>
          </TabsContent>

          {/* Sistema */}
          <TabsContent value="sistema">
            <div className="text-center py-12 text-muted-foreground">
              <p className="font-medium">Configurações do sistema em desenvolvimento</p>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
