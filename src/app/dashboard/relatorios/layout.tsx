"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download, Calendar, Filter, PieChart, TrendingUp, Truck, Factory, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TABS = [
  { name: "Cockpit Executivo", path: "/dashboard/relatorios/cockpit", icon: PieChart },
  { name: "Comercial & Vendas", path: "/dashboard/relatorios/vendas", icon: TrendingUp },
  { name: "Logística & Frota", path: "/dashboard/relatorios/logistica", icon: Truck },
  { name: "Produção", path: "/dashboard/relatorios/producao", icon: Factory },
  { name: "Lead Time (Gargalos)", path: "/dashboard/relatorios/lead-time", icon: Activity },
];

export default function RelatoriosLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [date, setDate] = useState<Date | undefined>(new Date());

  // If we are exactly on /dashboard/relatorios, we should probably redirect to cockpit. 
  // For now, the shared layout will wrap all of them.
  return (
    <div className="w-full space-y-6">
      {/* HEADER & FILTERS */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-white p-4 border border-slate-200 rounded-md shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <PieChart className="w-6 h-6 text-emerald-600" />
            Business Intelligence
          </h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Dashboards e Relatórios Gerenciais
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* ADVANCED FILTER */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="text-xs font-bold uppercase border-slate-300">
                <Calendar className="w-4 h-4 mr-2" />
                {date ? format(date, "MMMM 'de' yyyy", { locale: ptBR }) : 'Período'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" className="text-xs font-bold uppercase border-slate-300">
            <Filter className="w-4 h-4 mr-2" />
            Filtros Avançados
          </Button>

          <Button id="export-csv-btn" variant="default" className="text-xs font-black uppercase bg-slate-800 hover:bg-slate-900 text-white">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex bg-slate-100 p-1 rounded-md border border-slate-200 overflow-x-auto overflow-y-hidden no-scrollbar">
        {TABS.map((tab) => {
          const isActive = pathname === tab.path || (pathname === '/dashboard/relatorios' && tab.path.includes('cockpit'));
          const Icon = tab.icon;
          return (
            <Link key={tab.path} href={tab.path} className="flex-1 min-w-[180px]">
              <div
                className={`flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-black uppercase rounded-sm transition-all duration-200 ${
                  isActive 
                    ? "bg-white text-emerald-700 shadow-sm border border-slate-200" 
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </div>
            </Link>
          );
        })}
      </div>

      {/* DASHBOARD CONTENT */}
      <div className="w-full">
        {children}
      </div>
    </div>
  );
}
