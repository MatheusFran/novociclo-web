"use client";

import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exportToCSV } from "@/lib/export-csv";

const conversaoCRM = [
  { semana: "Semana 1", leads: 400, propostas: 240, vendas: 120 },
  { semana: "Semana 2", leads: 300, propostas: 139, vendas: 80 },
  { semana: "Semana 3", leads: 200, propostas: 980, vendas: 200 },
  { semana: "Semana 4", leads: 278, propostas: 390, vendas: 150 },
];

const clientesInativos = [
  { nome: "Distribuidora Master SA", ultimaCompra: "12/03/2026", diasInativo: 88, potencialMkt: "R$ 45.000/ano", telefone: "(11) 98888-0000" },
  { nome: "Mercadinho São José", ultimaCompra: "01/04/2026", diasInativo: 69, potencialMkt: "R$ 12.000/ano", telefone: "(21) 97777-1111" },
  { nome: "Supermercados Alfa", ultimaCompra: "15/04/2026", diasInativo: 55, potencialMkt: "R$ 150.000/ano", telefone: "(41) 99999-2222" },
];

export default function ComercialBiPage() {

  useEffect(() => {
    const btn = document.getElementById('export-csv-btn');
    if (btn) {
      const handleExport = () => {
        exportToCSV(conversaoCRM, "relatorio-crm-vendas");
      };
      btn.addEventListener('click', handleExport);
      return () => btn.removeEventListener('click', handleExport);
    }
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Funil CRM */}
        <Card className="border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
            <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-800">Evolução do Funil (CRM)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-6 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={conversaoCRM}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="semana" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }} />
                <Line type="monotone" dataKey="leads" name="Leads Frios" stroke="#94a3b8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="propostas" name="Propostas" stroke="#fbbf24" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="vendas" name="Conversão (Venda)" stroke="#10b981" strokeWidth={4} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Churn Rate (Perda de base) */}
        <Card className="border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
            <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-800">Alerta de Inatividade (Risco de Churn)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <div className="overflow-auto max-h-[350px]">
               <Table>
                 <TableHeader className="bg-muted bg-slate-100/50 sticky top-0">
                   <TableRow>
                     <TableHead className="text-[9px] font-black uppercase text-slate-500">Cliente</TableHead>
                     <TableHead className="text-[9px] font-black uppercase text-slate-500 text-center">Dias Inativo</TableHead>
                     <TableHead className="text-[9px] font-black uppercase text-slate-500 text-right">Potencial Perdido</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {clientesInativos.map((c, i) => (
                     <TableRow key={i} className="hover:bg-slate-50">
                       <TableCell className="text-xs font-bold py-3">
                         <p className="text-slate-800">{c.nome}</p>
                         <p className="text-[9px] font-medium text-slate-500 mt-0.5">{c.telefone} • Última: {c.ultimaCompra}</p>
                       </TableCell>
                       <TableCell className="text-center py-3">
                         <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-black">{c.diasInativo} dias</span>
                       </TableCell>
                       <TableCell className="text-right text-xs font-black text-slate-700 py-3">{c.potencialMkt}</TableCell>
                     </TableRow>
                   ))}
                  </TableBody>
               </Table>
             </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
