'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Settings,
  TrendingUp,
  Factory,
  BarChart3,
  Truck,
  CreditCard,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { ProtectedRoute } from '@/components/settings/protected-route';
import {
  SidebarHeaderComponent,
  SimpleMenuItem,
  SidebarFooterComponent,
  DASHBOARD_MENU_CONFIG,
} from '@/components/dashboard/sidebar';
import { NotificationCenter } from '@/components/notifications';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const isProducaoActive = pathname.startsWith('/dashboard/producao');

  const isVendasActive = pathname.startsWith('/dashboard/vendas');

  const isRelatoriosActive =
    pathname.startsWith('/dashboard/relatorios');

  const isLogisticaActive =
    pathname.startsWith('/dashboard/logistica');

  const isFinanceiroActive =
    pathname.startsWith('/dashboard/financeiro');

  const bottomItems = [
    { label: 'Configurações', icon: 'Settings', path: '/dashboard/configuracoes' },
  ];

  const { topItems } = DASHBOARD_MENU_CONFIG;

  const mainCategories = [
    { label: 'Vendas', icon: 'TrendingUp', path: '/dashboard/vendas', isActive: isVendasActive },
    { label: 'Produção', icon: 'Factory', path: '/dashboard/producao', isActive: isProducaoActive },
    { label: 'Financeiro', icon: 'CreditCard', path: '/dashboard/financeiro', isActive: isFinanceiroActive },
    { label: 'Logística', icon: 'Truck', path: '/dashboard/logistica', isActive: isLogisticaActive },
    { label: 'Relatórios', icon: 'BarChart3', path: '/dashboard/relatorios', isActive: isRelatoriosActive },
  ];

  return (
    <ProtectedRoute requireAuth>
      <SidebarProvider style={{ "--sidebar-width": "14rem" } as React.CSSProperties}>
        <Sidebar collapsible="icon" className="no-print sticky top-0 z-30 h-screen bg-primary border-r border-primary [&>*]:bg-transparent">

          <SidebarHeader className="flex items-center justify-center px-4 pt-6 pb-4 bg-primary/70">
            <SidebarHeaderComponent />
          </SidebarHeader>

          <div className="px-4 pb-2 bg-primary/70">
            <Separator className="bg-white/20" />
          </div>

          <SidebarContent>
            <SidebarMenu className="px-2 mt-2 space-y-0.5">
              {/* Visão Geral */}
              {topItems.map(item => (
                <SimpleMenuItem
                  key={item.path}
                  icon={item.icon}
                  label={item.label}
                  path={item.path}
                  isActive={pathname === item.path}
                />
              ))}

              {/* Categorias principais */}
              {mainCategories.map(category => (
                <SimpleMenuItem
                  key={category.path}
                  icon={category.icon}
                  label={category.label}
                  path={category.path}
                  isActive={category.isActive}
                />
              ))}

              {/* Restante do menu */}
              <Separator className="my-3 bg-white/10" />
              {bottomItems.map(item => (
                <SimpleMenuItem
                  key={item.path}
                  icon={item.icon}
                  label={item.label}
                  path={item.path}
                  isActive={pathname === item.path}
                />
              ))}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-primary/80 bg-primary/70">
            <SidebarFooterComponent onSignOut={signOut} />
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <header className="h-14 flex items-center border-b border-primary/80 px-4 md:px-6 bg-primary sticky top-0 z-20 no-print shadow-sm">
            <SidebarTrigger className="text-white hover:bg-white/10 mr-2" />
            <div className="flex-1 px-3 md:px-4 flex items-center gap-1.5 text-xs font-medium text-white/70 uppercase tracking-wider">
              <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
              
              {pathname !== '/dashboard' && pathname.split('/').slice(2).map((segment, idx, arr) => {
                const isLast = idx === arr.length - 1;
                const path = `/dashboard/${arr.slice(0, idx + 1).join('/')}`;
                return (
                  <React.Fragment key={path}>
                    <ChevronRight className="w-3 h-3 text-white/40" />
                    {isLast ? (
                      <span className="text-white/95 font-semibold text-white/90">{segment.replace('-', ' ')}</span>
                    ) : (
                      <Link href={path} className="hover:text-white transition-colors">{segment.replace('-', ' ')}</Link>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            {user && <NotificationCenter userId={user.id} />}
          </header>
          <main className="flex-1 p-6 overflow-auto bg-slate-50/50">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute >
  );
}