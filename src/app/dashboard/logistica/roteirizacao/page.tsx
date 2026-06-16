"use client";

import React, { useState } from "react";
import { MapPin, Navigation, Clock, Truck, Play, Settings2, GripVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function RoteirizacaoPage() {
  const [routeStops, setRouteStops] = useState([
    { id: 1, type: "ORIGEM", address: "CD Principal - Rua da Indústria, 1000", client: "Base NovoCiclo", time: "08:00" },
    { id: 2, type: "ENTREGA", address: "Av. Paulista, 1500 - São Paulo, SP", client: "Supermercados Alfa", order: "PED-1024", weight: "1.200 kg" },
    { id: 3, type: "ENTREGA", address: "Rua Vergueiro, 321 - São Paulo, SP", client: "Mercado Silva", order: "PED-1026", weight: "450 kg" },
    { id: 4, type: "ENTREGA", address: "Av. Jabaquara, 890 - São Paulo, SP", client: "Atacadão SP", order: "PED-1029", weight: "2.100 kg" },
    { id: 5, type: "RETORNO", address: "CD Principal - Rua da Indústria, 1000", client: "Base NovoCiclo", time: "16:30" },
  ]);

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center bg-white p-4 border border-slate-200 rounded-md shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-emerald-600" />
            Roteirização
          </h1>
          <p className="text-sm text-slate-500">
            Planejamento inteligente e roteirização de cargas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-slate-300">
            <Settings2 className="w-4 h-4 mr-2" />
            Parâmetros
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Navigation className="w-4 h-4 mr-2" />
            Otimizar Rota
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel Esquerdo: Lista de Paradas */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="rounded-md border-slate-200 shadow-sm flex flex-col h-[600px]">
            <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
              <CardTitle className="text-slate-800 text-base font-medium flex justify-between items-center">
                Sequência de Entregas
                <Badge variant="secondary" className="bg-slate-200 text-slate-700">{routeStops.length - 2} Pedidos</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-auto space-y-3">
              {routeStops.map((stop, i) => (
                <div key={stop.id} className={`flex items-start gap-3 p-3 rounded border ${stop.type === 'ORIGEM' || stop.type === 'RETORNO' ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                  <div className="mt-1 cursor-grab">
                    <GripVertical className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{stop.type}</span>
                      {stop.order && <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">{stop.order}</span>}
                      {stop.time && <span className="text-xs text-slate-500 font-medium flex items-center gap-1"><Clock className="w-3 h-3"/> {stop.time}</span>}
                    </div>
                    <span className="text-sm font-bold text-slate-800">{stop.client}</span>
                    <span className="text-xs text-slate-500 line-clamp-1">{stop.address}</span>
                    {stop.weight && <span className="text-xs font-medium text-slate-600 mt-1">Peso: {stop.weight}</span>}
                  </div>
                </div>
              ))}
            </CardContent>
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <Button className="w-full bg-slate-800 hover:bg-slate-900 text-white">
                <Play className="w-4 h-4 mr-2" /> Start Viagem
              </Button>
            </div>
          </Card>
        </div>

        {/* Painel Direito: Mapa e Resumo */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card className="rounded-md border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Distância Total</p>
                  <p className="text-lg font-bold text-slate-800">42.5 km</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-md border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Tempo Estimado</p>
                  <p className="text-lg font-bold text-slate-800">8h 30m</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-md border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Carga Total</p>
                  <p className="text-lg font-bold text-slate-800">3.750 kg</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-md border-slate-200 shadow-sm overflow-hidden flex flex-col h-[490px]">
            <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
              <CardTitle className="text-slate-800 text-base font-medium">Visualização no Mapa</CardTitle>
            </CardHeader>
            <CardContent className="p-0 bg-slate-100 flex-1 relative flex items-center justify-center">
              {/* Fake Map Background */}
              <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
              <div className="text-center z-10">
                <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 font-medium">Integração com Google Maps / Mapbox</p>
                <p className="text-sm text-slate-400">O mapa será renderizado aqui.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}