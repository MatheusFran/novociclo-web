'use client';

import { useAuth } from '@/hooks/use-auth';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  LogOut,
  Truck,
  FileCheck,
  Settings,
  ChevronDown,
  ChevronRight,
  BookDashed,
  BookOpen,
  BoxSelect,
  BoxesIcon,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
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
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ProtectedRoute } from '@/frontend/protected-route';
import { useState } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const isProducaoActive =
    pathname === '/dashboard/producao' || pathname === '/dashboard/logistica/estoque';

  const [producaoOpen, setProducaoOpen] = useState(isProducaoActive);

  const topItems = [
    { label: 'Visão Geral', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Pedidos de Venda', icon: ShoppingCart, path: '/dashboard/pedidos' },
  ];

  const producaoSubItems = [
    { label: 'Fila de Produção', icon: Package, path: '/dashboard/producao' },
    { label: 'Estoque', icon: Truck, path: '/dashboard/logistica/estoque' },
    { label: 'Carregamento', icon: BoxesIcon, path: '/dashboard/producao/carregamento' },
  ];

  const bottomItems = [
    { label: 'Logística', icon: Truck, path: '/dashboard/logistica' },
    { label: 'Faturamento', icon: FileCheck, path: '/dashboard/faturamento' },
    { label: 'Configurações', icon: Settings, path: '/dashboard/configuracoes' },
    ...(user?.role === 'ADMIN' ? [{ label: 'Usuários', icon: Users, path: '/dashboard/usuarios' }] : []),
  ];

  const allMenuItems = [...topItems, ...bottomItems];
  const currentLabel = producaoSubItems.find(i => i.path === pathname)?.label
    || allMenuItems.find(m => m.path === pathname)?.label
    || (isProducaoActive ? 'Produção' : 'Sistema');

  return (
    <ProtectedRoute requireAuth>
      <SidebarProvider>
        <Sidebar collapsible="icon" className="no-print bg-white [&>*]:bg-white">

          <SidebarHeader className="h-20 flex items-center px-4">
            <SidebarHeader className="h-20 flex items-center px-4">
              <Link href="/dashboard" className="flex items-center gap-3 group">
                <div className="w-48 h-14 relative overflow-hidden rounded-xl bg-white shadow-lg border-2 border-primary/20">
                  <Image src="/logo.png" alt="Logo Novo Ciclo" fill className="object-contain p-1.5" />
                </div>
              </Link>
            </SidebarHeader>
          </SidebarHeader>

          <SidebarContent>
            <SidebarMenu className="px-2 mt-4">
              {/* Visão Geral */}
              {topItems.map(item => (
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

              {/* Produção — grupo expansível */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Produção"
                  isActive={isProducaoActive}
                  className="h-11 hover:bg-primary/5 data-[active=true]:bg-primary/10 cursor-pointer"
                  onClick={() => setProducaoOpen(v => !v)}
                >
                  <Package className={`w-5 h-5 ${isProducaoActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`font-bold uppercase text-[11px] tracking-wider flex-1 ${isProducaoActive ? 'text-primary' : 'text-muted-foreground'}`}>
                    Produção
                  </span>
                  {producaoOpen
                    ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                    : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                  }
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Subitens de Produção */}
              {producaoOpen && producaoSubItems.map(item => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.path}
                    tooltip={item.label}
                    className="h-10 pl-8 hover:bg-primary/5 data-[active=true]:bg-primary/10 group-data-[collapsible=icon]:pl-0"
                  >
                    <Link href={item.path} className="flex items-center gap-3">
                      <item.icon className={`w-4 h-4 ${pathname === item.path ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`font-bold uppercase text-[10px] tracking-wider ${pathname === item.path ? 'text-primary' : 'text-muted-foreground'}`}>
                        {item.label}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Restante do menu */}
              {bottomItems.map(item => (
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
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/5 font-bold uppercase text-[10px]"
                onClick={signOut}
              >
                <LogOut className="w-4 h-4" />
                <span className="group-data-[collapsible=icon]:hidden">Sair do Sistema</span>
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <header className="h-14 md:h-16 flex items-center border-b px-4 md:px-6 bg-white/80 backdrop-blur-md sticky top-0 z-20 no-print">
            <SidebarTrigger />
            <div className="flex-1 px-3 md:px-4">
              <h1 className="text-xs font-black uppercase tracking-[0.2em] text-primary/60 truncate">
                {currentLabel}
              </h1>
            </div>
          </header>
          <main className="flex-1 p-3 md:p-6 overflow-auto bg-slate-50/50">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute >
  );
}