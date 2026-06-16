"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  AlertTriangle,
  Edit2,
  Trash2,
  CheckCircle2,
  Loader,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Ocorrencia {
  id: string;
  orderId?: string;
  carregamentoId?: string;
  titulo: string;
  descricao: string;
  tipo: string;
  status: string;
  prioridade: string;
  dataOcorrencia: string;
  clienteNome?: string;
  motorista?: string;
  veiculo?: string;
  resolucao?: string;
  dataResolucao?: string;
  resolvidoPor?: string;
  order?: { id: string; customerName: string; city: string };
  carregamento?: { id: string; grupoCarga: string };
  observacoes?: string;
}

interface Pedido {
  id: string;
  customerName: string;
  city: string;
  status: string;
}

interface Carregamento {
  id: string;
  grupoCarga: string;
  status: string;
  _count?: { pedidos: number };
}

export default function OcorrenciasPage() {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [pedidosDisponiveis, setPedidosDisponiveis] = useState<Pedido[]>([]);
  const [carregamentosDisponiveis, setCarregamentosDisponiveis] = useState<Carregamento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPedidos, setIsLoadingPedidos] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("TODOS");
  const [filterTipo, setFilterTipo] = useState("TODOS");

  // Modal states
  const [selectedOcorrencia, setSelectedOcorrencia] = useState<Ocorrencia | null>(null);
  const [isConfirmingResolve, setIsConfirmingResolve] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    orderId: "",
    carregamentoId: "",
    titulo: "",
    descricao: "",
    tipo: "ENTREGA",
    prioridade: "NORMAL",
    clienteNome: "",
    motorista: "",
    veiculo: "",
    observacoes: "",
  });

  useEffect(() => {
    fetchOcorrencias();
    fetchPedidosDisponiveis();
    fetchCarregamentosDisponiveis();
  }, [filterStatus, filterTipo]);

  async function fetchPedidosDisponiveis() {
    setIsLoadingPedidos(true);
    try {
      const res = await fetch("/api/ocorrencias/pedidos-disponiveis");
      if (res.ok) {
        const data = await res.json();
        setPedidosDisponiveis(data);
      }
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
    } finally {
      setIsLoadingPedidos(false);
    }
  }

  async function fetchCarregamentosDisponiveis() {
    try {
      const res = await fetch("/api/ocorrencias/carregamentos-disponiveis");
      if (res.ok) {
        const data = await res.json();
        setCarregamentosDisponiveis(data);
      }
    } catch (error) {
      console.error("Erro ao buscar carregamentos:", error);
    }
  }

  async function fetchOcorrencias() {
    setIsLoading(true);
    try {
      let url = "/api/ocorrencias";
      const params = new URLSearchParams();
      if (filterStatus !== "TODOS") params.append("status", filterStatus);
      if (filterTipo !== "TODOS") params.append("tipo", filterTipo);
      if (params.toString()) url += "?" + params.toString();

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setOcorrencias(data);
      }
    } catch (error) {
      console.error("Erro ao buscar ocorrências:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.titulo || !formData.descricao) {
      alert("Título e descrição são obrigatórios");
      return;
    }

    if (!formData.orderId && !formData.carregamentoId) {
      alert("Selecione um pedido ou uma carga");
      return;
    }

    try {
      const method = editingId ? "PATCH" : "POST";
      const url = editingId
        ? `/api/ocorrencias/${editingId}`
        : "/api/ocorrencias";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert(editingId ? "Ocorrência atualizada" : "Ocorrência criada");
        setShowForm(false);
        setEditingId(null);
        setFormData({
          orderId: "",
          carregamentoId: "",
          titulo: "",
          descricao: "",
          tipo: "ENTREGA",
          prioridade: "NORMAL",
          clienteNome: "",
          motorista: "",
          veiculo: "",
          observacoes: "",
        });
        fetchOcorrencias();
      } else {
        const error = await res.json();
        alert(error.error || "Erro ao salvar ocorrência");
      }
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro ao salvar ocorrência");
    }
  }

  async function handleResolve(id: string) {
    setIsConfirmingResolve(id);
  }

  async function confirmResolve() {
    const id = isConfirmingResolve;
    if (!id) return;

    try {
      const res = await fetch(`/api/ocorrencias/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RESOLVIDO" }),
      });

      if (res.ok) {
        setIsConfirmingResolve(null);
        setSelectedOcorrencia(null);
        fetchOcorrencias();
      }
    } catch (error) {
      console.error("Erro:", error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja deletar esta ocorrência?")) return;

    try {
      const res = await fetch(`/api/ocorrencias/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchOcorrencias();
      }
    } catch (error) {
      console.error("Erro:", error);
    }
  }

  function handleEdit(occ: Ocorrencia) {
    setFormData({
      orderId: occ.orderId || "",
      carregamentoId: occ.carregamentoId || "",
      titulo: occ.titulo,
      descricao: occ.descricao,
      tipo: occ.tipo,
      prioridade: occ.prioridade,
      clienteNome: occ.clienteNome || "",
      motorista: occ.motorista || "",
      veiculo: occ.veiculo || "",
      observacoes: occ.observacoes || "",
    });
    setEditingId(occ.id);
    setShowForm(true);
  }

  const statusColors: Record<string, string> = {
    PENDENTE: "bg-orange-50 border-orange-200 text-orange-700",
    RESOLVIDO: "bg-emerald-50 border-emerald-200 text-emerald-700",
    CANCELADO: "bg-slate-50 border-slate-200 text-slate-700",
  };

  const prioridadeColors: Record<string, string> = {
    BAIXA: "bg-blue-50 text-blue-700 border-blue-200",
    NORMAL: "bg-slate-50 text-slate-700 border-slate-200",
    ALTA: "bg-orange-50 text-orange-700 border-orange-200",
    CRITICA: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 border border-slate-200 rounded-md shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
            Ocorrências de Entrega
          </h1>
          <p className="text-sm text-slate-500">
            Registre e acompanhe problemas em entregas por pedido ou carga.
          </p>
        </div>
        <Button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            if (showForm) {
              setFormData({
                orderId: "",
                carregamentoId: "",
                titulo: "",
                descricao: "",
                tipo: "ENTREGA",
                prioridade: "NORMAL",
                clienteNome: "",
                motorista: "",
                veiculo: "",
                observacoes: "",
              });
            }
          }}
          className="bg-orange-600 hover:bg-orange-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          {showForm ? "Cancelar" : "Nova Ocorrência"}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="rounded-md border-orange-200 bg-orange-50 shadow-sm">
          <CardHeader className="bg-orange-100 border-b border-orange-200">
            <CardTitle className="text-orange-900">
              {editingId ? "Editar Ocorrência" : "Registrar Nova Ocorrência"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pedido */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    📦 Pedido 
                    <span className="text-slate-500 font-normal"> (em expedição/entrega)</span>
                  </Label>
                  <Select
                    value={formData.orderId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, orderId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um pedido..." />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingPedidos ? (
                        <div className="px-4 py-2 text-sm text-slate-500">⏳ Carregando pedidos...</div>
                      ) : pedidosDisponiveis.length === 0 ? (
                        <div className="px-4 py-2 text-sm text-slate-500">✗ Nenhum pedido disponível</div>
                      ) : (
                        pedidosDisponiveis.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.id} - {p.customerName} ({p.city})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Carga (Carregamento) */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    🚛 Carga/Carregamento
                    <span className="text-slate-500 font-normal"> (em andamento)</span>
                  </Label>
                  <Select
                    value={formData.carregamentoId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, carregamentoId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma carga..." />
                    </SelectTrigger>
                    <SelectContent>
                      {carregamentosDisponiveis.length === 0 ? (
                        <div className="px-4 py-2 text-sm text-slate-500">✗ Nenhuma carga disponível</div>
                      ) : (
                        carregamentosDisponiveis.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.grupoCarga} ({c._count?.pedidos || 0} pedido{c._count?.pedidos !== 1 ? 's' : ''})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tipo */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    🏷️ Tipo de Ocorrência *
                  </Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) =>
                      setFormData({ ...formData, tipo: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ENTREGA">📍 Entrega</SelectItem>
                      <SelectItem value="PRODUTO">📦 Produto</SelectItem>
                      <SelectItem value="CLIENTE">👤 Cliente</SelectItem>
                      <SelectItem value="VEICULO">🚗 Veículo</SelectItem>
                      <SelectItem value="MOTORISTA">👨‍💼 Motorista</SelectItem>
                      <SelectItem value="LOGISTICA">📊 Logística</SelectItem>
                      <SelectItem value="OUTRO">⚙️ Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Prioridade */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    ⚡ Prioridade *
                  </Label>
                  <Select
                    value={formData.prioridade}
                    onValueChange={(value) =>
                      setFormData({ ...formData, prioridade: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a prioridade..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BAIXA">🟢 Baixa</SelectItem>
                      <SelectItem value="NORMAL">🟡 Normal</SelectItem>
                      <SelectItem value="ALTA">🔴 Alta</SelectItem>
                      <SelectItem value="CRITICA">🔴🔴 Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Título */}
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-sm font-semibold">
                    ✏️ Título/Assunto *
                  </Label>
                  <Input
                    placeholder="Ex: Produto danificado, Atraso na entrega, Problema com cliente..."
                    value={formData.titulo}
                    onChange={(e) =>
                      setFormData({ ...formData, titulo: e.target.value })
                    }
                    required
                  />
                </div>

                {/* Descrição */}
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-sm font-semibold">
                    📝 Descrição Detalhada *
                  </Label>
                  <textarea
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    rows={3}
                    placeholder="Descreva exatamente o que aconteceu. Inclua detalhes, local, horário e qualquer informação relevante..."
                    value={formData.descricao}
                    onChange={(e) =>
                      setFormData({ ...formData, descricao: e.target.value })
                    }
                    required
                  />
                </div>

                {/* Cliente Nome */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    👤 Nome do Cliente
                  </Label>
                  <Input
                    placeholder="Ex: João Silva (se não selecionou acima)"
                    value={formData.clienteNome}
                    onChange={(e) =>
                      setFormData({ ...formData, clienteNome: e.target.value })
                    }
                  />
                </div>

                {/* Motorista */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    👨‍💼 Motorista Responsável
                  </Label>
                  <Input
                    placeholder="Ex: Carlos Santos"
                    value={formData.motorista}
                    onChange={(e) =>
                      setFormData({ ...formData, motorista: e.target.value })
                    }
                  />
                </div>

                {/* Veículo */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    🚗 Veículo/Placa
                  </Label>
                  <Input
                    placeholder="Ex: ABC-1234 ou ID do veículo"
                    value={formData.veiculo}
                    onChange={(e) =>
                      setFormData({ ...formData, veiculo: e.target.value })
                    }
                  />
                </div>

                {/* Observações */}
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-sm font-semibold">
                    💬 Observações Adicionais
                  </Label>
                  <textarea
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    rows={2}
                    placeholder="Informações extras, próximos passos, contatos importantes, etc..."
                    value={formData.observacoes}
                    onChange={(e) =>
                      setFormData({ ...formData, observacoes: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {editingId ? "Atualizar" : "Registrar"} Ocorrência
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <div className="flex gap-4 flex-wrap">
        <div>
          <Label className="text-xs text-slate-500">Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="PENDENTE">Pendente</SelectItem>
              <SelectItem value="RESOLVIDO">Resolvido</SelectItem>
              <SelectItem value="CANCELADO">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-slate-500">Tipo</Label>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="ENTREGA">Entrega</SelectItem>
              <SelectItem value="PRODUTO">Produto</SelectItem>
              <SelectItem value="CLIENTE">Cliente</SelectItem>
              <SelectItem value="VEICULO">Veículo</SelectItem>
              <SelectItem value="MOTORISTA">Motorista</SelectItem>
              <SelectItem value="LOGISTICA">Logística</SelectItem>
              <SelectItem value="OUTRO">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela */}
      <Card className="rounded-md border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50 border-b border-slate-200">
          <CardTitle className="text-slate-800 text-lg font-medium">
            Registros de Ocorrências
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Pedido/Carga</th>
                  <th className="px-4 py-3">Prioridade</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-6">
                      <Loader className="w-4 h-4 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : ocorrencias.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-slate-500">
                      Nenhuma ocorrência registrada.
                    </td>
                  </tr>
                ) : (
                  ocorrencias.map((occ) => (
                    <tr
                      key={occ.id}
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedOcorrencia(occ)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {new Date(occ.dataOcorrencia).toLocaleDateString(
                          "pt-BR"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 truncate max-w-[200px]">
                          {occ.titulo}
                        </div>
                        <div className="text-xs text-slate-400 truncate max-w-[200px]">
                          {occ.descricao}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{occ.tipo}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {occ.order && <span>{occ.order.id}</span>}
                        {occ.carregamento && (
                          <span>{occ.carregamento.grupoCarga}</span>
                        )}
                        {!occ.order && !occ.carregamento && "-"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={prioridadeColors[occ.prioridade]}
                        >
                          {occ.prioridade}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={statusColors[occ.status]}
                        >
                          {occ.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                        {occ.status === "PENDENTE" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-emerald-600"
                            onClick={() => handleResolve(occ.id)}
                            title="Marcar como resolvido"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-blue-600"
                          onClick={() => handleEdit(occ)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-red-600"
                          onClick={() => handleDelete(occ.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <Dialog open={!!selectedOcorrencia} onOpenChange={(open) => !open && setSelectedOcorrencia(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Detalhes da Ocorrência
            </DialogTitle>
          </DialogHeader>

          {selectedOcorrencia && (
            <div className="space-y-4">
              {/* Data e Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Data</p>
                  <p className="text-sm font-medium text-slate-800">
                    {new Date(selectedOcorrencia.dataOcorrencia).toLocaleDateString("pt-BR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Status</p>
                  <Badge
                    variant="outline"
                    className={statusColors[selectedOcorrencia.status]}
                  >
                    {selectedOcorrencia.status}
                  </Badge>
                </div>
              </div>

              {/* Tipo e Prioridade */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Tipo</p>
                  <Badge variant="outline">{selectedOcorrencia.tipo}</Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Prioridade</p>
                  <Badge
                    variant="outline"
                    className={prioridadeColors[selectedOcorrencia.prioridade]}
                  >
                    {selectedOcorrencia.prioridade}
                  </Badge>
                </div>
              </div>

              {/* Título */}
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Título</p>
                <p className="text-sm font-medium text-slate-800">{selectedOcorrencia.titulo}</p>
              </div>

              {/* Descrição */}
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Descrição</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-md border border-slate-200">
                  {selectedOcorrencia.descricao}
                </p>
              </div>

              {/* Pedido e Carga */}
              <div className="grid grid-cols-2 gap-4">
                {selectedOcorrencia.order && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Pedido</p>
                    <p className="text-sm font-mono text-slate-800">{selectedOcorrencia.order.id}</p>
                    <p className="text-xs text-slate-600">{selectedOcorrencia.order.customerName}</p>
                  </div>
                )}
                {selectedOcorrencia.carregamento && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Carga</p>
                    <p className="text-sm font-mono text-slate-800">{selectedOcorrencia.carregamento.grupoCarga}</p>
                  </div>
                )}
              </div>

              {/* Informações Adicionais */}
              {(selectedOcorrencia.clienteNome || selectedOcorrencia.motorista || selectedOcorrencia.veiculo) && (
                <div className="border-t border-slate-200 pt-4">
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-3">Informações Adicionais</p>
                  <div className="grid grid-cols-3 gap-4">
                    {selectedOcorrencia.clienteNome && (
                      <div>
                        <p className="text-xs text-slate-500">Cliente</p>
                        <p className="text-sm text-slate-800">{selectedOcorrencia.clienteNome}</p>
                      </div>
                    )}
                    {selectedOcorrencia.motorista && (
                      <div>
                        <p className="text-xs text-slate-500">Motorista</p>
                        <p className="text-sm text-slate-800">{selectedOcorrencia.motorista}</p>
                      </div>
                    )}
                    {selectedOcorrencia.veiculo && (
                      <div>
                        <p className="text-xs text-slate-500">Veículo</p>
                        <p className="text-sm text-slate-800">{selectedOcorrencia.veiculo}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Observações */}
              {selectedOcorrencia.observacoes && (
                <div className="border-t border-slate-200 pt-4">
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Observações</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-md border border-slate-200">
                    {selectedOcorrencia.observacoes}
                  </p>
                </div>
              )}

              {/* Resolução */}
              {selectedOcorrencia.status === "RESOLVIDO" && selectedOcorrencia.dataResolucao && (
                <div className="border-t border-slate-200 pt-4 bg-emerald-50 p-4 rounded-md border border-emerald-200">
                  <p className="text-xs text-emerald-600 uppercase font-semibold mb-2">Resolução</p>
                  <p className="text-sm text-slate-800">
                    <strong>Data:</strong> {new Date(selectedOcorrencia.dataResolucao).toLocaleDateString("pt-BR")}
                  </p>
                  {selectedOcorrencia.resolvidoPor && (
                    <p className="text-sm text-slate-800">
                      <strong>Resolvido por:</strong> {selectedOcorrencia.resolvidoPor}
                    </p>
                  )}
                  {selectedOcorrencia.resolucao && (
                    <p className="text-sm text-slate-800 mt-2">
                      <strong>Descrição:</strong> {selectedOcorrencia.resolucao}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2">
            {selectedOcorrencia?.status === "PENDENTE" && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => handleResolve(selectedOcorrencia.id)}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Marcar como Resolvido
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setSelectedOcorrencia(null)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!isConfirmingResolve} onOpenChange={(open) => !open && setIsConfirmingResolve(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Resolução</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja marcar esta ocorrência como resolvida?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmingResolve(null)}
            >
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={confirmResolve}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Confirmar Resolução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>


  );
}