"use client";

import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Clock, TableCellsMerge } from "lucide-react";
import { exportToCSV } from "@/lib/export-csv";

const leadTimeData = [
  { etapa: "1. Venda até Aprovação", tempoAprovado: 2.1, maximoAceitavel: 4 },
  { etapa: "2. Em Produção", tempoAprovado: 18.5, maximoAceitavel: 24 },
  { etapa: "3. Fila de Expedição", tempoAprovado: 12.3, maximoAceitavel: 8 }, // Gargalo
  { etapa: "4. Em Trânsito", tempoAprovado: 6.2, maximoAceitavel: 8 },
];

export default function LeadTimeBiPage() {

  useEffect(() => {
    const btn = document.getElementById('export-csv-btn');
    if (btn) {
      const handleExport = () => exportToCSV(leadTimeData, "relatorio-leadtime");
      btn.addEventListener('click', handleExport);
      return () => btn.removeEventListener('click', handleExport);
    }
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 pb-2">
              <Clock className="h-4 w-4 text-red-600" />
              <p className="text-xs font-black uppercase text-red-600">Alerta Crítico: Gargalo Identificado</p>
            </div>
            <h2 className="text-lg font-black text-red-900 mt-2">Fila de Expedição (+4 horas)</h2>
            <p className="text-[10px] uppercase font-bold text-red-700/80 mt-1">Os pedidos estão prontos, mas aguardando montar carga mais tempo que o aceitável.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card className="border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
            <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-800">Cadeia de Lead Time: Tempos Médios por Status (Horas)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-6 h-[400px]">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadTimeData} layout="vertical" margin={{ left: 50 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="etapa" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#334155", fontWeight: 'bold' }} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(val) => [`${val} horas`, undefined]}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                <Bar dataKey="tempoAprovado" name="Tempo Real Médio" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={32}>
                  {/* Dynamic coloring for bottlenecks */}
                  {leadTimeData.map((entry, index) => (
                    <TableCellsMerge key={`cell-${index}`} fill={entry.tempoAprovado > entry.maximoAceitavel ? '#ef4444' : '#3b82f6'} />
                  ))}
                </Bar>
                <Bar dataKey="maximoAceitavel" name="SLA Máximo Acordado" fill="#cbd5e1" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
