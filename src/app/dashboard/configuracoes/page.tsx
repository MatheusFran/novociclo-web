"use client";

import { useState, useEffect } from 'react';
import { useSystemData } from '@/server/store';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { PriceTable, Customer, Vehicle, Product, Member } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { Plus, Trash2, Edit, Save, User, Users, Truck, Package, DollarSign, Download } from 'lucide-react';

const emptyCustomer = { name: '', cpfcnpj: '', IE: '', phone: '', email: '', address: '', city: '' };
const emptyVehicle: Partial<Vehicle> = { plate: '', model: '', type: 'VAN', capacityKg: 1000, status: 'DISPONIVEL' } as const;

const emptyProduct: Partial<Product> = {
  id: '', name: '', category: '', uom: 'un', price: 0, avgCost: 0,
  weight: 0, stock: 0, isRawMaterial: false, bom: [], stockDetails: []
};

export default function ConfiguracoesPage() {
  const { priceTables, products, customers, vehicles, members, addProduct, updateProduct, deleteProduct, addCustomer, updateCustomer, deleteCustomer, addVehicle, updateVehicle, deleteVehicle, addPriceTable, updatePriceTable, deletePriceTable, addMember, updateMember, deleteMember } = useSystemData();

  const [loading, setLoading] = useState(false);

  // Tabelas de Preço
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<PriceTable | null>(null);
  const [tableName, setTableName] = useState('');
  const [prices, setPrices] = useState<Record<string, number>>({});

  // Clientes
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerData, setCustomerData] = useState<Omit<Customer, 'id'>>(emptyCustomer);

  // Members
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [memberData, setMemberData] = useState<Omit<Member, 'id' | 'createdAt' | 'updatedAt'>>({ name: '', funcao: '', active: true });

  // Veículos
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleData, setVehicleData] = useState<Partial<Vehicle>>(emptyVehicle);

  // Produtos
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productData, setProductData] = useState<Partial<Product>>(emptyProduct);


  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null);

  // ─── Tabela de Preços ───────────────────────────────────────
  const handleOpenPriceModal = (table: PriceTable | null) => {
    setEditingTable(table);
    if (table) {
      setTableName(table.name);
      setPrices(table.prices);
    } else {
      setTableName('');
      const init: Record<string, number> = {};
      products.forEach(p => init[p.id] = p.price);
      setPrices(init);
    }
    setIsPriceModalOpen(true);
  };

  const handleSavePriceTable = async () => {
    if (!tableName) { toast({ variant: "destructive", title: "Nome obrigatório" }); return; }
    setLoading(true);
    try {
      if (editingTable) {
        await updatePriceTable(editingTable.id, { name: tableName, prices });
      } else {
        await addPriceTable({ id: `PT-${Date.now()}`, name: tableName, prices });
      }
      toast({ title: "Tabela salva." });
      setIsPriceModalOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao salvar tabela", description: (error as Error)?.message });
    } finally {
      setLoading(false);
    }
  };

  // ─── Clientes ───────────────────────────────────────────────
  const [importPreview, setImportPreview] = useState<any[]>([]);

  const handleImportCustomers = async () => {
    setLoading(true);
    let success = 0;
    let errors = 0;

    try {
      for (const row of importPreview) {
        try {
          await addCustomer({
            name: String(row.name).trim(),
            cpfcnpj: row.cpfcnpj ? String(row.cpfcnpj).trim() : null,
            IE: row.IE ? String(row.IE).trim() : null,
            phone: row.phone ? String(row.phone).trim() : null,
            email: row.email ? String(row.email).trim() : null,
            address: row.address ? String(row.address).trim() : null,
            city: row.city ? String(row.city).trim() : null,
          });
          success++;
        } catch {
          errors++;
        }
      }

      toast({ title: `${success} importado(s)${errors > 0 ? `, ${errors} erro(s)` : ''}` });
      setImportPreview([]);
      setIsCustomerModalOpen(false);
    } finally {
      setLoading(false);
    }
  };
  const handleOpenCustomerModal = (c: Customer | null) => {
    setEditingCustomer(c);
    setImportPreview([]); // <- adicionar
    setCustomerData(c ? {
      name: c.name,
      cpfcnpj: c.cpfcnpj ?? '',
      IE: c.IE ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
      address: c.address ?? '',
      city: c.city ?? ''
    } : emptyCustomer);
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomer = async () => {
    if (!customerData.name) { toast({ variant: "destructive", title: "Nome é obrigatório" }); return; }
    setLoading(true);
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, { ...customerData });
      } else {
        await addCustomer({ ...customerData });
      }
      toast({ title: "Cliente salvo." });
      setIsCustomerModalOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao salvar cliente", description: (error as Error)?.message });
    } finally {
      setLoading(false);
    }
  };

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

  // ─── Produtos ───────────────────────────────────────────────
  const handleOpenProductModal = (p: Product | null) => {
    setEditingProduct(p);
    setProductData(p ? { ...p } : { ...emptyProduct });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!productData.id || !productData.name || !productData.category) {
      toast({ variant: "destructive", title: "SKU, Nome e Categoria são obrigatórios" });
      return;
    }
    setLoading(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, { ...productData } as Partial<Product>);
      } else {
        if (products.find(p => p.id === productData.id)) { toast({ variant: "destructive", title: "SKU já existe" }); return; }

        // Sanitizar valores numéricos
        const sanitizeFloat = (value: any) => {
          const num = Number(value);
          return isNaN(num) || value === '' ? 0 : num;
        };

        const sanitizeInt = (value: any) => {
          const num = parseInt(String(value), 10);
          return isNaN(num) ? 0 : num;
        };

        const newProduct = {
          id: String(productData.id).trim(),
          name: String(productData.name).trim(),
          category: String(productData.category).trim(),
          uom: String(productData.uom || 'un').trim(),
          price: sanitizeFloat(productData.price),
          weight: sanitizeFloat(productData.weight),
          stock: 0,
          isRawMaterial: Boolean(productData.isRawMaterial),
        } as Product;
        console.log('Enviando produto:', newProduct);
        await addProduct(newProduct);
      }
      toast({ title: "Produto salvo." });
      setIsProductModalOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao salvar produto", description: (error as Error)?.message });
    } finally {
      setLoading(false);
    }
  };


  //
  const handleOpenTeamModal = (member: Member | null) => {
    setEditingMember(member);
    setMemberData(member ? {
      name: member.name,
      funcao: member.funcao ?? '',
      active: member.active,
    } : { name: '', funcao: '', active: true });
    setIsMemberModalOpen(true);
  };

  const handleSaveTeamMember = async () => {
    if (!memberData.name) {
      toast({ variant: 'destructive', title: 'Nome é obrigatórios' });
      return;
    }
    setLoading(true);
    try {
      if (editingMember) {
        await updateMember(editingMember.id, { ...memberData });
      } else {
        await addMember({ ...memberData });
      }
      toast({ title: 'Membro salvo.' });
      setIsMemberModalOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao salvar membro', description: (error as Error)?.message });
    } finally {
      setLoading(false);
    }
  };

  // ─── Delete ─────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      switch (deleteTarget.type) {
        case 'priceTable': await deletePriceTable(deleteTarget.id); break;
        case 'customer': await deleteCustomer(deleteTarget.id); break;
        case 'vehicle': await deleteVehicle(deleteTarget.id); break;
        case 'product': await deleteProduct(deleteTarget.id); break;
        case 'member': await deleteMember(deleteTarget.id); break;
      }
      toast({ title: "Registro excluído." });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao excluir", description: (error as Error)?.message });
    } finally {
      setDeleteTarget(null);
      setLoading(false);
    }
  };

  const confirmDelete = (type: string, id: string, name: string) => setDeleteTarget({ type, id, name });

  const statusVehicleColor: Record<string, string> = {
    DISPONIVEL: 'bg-green-50 text-green-700 border-green-200',
    EM_ROTA: 'bg-blue-50 text-blue-700 border-blue-200',
    MANUTENCAO: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-primary uppercase tracking-tight">Configurações do Sistema</h1>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cadastros, tabelas e parâmetros operacionais</p>
      </div>

      <Tabs defaultValue="produtos" className="w-full">
        <TabsList className="grid w-full max-w-[900px] grid-cols-5">
          <TabsTrigger value="produtos" className="gap-1.5 font-bold text-xs uppercase"><Package className="w-3.5 h-3.5" /> Produtos</TabsTrigger>
          <TabsTrigger value="precos" className="gap-1.5 font-bold text-xs uppercase"><DollarSign className="w-3.5 h-3.5" /> Preços</TabsTrigger>
          <TabsTrigger value="clientes" className="gap-1.5 font-bold text-xs uppercase"><User className="w-3.5 h-3.5" /> Clientes</TabsTrigger>
          <TabsTrigger value="equipe" className="gap-1.5 font-bold text-xs uppercase"><Users className="w-3.5 h-3.5" /> Equipe</TabsTrigger>
          <TabsTrigger value="veiculos" className="gap-1.5 font-bold text-xs uppercase"><Truck className="w-3.5 h-3.5" /> Veículos</TabsTrigger>
        </TabsList>

        {/* PRODUTOS */}
        <TabsContent value="produtos" className="mt-6">
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="bg-white border-b flex flex-row items-center justify-between py-3">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-tight">Produtos & Insumos</CardTitle>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">SKU, peso, custo e preço de venda</p>
              </div>
              <Button size="sm" className="gap-2 font-black uppercase text-xs" onClick={() => handleOpenProductModal(null)} disabled={loading}>
                <Plus className="w-4 h-4" /> Novo Produto
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-[9px] font-black uppercase">SKU</TableHead>
                    <TableHead className="text-[9px] font-black uppercase">Nome</TableHead>
                    <TableHead className="text-[9px] font-black uppercase">Categoria</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center">Peso (kg)</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center">Tipo</TableHead>
                    <TableHead className="w-20 text-right pr-4"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map(p => (
                    <TableRow key={p.id} className="h-12 hover:bg-muted/20">
                      <TableCell className="font-mono text-[10px] font-bold text-primary">{p.id}</TableCell>
                      <TableCell className="text-[11px] font-black uppercase">{p.name}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">{p.category}</TableCell>
                      <TableCell className="text-center text-[10px] font-bold">{p.weight?.toFixed(2) || '---'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`text-[8px] font-black uppercase ${p.isRawMaterial ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                          {p.isRawMaterial ? 'Insumo' : 'Produto'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenProductModal(p)}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => confirmDelete('product', p.id, p.name)}>
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
        </TabsContent>

        {/* TABELAS DE PREÇO */}
        <TabsContent value="precos" className="mt-6">
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="bg-white border-b flex flex-row items-center justify-between py-3">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-tight">Tabelas de Preços</CardTitle>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Preços diferenciados por canal de venda</p>
              </div>
              <Button size="sm" className="gap-2 font-black uppercase text-xs" onClick={() => handleOpenPriceModal(null)} disabled={loading}>
                <Plus className="w-4 h-4" /> Nova Tabela
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-[9px] font-black uppercase">Nome da Tabela</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center">Produtos</TableHead>
                    <TableHead className="w-20 text-right pr-4"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceTables.map(table => (
                    <TableRow key={table.id} className="h-12 hover:bg-muted/20">
                      <TableCell className="text-[11px] font-black uppercase">{table.name}</TableCell>
                      <TableCell className="text-center text-[10px] font-bold">{Object.keys(table.prices).length} itens</TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenPriceModal(table)}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => confirmDelete('priceTable', table.id, table.name)}>
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
        </TabsContent>

        {/* CLIENTES */}
        <TabsContent value="clientes" className="mt-6">
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="bg-white border-b flex flex-row items-center justify-between py-3">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-tight">Clientes</CardTitle>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Cadastro de clientes e destinatários</p>
              </div>
              <Button size="sm" className="gap-2 font-black uppercase text-xs" onClick={() => handleOpenCustomerModal(null)} disabled={loading}>
                <Plus className="w-4 h-4" /> Novo Cliente
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-[9px] font-black uppercase">Nome / Razão Social</TableHead>
                    <TableHead className="text-[9px] font-black uppercase">CPF / CNPJ</TableHead>
                    <TableHead className="text-[9px] font-black uppercase">Cidade</TableHead>
                    <TableHead className="text-[9px] font-black uppercase">Telefone</TableHead>
                    <TableHead className="w-20 text-right pr-4"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map(c => (
                    <TableRow key={c.id} className="h-12 hover:bg-muted/20">
                      <TableCell className="text-[11px] font-black uppercase">{c.name}</TableCell>
                      <TableCell className="text-[10px] font-mono font-bold">{c.cpfcnpj}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground uppercase">{c.city}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">{c.phone}</TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenCustomerModal(c)}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => confirmDelete('customer', c.id, c.name)}>
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
        </TabsContent>

        {/* EQUIPE */}
        <TabsContent value="equipe" className="mt-6">
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="bg-white border-b flex flex-row items-center justify-between py-3">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-tight">Equipe</CardTitle>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Cadastro de membros da equipe</p>
              </div>
              <Button size="sm" className="gap-2 font-black uppercase text-xs" onClick={() => handleOpenTeamModal(null)} disabled={loading}>
                <Plus className="w-4 h-4" /> Novo Membro
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-[9px] font-black uppercase">Nome</TableHead>
                    <TableHead className="text-[9px] font-black uppercase">Função</TableHead>
                    <TableHead className="text-[9px] font-black uppercase">Acesso</TableHead>
                    <TableHead className="text-[9px] font-black uppercase">E-mail</TableHead>
                    <TableHead className="w-20 text-right pr-4"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map(member => (
                    <TableRow key={member.id} className="h-12 hover:bg-muted/20">
                      <TableCell className="text-[11px] font-black uppercase">{member.name}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground uppercase">{member.funcao || '—'}</TableCell>

                      <TableCell className="text-right pr-4">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenTeamModal(member)}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => confirmDelete('member', member.id, member.name)}>
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
        </TabsContent>
        {/* VEÍCULOS */}
        <TabsContent value="veiculos" className="mt-6">
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
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => confirmDelete('vehicle', v.id, v.model)}>
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
        </TabsContent>

      </Tabs>

      {/* MODAL PRODUTO */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black uppercase">{editingProduct ? 'Editar' : 'Novo'} Produto</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-muted-foreground">SKU *</label>
                <Input placeholder="Ex: PROD-001" value={productData.id || ''} disabled={!!editingProduct || loading}
                  onChange={e => setProductData({ ...productData, id: e.target.value })} className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-muted-foreground">Nome *</label>
                <Input placeholder="Nome comercial" value={productData.name || ''}
                  onChange={e => setProductData({ ...productData, name: e.target.value })} className="h-9 text-xs" disabled={loading} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-muted-foreground">Categoria *</label>
                <Input placeholder="Ex: Fertilizante" value={productData.category || ''}
                  onChange={e => setProductData({ ...productData, category: e.target.value })} className="h-9 text-xs" disabled={loading} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-muted-foreground">Unidade</label>
                <Select value={productData.uom || 'sc'} onValueChange={val => setProductData({ ...productData, uom: val })} disabled={loading}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="un">Unidade (un)</SelectItem>
                    <SelectItem value="kg">Quilograma (kg)</SelectItem>
                    <SelectItem value="sc">Saco (sc)</SelectItem>
                    <SelectItem value="pct">Pacote (pct)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-muted-foreground">Peso (kg)</label>
                <Input type="number" step="0.001" placeholder="0.000" value={productData.weight || ''}
                  onChange={e => setProductData({ ...productData, weight: parseFloat(e.target.value) || 0 })} className="h-9 text-xs" disabled={loading} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsProductModalOpen(false)} className="font-bold text-xs uppercase" disabled={loading}>Cancelar</Button>
            <Button onClick={handleSaveProduct} className="gap-2 font-black text-xs uppercase" disabled={loading}><Save className="w-4 h-4" /> Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL TABELA DE PREÇOS */}
      <Dialog open={isPriceModalOpen} onOpenChange={setIsPriceModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black uppercase">{editingTable ? 'Editar' : 'Nova'} Tabela de Preços</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-muted-foreground">Nome da Tabela *</label>
              <Input placeholder="Ex: Varejo, Atacado, Representante" value={tableName} onChange={e => setTableName(e.target.value)} className="h-9 text-xs" disabled={loading} />
            </div>
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-[9px] font-black uppercase">Produto</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-center">Preço Padrão</TableHead>
                  <TableHead className="text-[9px] font-black uppercase w-40">Preço Nesta Tabela (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.filter(p => !p.isRawMaterial).map(p => (
                  <TableRow key={p.id} className="h-10">
                    <TableCell className="text-[11px] font-bold uppercase">{p.name}</TableCell>
                    <TableCell>
                      <Input type="number" step="0.01" value={prices[p.id] || ''}
                        onChange={e => setPrices(prev => ({ ...prev, [p.id]: parseFloat(e.target.value) || 0 }))}
                        className="h-8 text-xs" disabled={loading} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsPriceModalOpen(false)} className="font-bold text-xs uppercase" disabled={loading}>Cancelar</Button>
            <Button onClick={handleSavePriceTable} className="gap-2 font-black text-xs uppercase" disabled={loading}><Save className="w-4 h-4" /> Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CLIENTE */}
      <Dialog open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-black uppercase">{editingCustomer ? 'Editar' : 'Novo'} Cliente</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="manual">
            <TabsList className="w-full">
              <TabsTrigger value="manual" className="flex-1 text-xs font-black uppercase">Manual</TabsTrigger>
              {!editingCustomer && (
                <TabsTrigger value="importar" className="flex-1 text-xs font-black uppercase">Importar Planilha</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="manual">
              <div className="py-4 space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-muted-foreground">Nome completo *</label>
                <Input placeholder="Nome completo / Razão Social *" value={customerData.name}
                  onChange={e => setCustomerData({ ...customerData, name: e.target.value })} className="h-9 text-xs" disabled={loading} />
              </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="CPF / CNPJ" value={customerData.cpfcnpj || ''}
                    onChange={e => setCustomerData({ ...customerData, cpfcnpj: e.target.value })} className="h-9 text-xs" disabled={loading} />
                  <Input placeholder="Inscrição Estadual" value={customerData.IE || ''}
                    onChange={e => setCustomerData({ ...customerData, IE: e.target.value })} className="h-9 text-xs" disabled={loading} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Telefone" value={customerData.phone || ''}
                    onChange={e => setCustomerData({ ...customerData, phone: e.target.value })} className="h-9 text-xs" disabled={loading} />
                  <Input placeholder="E-mail" value={customerData.email || ''}
                    onChange={e => setCustomerData({ ...customerData, email: e.target.value })} className="h-9 text-xs" disabled={loading} />
                </div>
                <Input placeholder="Endereço Completo" value={customerData.address || ''}
                  onChange={e => setCustomerData({ ...customerData, address: e.target.value })} className="h-9 text-xs" disabled={loading} />
                <Input placeholder="Cidade - UF" value={customerData.city || ''}
                  onChange={e => setCustomerData({ ...customerData, city: e.target.value })} className="h-9 text-xs" disabled={loading} />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsCustomerModalOpen(false)} className="font-bold text-xs uppercase" disabled={loading}>Cancelar</Button>
                <Button onClick={handleSaveCustomer} className="gap-2 font-black text-xs uppercase" disabled={loading}><Save className="w-4 h-4" /> Salvar</Button>
              </DialogFooter>
            </TabsContent>

            {!editingCustomer && (
              <TabsContent value="importar">
                <div className="py-4 space-y-4">
                  <div className="text-[10px] text-muted-foreground space-y-1">
                    <p className="font-black uppercase">Colunas esperadas na planilha:</p>
                    <p className="font-mono">name, cpfcnpj, IE, phone, email, address, city</p>
                    <p>A coluna <span className="font-bold">name</span> é obrigatória.</p>
                  </div>

                  <Button variant="outline" size="sm" className="text-xs font-black uppercase gap-2 w-full" disabled={loading}
                    onClick={() => {
                      const ws = XLSX.utils.aoa_to_sheet([['name', 'cpfcnpj', 'IE', 'phone', 'email', 'address', 'city']]);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
                      XLSX.writeFile(wb, 'modelo_clientes.xlsx');
                    }}>
                    <Download className="w-4 h-4" /> Baixar Modelo
                  </Button>

                  <Input type="file" accept=".xlsx,.xls,.csv" className="h-9 text-xs" disabled={loading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      const buffer = await file.arrayBuffer();
                      const wb = XLSX.read(buffer, { type: 'array' });
                      const ws = wb.Sheets[wb.SheetNames[0]];
                      const rows = XLSX.utils.sheet_to_json<any>(ws);

                      if (rows.length === 0) {
                        toast({ variant: 'destructive', title: 'Planilha vazia ou inválida' });
                        return;
                      }

                      const invalid = rows.filter(r => !r.name);
                      if (invalid.length > 0) {
                        toast({ variant: 'destructive', title: `${invalid.length} linha(s) sem nome serão ignoradas` });
                      }

                      const valid = rows.filter(r => !!r.name);
                      if (valid.length === 0) {
                        toast({ variant: 'destructive', title: 'Nenhuma linha válida encontrada' });
                        return;
                      }

                      setImportPreview(valid);
                    }} />

                  {importPreview.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-muted-foreground">{importPreview.length} cliente(s) encontrados</p>
                      <div className="max-h-40 overflow-y-auto border rounded text-[10px] divide-y">
                        {importPreview.map((r, i) => (
                          <div key={i} className="px-3 py-1.5 flex justify-between">
                            <span className="font-bold uppercase">{r.name}</span>
                            <span className="text-muted-foreground">{r.city || '-'}</span>
                          </div>
                        ))}
                      </div>
                      <Button className="w-full gap-2 font-black text-xs uppercase" onClick={handleImportCustomers} disabled={loading}>
                        <Save className="w-4 h-4" /> Importar {importPreview.length} cliente(s)
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* MODAL EQUIPE */}
      <Dialog open={isMemberModalOpen} onOpenChange={setIsMemberModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-black uppercase">{editingMember ? 'Editar' : 'Novo'} Membro da Equipe</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <Input placeholder="Nome completo *" value={memberData.name}
              onChange={e => setMemberData({ ...memberData, name: e.target.value })} className="h-9 text-xs" disabled={loading} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Função (ex: Vendedor)" value={memberData.funcao || ''}
                onChange={e => setMemberData({ ...memberData, funcao: e.target.value })} className="h-9 text-xs" disabled={loading} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsMemberModalOpen(false)} className="font-bold text-xs uppercase" disabled={loading}>Cancelar</Button>
            <Button onClick={handleSaveTeamMember} className="gap-2 font-black text-xs uppercase" disabled={loading}><Save className="w-4 h-4" /> Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              Deseja excluir <strong>{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleConfirmDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}