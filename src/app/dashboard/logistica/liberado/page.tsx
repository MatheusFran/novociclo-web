"use client"

import React from 'react';
import { useSystemData } from '@/server/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  Truck, Eye, Printer, PlayCircle, CheckSquare, X, AlertTriangle
} from 'lucide-react';
import { useState, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const STATUS_COLORS: Record<string, string> = {
  AGUARDANDO_FATURAMENTO: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  FATURADO: 'bg-green-100 text-green-800 border-green-200',
  ENTREGA: 'bg-purple-100 text-purple-800 border-purple-200',
  ENTREGUE: 'bg-zinc-100 text-zinc-600 border-zinc-200',
};

const STATUS_LABELS: Record<string, string> = {
  AGUARDANDO_FATURAMENTO: 'Ag. Faturamento',
  FATURADO: 'Lib. Entrega',
  ENTREGA: 'Em Entrega',
  ENTREGUE: 'Entregue',
};

function calcSacos(order: any) {
  return order.items.reduce((s: number, i: any) => s + i.quantity, 0);
}

function calcPeso(order: any) {
  return order.totalWeight || 0;
}

function formatDate(date: string | undefined, withTime = false) {
  if (!date) return '---';
  try {
    return format(new Date(date), withTime ? 'dd/MM/yy HH:mm' : 'dd/MM/yy');
  } catch {
    return '---';
  }
}

export default function LiberadoPage() {
  const router = useRouter();
  const {
    orders, products, vehicles,
    updateOrderStatus, isReady,
  } = useSystemData();

  const [isIniciarEntregaCargaOpen, setIsIniciarEntregaCargaOpen] = useState(false);
  const [iniciarEntregaCarga, setIniciarEntregaCarga] = useState<string | null>(null);
  const [dataIniciarEntregaCarga, setDataIniciarEntregaCarga] = useState('');

  const [isFinalizarEntregaCargaOpen, setIsFinalizarEntregaCargaOpen] = useState(false);
  const [finalizarEntregaCarga, setFinalizarEntregaCarga] = useState<string | null>(null);
  const [dataFinalizarEntregaCarga, setDataFinalizarEntregaCarga] = useState('');

  const [isRomaneioOpen, setIsRomaneioOpen] = useState(false);
  const [romaneioGrupo, setRomaneioGrupo] = useState<string | null>(null);
  const romaneioRef = useRef<HTMLDivElement>(null);

  const [isDeletarGrupoOpen, setIsDeletarGrupoOpen] = useState(false);
  const [deletarGrupo, setDeletarGrupo] = useState<string | null>(null);

  // Cargas montadas
  const liberadoOrders = useMemo(() =>
    orders.filter(o => ['AGUARDANDO_FATURAMENTO', 'FATURADO', 'ENTREGA'].includes(o.status)), [orders]);

  const cargasMontadas = useMemo(() => {
    const cargasOrders = liberadoOrders.filter((o: any) => o.grupoCarga);
    const grupos: Record<string, any[]> = {};
    cargasOrders.forEach(o => {
      const g = (o as any).grupoCarga;
      if (!grupos[g]) grupos[g] = [];
      grupos[g].push(o);
    });
    return Object.entries(grupos).map(([grupo, pedidos]) => ({
      grupo,
      pedidos,
      tipoCarga: (pedidos[0] as any).tipoCarga,
      dataCarregamento: (pedidos[0] as any).dataCarregamento,
      scheduledDeliveryDate: (pedidos[0] as any).scheduledDeliveryDate,
      vehicleId: (pedidos[0] as any).assignedVehicleId,
      totalSacos: pedidos.reduce((a, o) => a + calcSacos(o), 0),
      totalPeso: pedidos.reduce((a, o) => a + calcPeso(o), 0),
      statusGeral: pedidos.every(o => o.status === 'ENTREGUE')
        ? 'ENTREGUE'
        : pedidos.some(o => o.status === 'ENTREGA')
          ? 'ENTREGA'
          : pedidos.some(o => o.status === 'FATURADO')
            ? 'FATURADO'
            : 'AGUARDANDO_FATURAMENTO',
    }));
  }, [liberadoOrders]);

  const handleIniciarEntregaCarga = (grupo: string) => {
    setIniciarEntregaCarga(grupo);
    setDataIniciarEntregaCarga('');
    setIsIniciarEntregaCargaOpen(true);
  };

  const confirmarIniciarEntregaCarga = async () => {
    if (!dataIniciarEntregaCarga || !iniciarEntregaCarga) {
      toast({ variant: 'destructive', title: 'Data obrigatória', description: 'Selecione a data de saída para iniciar a entrega.' });
      return;
    }
    try {
      const departureTime = new Date(dataIniciarEntregaCarga).toISOString();
      const cargaPedidos = cargasMontadas.find(c => c.grupo === iniciarEntregaCarga)?.pedidos || [];
      cargaPedidos.forEach(o => {
        updateOrderStatus(o.id, 'ENTREGA', { departureTime } as any);
      });
      toast({ title: 'Entrega Iniciada', description: `Carga ${iniciarEntregaCarga} em rota.` });
      setIsIniciarEntregaCargaOpen(false);
      setDataIniciarEntregaCarga('');
      setIniciarEntregaCarga(null);
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao iniciar entrega.' });
    }
  };

  const handleFinalizarEntregaCarga = (grupo: string) => {
    setFinalizarEntregaCarga(grupo);
    setDataFinalizarEntregaCarga('');
    setIsFinalizarEntregaCargaOpen(true);
  };

  const confirmarFinalizarEntregaCarga = async () => {
    if (!dataFinalizarEntregaCarga || !finalizarEntregaCarga) {
      toast({ variant: 'destructive', title: 'Data obrigatória', description: 'Selecione a data de finalização.' });
      return;
    }
    try {
      const cargaPedidos = cargasMontadas.find(c => c.grupo === finalizarEntregaCarga)?.pedidos || [];
      cargaPedidos.forEach(o => {
        if (o.status === 'ENTREGA') {
          updateOrderStatus(o.id, 'ENTREGUE', { 
            deliveryConfirmedAt: new Date(dataFinalizarEntregaCarga).toISOString() 
          } as any);
        }
      });
      toast({ title: 'Entrega Finalizada', description: `Carga ${finalizarEntregaCarga} entregue.` });
      setIsFinalizarEntregaCargaOpen(false);
      setDataFinalizarEntregaCarga('');
      setFinalizarEntregaCarga(null);
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao finalizar entrega.' });
    }
  };

  const abrirRomaneio = (grupo: string) => {
    setRomaneioGrupo(grupo);
    setIsRomaneioOpen(true);
  };

  const handleDeletarGrupo = (grupo: string) => {
    setDeletarGrupo(grupo);
    setIsDeletarGrupoOpen(true);
  };

  const confirmarDeletarGrupo = async () => {
    if (!deletarGrupo) return;
    try {
      const cargaPedidos = cargasMontadas.find(c => c.grupo === deletarGrupo)?.pedidos || [];
      cargaPedidos.forEach(o => {
        updateOrderStatus(o.id, 'PRONTO_LOGISTICA', { 
          grupoCarga: '',
          tipoCarga: '',
          dataCarregamento: '',
          assignedVehicleId: '',
          scheduledDeliveryDate: '',
        } as any);
      });
      toast({ title: 'Carga Cancelada', description: `Grupo ${deletarGrupo} foi cancelado. Pedidos retornaram à montagem.` });
      setIsDeletarGrupoOpen(false);
      setDeletarGrupo(null);
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao cancelar carga.' });
    }
  };

  const romaneioData = useMemo(() => {
    if (!romaneioGrupo) return [];
    return cargasMontadas.find(c => c.grupo === romaneioGrupo)?.pedidos || [];
  }, [cargasMontadas, romaneioGrupo]);

  const consolidatedRomaneioData = useMemo(() => {
    if (romaneioData.length === 0) return [];
    
    const productMap: Record<string, { name: string; totalQuantity: number; totalWeight: number; productId: string }> = {};
    
    romaneioData.forEach(order => {
      order.items.forEach((item: any) => {
        const prod = products.find((p: any) => p.id === item.productId);
        const prodName = prod?.name || item.productId;
        
        if (!productMap[prodName]) {
          productMap[prodName] = {
            name: prodName,
            totalQuantity: 0,
            totalWeight: 0,
            productId: item.productId,
          };
        }
        
        productMap[prodName].totalQuantity += item.quantity;
        productMap[prodName].totalWeight += (prod?.weight || 0) * item.quantity;
      });
    });
    
    return Object.values(productMap).sort((a, b) => a.name.localeCompare(b.name));
  }, [romaneioData, products]);



  if (!isReady) return null;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-primary uppercase tracking-tight">
            Cargas Liberadas
          </h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
            Gerenciamento de cargas em transporte
          </p>
        </div>
        <span className="text-[9px] font-bold text-muted-foreground uppercase">
          {cargasMontadas.length} carga(s)
        </span>
      </div>

      {/* Cargas */}
      {cargasMontadas.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-xs font-bold uppercase">
          Nenhuma carga montada ainda.
        </div>
      ) : (
        <div className="space-y-4">
          {cargasMontadas
            .map(carga => {
              const vehicle = vehicles.find(v => v.id === carga.vehicleId);
              return (
                <div key={carga.grupo} className="border rounded-xl overflow-hidden">
                  {/* Cabeçalho da carga */}
                  <div className="bg-muted/40 px-4 py-3 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-black">{carga.grupo}</span>
                      <Badge variant="outline" className={`${STATUS_COLORS[carga.statusGeral] || 'bg-muted'} text-[8px] font-black uppercase px-2 h-5`}>
                        {STATUS_LABELS[carga.statusGeral] || carga.statusGeral}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1.5 font-black text-[9px] uppercase"
                        onClick={() => abrirRomaneio(carga.grupo)}>
                        <Printer className="w-3.5 h-3.5" /> Abrir Romaneio
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      {carga.statusGeral === 'FATURADO' && (
                        <Button
                          size="sm"
                          className="h-8 gap-1.5 font-black text-[9px] uppercase bg-green-500 hover:bg-green-400 text-white"
                          onClick={(e) => { e.stopPropagation(); handleIniciarEntregaCarga(carga.grupo); }}>
                          <PlayCircle className="w-3.5 h-3.5" /> Iniciar Entrega
                        </Button>
                      )}
                      {carga.statusGeral === 'ENTREGA' && (
                        <Button
                          size="sm"
                          className="h-8 gap-1.5 font-black text-[9px] uppercase bg-blue-500 hover:bg-blue-400 text-white"
                          onClick={(e) => { e.stopPropagation(); handleFinalizarEntregaCarga(carga.grupo); }}>
                          <CheckSquare className="w-3.5 h-3.5" /> Finalizar Entrega
                        </Button>
                      )}
                      {carga.statusGeral !== 'ENTREGA' && carga.statusGeral !== 'ENTREGUE' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 gap-1.5 font-black text-[9px] uppercase"
                          onClick={(e) => { e.stopPropagation(); handleDeletarGrupo(carga.grupo); }}>
                          <X className="w-3.5 h-3.5" /> Cancelar
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Info da carga */}
                  <div className="bg-muted/10 px-4 py-2 flex items-center gap-6 text-[10px] font-bold text-muted-foreground flex-wrap">
                    <span><span className="font-black text-foreground">{carga.tipoCarga}</span></span>
                    <span>Carregamento: <span className="font-black text-foreground">{formatDate(carga.dataCarregamento, true)}</span></span>
                    <span>Entrega: <span className="font-black text-foreground">{formatDate(carga.scheduledDeliveryDate)}</span></span>
                    <span>Veículo: <span className="font-black text-foreground">{vehicle?.model || '—'} {vehicle?.plate ? `(${vehicle.plate})` : ''}</span></span>
                    <span>{carga.pedidos.length} pedidos · {carga.totalSacos} sacos · {carga.totalPeso.toFixed(2)} kg</span>
                  </div>

                  {/* Pedidos da carga */}
                  <div className="divide-y">
                    {carga.pedidos.map(o => (
                      <div key={o.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-[11px] font-black text-primary w-28">{o.id}</span>
                          <span className="text-[11px] font-black uppercase">{o.customerName}</span>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase hidden md:block">{o.city}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-bold text-muted-foreground">{calcSacos(o)} un · {calcPeso(o).toFixed(2)} kg</span>
                          <Badge variant="outline" className={`${STATUS_COLORS[o.status] || 'bg-muted'} text-[8px] font-black uppercase px-2 h-5`}>
                            {STATUS_LABELS[o.status] || o.status}
                          </Badge>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                            onClick={() => router.push(`/dashboard/vendas/pedidos/${o.id}`)}>
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* ══ MODAL: INICIAR ENTREGA ══ */}
      <Dialog open={isIniciarEntregaCargaOpen} onOpenChange={setIsIniciarEntregaCargaOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black uppercase flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-green-500" /> Iniciar Entrega de Carga
            </DialogTitle>
            <DialogDescription className="text-[10px] uppercase font-bold">
              Carga {iniciarEntregaCarga} · Defina data de saída
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase">Data/Hora Saída *</label>
              <Input
                type="datetime-local"
                className="h-9 text-xs"
                value={dataIniciarEntregaCarga}
                onChange={e => setDataIniciarEntregaCarga(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsIniciarEntregaCargaOpen(false)} className="font-bold text-xs uppercase">Cancelar</Button>
            <Button onClick={confirmarIniciarEntregaCarga} className="font-black text-xs uppercase gap-2 bg-green-500 hover:bg-green-400">
              <PlayCircle className="w-3.5 h-3.5" /> Iniciar Entrega
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ MODAL: FINALIZAR ENTREGA ══ */}
      <Dialog open={isFinalizarEntregaCargaOpen} onOpenChange={setIsFinalizarEntregaCargaOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black uppercase flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-500" /> Finalizar Entrega de Carga
            </DialogTitle>
            <DialogDescription className="text-[10px] uppercase font-bold">
              Carga {finalizarEntregaCarga} · Defina data de finalização
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase">Data/Hora Finalização *</label>
              <Input
                type="datetime-local"
                className="h-9 text-xs"
                value={dataFinalizarEntregaCarga}
                onChange={e => setDataFinalizarEntregaCarga(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsFinalizarEntregaCargaOpen(false)} className="font-bold text-xs uppercase">Cancelar</Button>
            <Button onClick={confirmarFinalizarEntregaCarga} className="font-black text-xs uppercase gap-2 bg-blue-500 hover:bg-blue-400 text-white">
              <CheckSquare className="w-3.5 h-3.5" /> Finalizar Entrega
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ MODAL: ROMANEIO ══ */}
      <Dialog open={isRomaneioOpen} onOpenChange={setIsRomaneioOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">Romaneio de Carga</DialogTitle>
          <div className="bg-white flex flex-col max-h-[90vh]">
            <div className="bg-primary px-6 py-4 flex items-center justify-between shrink-0">
              <div>
                <p className="text-[9px] font-black uppercase text-white/60">Romaneio</p>
                <h2 className="text-lg font-black uppercase text-white tracking-tight">{romaneioGrupo}</h2>
              </div>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => setIsRomaneioOpen(false)}>✕</Button>
            </div>
            <div ref={romaneioRef} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h3 className="text-sm font-black uppercase mb-3">Resumo de Produtos</h3>
                <div className="space-y-1 border rounded-lg divide-y">
                  {consolidatedRomaneioData.map((item) => (
                    <div key={item.productId} className="px-4 py-2.5 flex justify-between items-center hover:bg-muted/50">
                      <span className="text-[11px] font-black">{item.name}</span>
                      <div className="flex gap-4">
                        <span className="text-[10px] font-bold text-muted-foreground">{item.totalQuantity} un</span>
                        <span className="text-[10px] font-bold text-muted-foreground">{item.totalWeight.toFixed(2)} kg</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black uppercase mb-3">Pedidos</h3>
                <div className="space-y-3">
                  {romaneioData.map((order) => (
                    <div key={order.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-mono text-sm font-black text-primary">{order.id}</p>
                          <p className="text-[11px] font-bold text-muted-foreground">{order.customerName} - {order.city}</p>
                        </div>
                        <Badge variant="outline">{calcSacos(order)} un</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══ MODAL: DELETAR GRUPO ══ */}
      <Dialog open={isDeletarGrupoOpen} onOpenChange={setIsDeletarGrupoOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black uppercase flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-4 h-4" /> Cancelar Carga
            </DialogTitle>
            <DialogDescription className="text-[10px] uppercase font-bold">
              Tem certeza que deseja cancelar o grupo {deletarGrupo}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm font-bold text-muted-foreground">
              Esta ação irá:
            </p>
            <ul className="text-[10px] font-bold text-muted-foreground space-y-1 list-disc list-inside">
              <li>Retornar todos os pedidos à montagem</li>
              <li>Liberar o veículo</li>
              <li>Desfazer todas as associações de grupo</li>
            </ul>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-[10px] font-bold text-red-600">⚠️ Esta ação não pode ser desfeita!</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeletarGrupoOpen(false)} className="font-bold text-xs uppercase">Manter Carga</Button>
            <Button onClick={confirmarDeletarGrupo} variant="destructive" className="font-black text-xs uppercase gap-2">
              <X className="w-3.5 h-3.5" /> Cancelar Carga
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}
