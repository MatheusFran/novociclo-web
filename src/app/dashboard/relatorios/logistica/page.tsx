"use client";

import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { exportToCSV } from "@/lib/export-csv";

const ocorrenciasData = [
  { name: "Cliente Ausente", value: 45, color: "#f87171" }, // red-400
  { name: "Endereço Errado", value: 25, color: "#fb923c" }, // orange-400
  { name: "Avaria no Transporte", value: 15, color: "#facc15" }, // amber-400
  { name: "Recusa Comercial", value: 10, color: "#60a5fa" }, // blue-400
  { name: "Outros", value: 5, color: "#94a3b8" }, // slate-400
];

const frotaData = [
  { name: "VW Delivery 9.170", ocupacao: 85 },
  { name: "Mercedes Accelo 815", ocupacao: 92 },
  { name: "Fiat Fiorino 1", ocupacao: 45 },
  { name: "Fiat Fiorino 2", ocupacao: 60 },
  { name: "Caminhão Terceiro A", ocupacao: 98 },
];

export default function LogisticaBiPage() {

  useEffect(() => {
    const btn = document.getElementById('export-csv-btn');
    if (btn) {
      const handleExport = () => {
        exportToCSV([
          ...ocorrenciasData.map(d => ({ Tipo: 'Ocorrência', Categoria: d.name, Valor: d.value })),
          ...frotaData.map(d => ({ Tipo: 'Frota', Categoria: d.name, Valor: `${d.ocupacao}%` }))
        ], "relatorio-logistica");
      };
      btn.addEventListener('click', handleExport);
      return () => btn.removeEventListener('click', handleExport);
    }
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Gráfico de Pizza - Ocorrências */}
        <Card className="border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
            <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-800">Causas de Retorno e Ocorrência</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-6 h-[400px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ocorrenciasData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {ocorrenciasData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Barras Horizontais - Ocupação */}
        <Card className="border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
            <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-800">Taxa de Ocupação por Veículo (%)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-6 h-[400px]">
             <div className="h-full space-y-4">
               {frotaData.sort((a,b) => b.ocupacao - a.ocupacao).map((veiculo) => (
                 <div key={veiculo.name} className="space-y-1">
                   <div className="flex justify-between text-[11px] font-black uppercase text-slate-700">
                     <span>{veiculo.name}</span>
                     <span className={veiculo.ocupacao < 70 ? 'text-red-500' : 'text-emerald-600'}>
                       {veiculo.ocupacao}% Ocupado
                     </span>
                   </div>
                   <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                     <div 
                       className={`h-full ${veiculo.ocupacao < 70 ? 'bg-red-500' : 'bg-emerald-600'}`} 
                       style={{ width: `${veiculo.ocupacao}%` }}
                     />
                   </div>
                 </div>
               ))}
               <div className="mt-8 pt-4 border-t border-slate-200">
                 <p className="text-xs text-slate-500 leading-relaxed font-medium">
                   <strong>Análise de Custo:</strong> Identifica caminhões rodando com baixo aproveitamento cúbico ou de peso (<strong>Ar puro</strong>). A meta é consolidar rotas para veículos com menos de 70% de ocupação.
                 </p>
               </div>
             </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
