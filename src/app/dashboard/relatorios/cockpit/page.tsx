"use client";

import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { ArrowUpRight, ArrowDownRight, Package, Truck, AlertTriangle, TrendingUp } from "lucide-react";
import { exportToCSV } from "@/lib/export-csv";

const faturamentoData = [
  { name: "Jan", atual: 4000, meta: 2400 },
  { name: "Fev", atual: 3000, meta: 1398 },
  { name: "Mar", atual: 2000, meta: 9800 },
  { name: "Abr", atual: 2780, meta: 3908 },
  { name: "Mai", atual: 1890, meta: 4800 },
  { name: "Jun", atual: 2390, meta: 3800 },
  { name: "Jul", atual: 3490, meta: 4300 },
];

export default function CockpitOverviewPage() {
  
  useEffect(() => {
    // Hook up export button from layout
    const btn = document.getElementById('export-csv-btn');
    if (btn) {
      const handleExport = () => exportToCSV(faturamentoData, "relatorio-faturamento");
      btn.addEventListener('click', handleExport);
      return () => btn.removeEventListener('click', handleExport);
    }
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-xs font-black uppercase text-slate-500">Faturamento Mês</p>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline space-x-2">
              <h2 className="text-2xl font-black text-slate-800">R$ 4.2M</h2>
              <span className="flex items-center text-xs font-bold text-emerald-600">
                <ArrowUpRight className="h-3 w-3" /> +15.3%
              </span>
            </div>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Comparado ao mês anterior</p>
          </CardContent>
        </Card>

        {/* KPI 2 */}
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-xs font-black uppercase text-slate-500">Pedidos Em Produção</p>
              <Package className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex items-baseline space-x-2">
              <h2 className="text-2xl font-black text-slate-800">842</h2>
              <span className="flex items-center text-xs font-bold text-red-500">
                <ArrowDownRight className="h-3 w-3" /> -2.5%
              </span>
            </div>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">4 gargalos críticos reportados</p>
          </CardContent>
        </Card>

        {/* KPI 3 */}
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-xs font-black uppercase text-slate-500">Atrasos de Entrega</p>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </div>
            <div className="flex items-baseline space-x-2">
              <h2 className="text-2xl font-black text-slate-800">24</h2>
              <span className="flex items-center text-xs font-bold text-emerald-600">
                <ArrowDownRight className="h-3 w-3" /> -12%
              </span>
            </div>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Melhoria de SLA de frete</p>
          </CardContent>
        </Card>

        {/* KPI 4 */}
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-xs font-black uppercase text-slate-500">Nível de Serviço (OTIF)</p>
              <Truck className="h-4 w-4 text-purple-600" />
            </div>
            <div className="flex items-baseline space-x-2">
              <h2 className="text-2xl font-black text-slate-800">92.4%</h2>
              <span className="flex items-center text-xs font-bold text-emerald-600">
                <ArrowUpRight className="h-3 w-3" /> +1.2%
              </span>
            </div>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Meta atual: 95%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
            <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-800">Faturamento Realizado x Meta</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-6 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={faturamentoData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} 
                       tickFormatter={(value) => `R$${value/1000}k`} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                <Bar dataKey="atual" name="Realizado" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="meta" name="Meta Cumulativa" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
            <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-800">Evolução do Saldo de Pedidos em Carteira</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-6 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={faturamentoData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                <Line type="monotone" dataKey="atual" name="Volume Pedidos (R$)" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6'}} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
