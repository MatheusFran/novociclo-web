"use client";

import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import { exportToCSV } from "@/lib/export-csv";
import { TableCellsMergeIcon } from "lucide-react";

const oeeData = [
  { dia: "Seg", oee: 75, disponibilidade: 80, performance: 95, qualidade: 99 },
  { dia: "Ter", oee: 82, disponibilidade: 88, performance: 94, qualidade: 99 },
  { dia: "Qua", oee: 68, disponibilidade: 75, performance: 92, qualidade: 98 }, // downtime
  { dia: "Qui", oee: 85, disponibilidade: 90, performance: 96, qualidade: 98 },
  { dia: "Sex", oee: 90, disponibilidade: 95, performance: 95, qualidade: 100 },
];

const mixEstoque = [
  { categoria: "Bombonas 5L", giro: 60, pPontoPedido: 10 },
  { categoria: "Tambores 50L", giro: 20, pPontoPedido: -5 }, // Faltando
  { categoria: "IBCs 1000L", giro: 15, pPontoPedido: 15 },
];

export default function ProducaoBiPage() {

  useEffect(() => {
    const btn = document.getElementById('export-csv-btn');
    if (btn) {
      const handleExport = () => exportToCSV(oeeData, "relatorio-producao");
      btn.addEventListener('click', handleExport);
      return () => btn.removeEventListener('click', handleExport);
    }
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* OEE - Eficiência */}
        <Card className="border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
            <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-800">Eficiência Global (OEE) na Semana</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-6 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={oeeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: "#64748b" }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(v) => `${v}%`}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }} />
                <Line type="monotone" dataKey="oee" name="OEE Global" stroke="#8b5cf6" strokeWidth={4} />
                <Line type="monotone" dataKey="disponibilidade" name="Disponib. Máquina" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Giro de Estoque */}
        <Card className="border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
            <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-800">Giro de Estoque x Ponto de Pedido</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-6 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mixEstoque}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="categoria" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }} />
                <Bar dataKey="giro" name="Nível Atual (Aceleração)" fill="#0f766e" radius={[4, 4, 0, 0]} maxBarSize={50} />
                <Bar dataKey="pPontoPedido" name="Margem para o Ponto de Ruptura" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={50}>
                  {mixEstoque.map((entry, index) => (
                    <TableCellsMergeIcon key={`cell-${index}`} fill={entry.pPontoPedido < 0 ? '#ef4444' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
