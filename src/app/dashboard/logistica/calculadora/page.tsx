"use client";

import React from "react";
import { Calculator, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CalculadoraFretePage() {
  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center bg-white p-4 border border-slate-200 rounded-md shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-indigo-600" />
            Simulador de Frete
          </h1>
          <p className="text-sm text-slate-500">
            Compare os custos de entrega com Frota Própria vs Transporte Terceirizado.
          </p>
        </div>
      </div>

      <Card className="rounded-md border-yellow-200 bg-yellow-50 shadow-sm">
        <CardContent className="p-6">
          <div className="flex gap-4 items-start">
            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-yellow-900">Página em Desenvolvimento</h2>
              <p className="text-sm text-yellow-800">
                A funcionalidade da Calculadora de Frete está em desenvolvimento e será disponibilizada em breve.
              </p>
              <p className="text-sm text-yellow-700 mt-3">
                Esta página permitirá comparar custos entre:
              </p>
              <ul className="text-sm text-yellow-800 list-disc list-inside space-y-1 mt-2">
                <li>Entrega com Frota Própria</li>
                <li>Entrega com Transporte Terceirizado</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}