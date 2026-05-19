"use client";

import { useState } from 'react';
import { useSystemData } from '@/server/store';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Vehicle } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit, Save, Truck } from 'lucide-react';

const emptyVehicle: Partial<Vehicle> = { plate: '', model: '', type: 'VAN', capacityKg: 1000, status: 'DISPONIVEL' } as const;

export default function ConfiguracoesPage() {
  const { vehicles, addVehicle, updateVehicle, deleteVehicle } = useSystemData();

  const [loading, setLoading] = useState(false);

  // Veículos
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleData, setVehicleData] = useState<Partial<Vehicle>>(emptyVehicle);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null);

  // ─── Veículos ───────────────────────────────────────────────
  const handleOpenVehicleModal = (v: Vehicle | null) => {
    setEditingVehicle(v);
    setVehicleData(v ? { ...v } : { ...emptyVehicle });
    setIsVehicleModalOpen(true);
  };

  const handleSaveVehicle = async () => {
    if (!vehicleData.plate || !vehicleData.model) { toast({ variant: "destructive", title: "Placa e Modelo obrigatórios" }); return; }
    setLoading(true);
    try {
      if (editingVehicle) {
        await updateVehicle(editingVehicle.id, { ...vehicleData } as Vehicle);
      } else {
        await addVehicle({ status: 'DISPONIVEL', ...vehicleData } as Vehicle);
      }
      toast({ title: "Veículo salvo." });
      setIsVehicleModalOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao salvar veículo", description: (error as Error)?.message });
    } finally {
      setLoading(false);
    }
  };

  // ─── Delete ─────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      await deleteVehicle(deleteTarget.id);
      toast({ title: "Veículo excluído com sucesso." });
    } catch (error) {
      const err = error as any;
      
      if (err?.status === 409 || err?.payload?.reason) {
        const reason = err?.payload?.reason || 'Este veículo está relacionado com outros dados do sistema';
        
        toast({ 
          variant: "destructive", 
          title: "Não é possível deletar", 
          description: reason
        });
      } else {
        toast({ 
          variant: "destructive", 
          title: "Erro ao excluir", 
          description: (error as Error)?.message || "Verifique se este veículo está sendo usado em outras partes do sistema"
        });
      }
    } finally {
      setDeleteTarget(null);
      setLoading(false);
    }
  };

  const confirmDelete = (id: string, name: string) => setDeleteTarget({ type: 'vehicle', id, name });

  const statusVehicleColor: Record<string, string> = {
    DISPONIVEL: 'bg-green-50 text-green-700 border-green-200',
    EM_ROTA: 'bg-blue-50 text-blue-700 border-blue-200',
    MANUTENCAO: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-primary uppercase tracking-tight">Configurações de Veículos</h1>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cadastro e gerenciamento de frota</p>
      </div>

      {/* VEÍCULOS */}
      <Card className="border-none shadow-md overflow-hidden">
        <CardHeader className="bg-white border-b flex flex-row items-center justify-between py-3">
          <div>
            <CardTitle className="text-sm font-black uppercase tracking-tight">Frota de Veículos</CardTitle>
            <p className="text-[9px] font-bold text-muted-foreground uppercase">Gestão da frota operacional</p>
          </div>
          <Button size="sm" className="gap-2 font-black uppercase text-xs" onClick={() => handleOpenVehicleModal(null)} disabled={loading}>
            <Plus className="w-4 h-4" /> Novo Veículo
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-[9px] font-black uppercase">Modelo</TableHead>
                <TableHead className="text-[9px] font-black uppercase">Placa</TableHead>
                <TableHead className="text-[9px] font-black uppercase">Tipo</TableHead>
                <TableHead className="text-[9px] font-black uppercase text-center">Cap. (kg)</TableHead>
                <TableHead className="text-[9px] font-black uppercase text-center">Status</TableHead>
                <TableHead className="w-20 text-right pr-4"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map(v => (
                <TableRow key={v.id} className="h-12 hover:bg-muted/20">
                  <TableCell className="text-[11px] font-black uppercase">{v.model}</TableCell>
                  <TableCell className="text-[10px] font-mono font-bold uppercase">{v.plate}</TableCell>
                  <TableCell className="text-[10px] text-muted-foreground uppercase">{v.type}</TableCell>
                  <TableCell className="text-center text-[10px] font-bold">{v.capacityKg?.toLocaleString()} kg</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={`text-[8px] font-black uppercase ${statusVehicleColor[v.status] || ''}`}>
                      {v.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenVehicleModal(v)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => confirmDelete(v.id, v.model)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* MODAL VEÍCULO */}
      <Dialog open={isVehicleModalOpen} onOpenChange={setIsVehicleModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-black uppercase">{editingVehicle ? 'Editar' : 'Novo'} Veículo</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-muted-foreground">Placa *</label>
                <Input placeholder="ABC-1234" value={vehicleData.plate || ''}
                  onChange={e => setVehicleData({ ...vehicleData, plate: e.target.value })} className="h-9 text-xs" disabled={loading} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-muted-foreground">Modelo *</label>
                <Input placeholder="Ex: VW Delivery" value={vehicleData.model || ''}
                  onChange={e => setVehicleData({ ...vehicleData, model: e.target.value })} className="h-9 text-xs" disabled={loading} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-muted-foreground">Tipo</label>
                <Select value={vehicleData.type || 'VAN'} onValueChange={val => setVehicleData({ ...vehicleData, type: val as any })} disabled={loading}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VAN">Van / Utilitário</SelectItem>
                    <SelectItem value="CAMINHAO">Caminhão</SelectItem>
                    <SelectItem value="CARRO">Carro Comercial</SelectItem>
                    <SelectItem value="MOTO">Moto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-muted-foreground">Capacidade (kg)</label>
                <Input type="number" value={vehicleData.capacityKg || ''}
                  onChange={e => setVehicleData({ ...vehicleData, capacityKg: parseInt(e.target.value) || 0 })} className="h-9 text-xs" disabled={loading} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-muted-foreground">Status</label>
              <Select value={vehicleData.status || 'DISPONIVEL'} onValueChange={val => setVehicleData({ ...vehicleData, status: val as any })} disabled={loading}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DISPONIVEL">Disponível</SelectItem>
                  <SelectItem value="EM_ROTA">Em Rota</SelectItem>
                  <SelectItem value="MANUTENCAO">Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsVehicleModalOpen(false)} className="font-bold text-xs uppercase" disabled={loading}>Cancelar</Button>
            <Button onClick={handleSaveVehicle} className="gap-2 font-black text-xs uppercase" disabled={loading}><Save className="w-4 h-4" /> Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja excluir o veículo <strong>{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleConfirmDelete} disabled={loading}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}