'use client';

import { useAuth } from '@/hooks/use-auth';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users, // Ícone para CRM
  LogOut,
  Truck,
  FileCheck,
  Settings
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { Separator } from '@/components/ui/separator';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ProtectedRoute } from '@/frontend/protected-route';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  const menuItems = [
    { label: 'Visão Geral', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Pedidos de Venda', icon: ShoppingCart, path: '/dashboard/pedidos' },
    { label: 'Produção', icon: Package, path: '/dashboard/producao' },
    { label: 'Logística', icon: Truck, path: '/dashboard/logistica' },
    { label: 'Faturamento', icon: FileCheck, path: '/dashboard/faturamento' },
    { label: 'Configurações', icon: Settings, path: '/dashboard/configuracoes' },
    ...(user?.role === 'ADMIN' ? [{ label: 'Usuários', icon: Users, path: '/dashboard/usuarios' }] : []),
  ];

  return (
    <ProtectedRoute requireAuth>
      <SidebarProvider>
        <Sidebar collapsible="icon" className="no-print">
          <SidebarHeader className="h-20 flex items-center px-4">
            <SidebarHeader className="h-20 flex items-center px-4">
              <Link href="/dashboard" className="flex items-center gap-3 group">
                <div className="w-48 h-14 relative overflow-hidden rounded-xl bg-white shadow-lg border-2 border-primary/20">
                  <Image
                    src="/logo.png"
                    alt="Logo Novo Ciclo"
                    fill
                    className="object-contain p-1.5"
                  />
                </div>
              </Link>
            </SidebarHeader>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu className="px-2 mt-4">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.path}
                    tooltip={item.label}
                    className="h-11 hover:bg-primary/5 data-[active=true]:bg-primary/10"
                  >
                    <Link href={item.path} className="flex items-center gap-3">
                      <item.icon className={`w-5 h-5 ${pathname === item.path ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`font-bold uppercase text-[11px] tracking-wider ${pathname === item.path ? 'text-primary' : 'text-muted-foreground'}`}>
                        {item.label}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4">
            <Separator className="mb-4" />
            <div className="flex flex-col gap-2 group-data-[collapsible=icon]:items-center">
              <Button variant="ghost" size="sm" className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/5 font-bold uppercase text-[10px]" onClick={signOut}>
                <LogOut className="w-4 h-4" />
                <span className="group-data-[collapsible=icon]:hidden">Sair do Sistema</span>
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="h-16 flex items-center border-b px-6 bg-white/80 backdrop-blur-md sticky top-0 z-20 no-print">
            <SidebarTrigger />
            <div className="flex-1 px-4">
              <h1 className="text-xs font-black uppercase tracking-[0.2em] text-primary/60">
                {pathname === '/dashboard' ? 'Painel Executivo' : menuItems.find(m => m.path === pathname)?.label || 'Sistema'}
              </h1>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto bg-slate-50/50">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
