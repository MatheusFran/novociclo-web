export type UserRole = 'ADMIN' | 'COMERCIAL' | 'PRODUCAO' | 'LOGISTICA';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type OrderStatus =
  | 'PENDENTE'
  | 'PRODUCAO'
  | 'FINANCEIRO'
  | 'PRONTO_LOGISTICA'
  | 'ENTREGA'
  | 'AGUARDANDO_FATURAMENTO'
  | 'FATURADO'
  | 'REJEITADO'
  | 'CANCELADO'
  | 'ENTREGUE';

export type ProductionStage = 'FILA' | 'CONCLUIDO';

export type MovementType = 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA';
export type MovementReason =
  | 'COMPRA'
  | 'DEVOLUCAO'
  | 'AJUSTE_POS'
  | 'PRODUCAO_ENTRADA'
  | 'PRODUCAO_CONSUMO'
  | 'VENDA'
  | 'PERDA'
  | 'AJUSTE_NEG'
  | 'TRANSFERENCIA_INTERNA';

// CRM Types
export type LeadStatus = 'NOVO' | 'CONTATADO' | 'QUALIFICADO' | 'PROPOSTA' | 'NEGOCIACAO' | 'GANHO' | 'PERDIDO';
export type ActivityType = 'VISITA' | 'REUNIAO' | 'LIGACAO' | 'EMAIL' | 'WHATSAPP';
export type LeadOrigin = 'SITE' | 'INDICACO' | 'LINKEDIN' | 'ANUNCIO' | 'OUTRO';
export type CompanySize = 'MICRO' | 'PEQUENA' | 'MEDIA' | 'GRANDE';
export type PaymentCondition =
  | 'A_VISTA_ENTREGA'
  | 'BOLETO_15_DIAS'
  | 'BOLETO_30_DIAS'
  | 'BOLETO_30_60_90'
  | 'BOLETO_30_60'
  | 'CARTAO'
  | 'CARTAO2X'
  | 'PIX'
  | 'BONIFICADO'
  | 'OUTRO';
export interface Member {
  id: string;
  name: string;
  funcao?: string | null;
  active: boolean;
}

export interface InteractionLog {
  id: string;
  type: ActivityType;
  description: string;
  date: string;
  author: string;
}

export interface Activity {
  id: string;
  leadId: string;
  type: ActivityType;
  description: string;
  date: string;
  completed: boolean;
  priority: 'BAIXA' | 'MEDIA' | 'ALTA';
}



export interface Customer {
  id: string;

  // BÁSICO
  name: string;
  cpfcnpj?: string | null;
  IE?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;

  // COMERCIAL
  tipoCliente?: string | null;
  segmento?: string | null;
  origemLead?: string | null;
  responsavel?: string | null;
  status?: string | null;

  // FINANCEIRO
  vendaPrazo?: boolean;
  prazoPagamentoPadrao?: number | null;
  risco?: string | null;
  inadimplente?: boolean;
  scoreInterno?: number | null;

  // RELACIONAMENTO
  ultimoContato?: string | null;
  proximoFollowUp?: string | null;
  observacoes?: string | null;
  tags?: string | null;

  // RELAÇÕES
  crmPipelines?: CrmPipeline[];
  followUps?: FollowUp[];
  tasks?: Task[];
  orders?: Order[];

  createdAt?: string;
  updatedAt?: string;
}

export interface FollowUp {
  id: string;
  date: string;
  note?: string | null;
  createdAt?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  dueDate?: string | null;
  createdAt?: string;
}

export interface BOMItem {
  productId: string;
  quantity: number;
}

export interface StockInfo {
  lot: string;
  city: string;
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  uom: string;
  category: string;
  price: number; // Preço base/varejo, pode ser usado como fallback
  weight: number; // Em kg
  bom?: BOMItem[];
  isRawMaterial: boolean;
  lotControl?: boolean;
}

export interface PriceTable {
  id: string;
  name: string;
  prices: Record<string, number>; // productId: price
}

export interface StockMovement {
  id: string;
  productId: string;
  quantity: number;
  type: MovementType;
  reason: MovementReason;
  responsible: string;
  date: string;
  orderId?: string;
  lot?: string;
  city?: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number; // Valor da tabela de preços
  finalPrice?: number; // Valor final definido pelo vendedor
  discount?: number; // Mantido para compatibilidade
}

export interface SavedQuote {
  id: string;
  createdAt: string;
  customerName: string;
  customerCity: string;
  customerPhone: string;
  priceTableId: string;
  items: OrderItem[];
  totalValue: number;
  status: 'ABERTA' | 'CONVERTIDA' | 'CANCELADA';
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerDocument?: string;
  customerCpfCnpj?: string; // substitui customerDocument
  customerIE?: string;      // novo campo
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  city?: string;

  items: OrderItem[];

  status: OrderStatus;
  productionStage?: ProductionStage;

  createdAt: string;
  updatedAt: string;
  deliveryDate?: string;
  scheduledDeliveryDate?: string;

  totalValue: number;
  totalWeight: number;

  seller: string;
  closedBy?: string;
  user: string;

  paymentCondition: PaymentCondition;
  priceTableId?: string;

  // Logística
  assignedVehicleId?: string;
  assignedDriverId?: string;
  acceptedAt?: string;
  departureTime?: string;
  deliveredAt?: string;

  // Faturamento
  invoicedAt?: string;
  rejectedAt?: string;
  nfNumero?: string;
  vendaDiretaNumero?: string;

  // Produção
  loteId?: string;
  loteDate?: string;
  approvedAt?: string;
  viewedAt?: string;

  // Observações (alinhado com schema)
  observations?: string;

  grupoCarga?: string;
  tipoCarga?: string;
  dataCarregamento?: string;

  // Financeiro
  approvedByFinance?: string;
  approvedByFinanceUser?: string;
  rejectionReason?: string;
  rejectedBy?: string;

  // Descarga e Entrega
  meioDescarga?: 'PROPRIO' | 'AJUDANTE_EXTERNO' | 'EMPILHADEIRA';
  responsavelDescarga?: 'CLIENTE' | 'LOTUS';
  dataHoraDescarga?: string;
  especificidadesEntrega?: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  type: 'CAMINHAO' | 'VAN' | 'CARRO';
  capacityKg: number;
  status: 'DISPONIVEL' | 'EM_ROTA' | 'MANUTENCAO';
}

export interface Driver {
  id: string;
  name: string;
  license: string;
  phone: string;
  status: 'DISPONIVEL' | 'EM_ROTA' | 'EM_VIAGEM' | 'FOLGA';
}

export interface DeliverySchedule {
  id: string;
  scheduledDate: string;
  vehicleId: string;
  driverId: string;
  orders: string[]; // IDs dos pedidos
  status: 'AGENDADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';
  notes?: string;
  createdAt: string;
  totalWeight: number;
  totalValue: number;
  cities: string[];
}

export interface Carregamento {
  id: string;
  grupoCarga: string;
  tipoCarga: 'BATIDA' | 'PALETIZADA';
  dataCarregamento: string;
  vehicleId?: string;
  scheduledDeliveryDate?: string;
  orderIds: string[];
  totalSacos: number;
  totalPeso: number;
  totalValor: number;
  observations?: string | null;
  cityGroups?: any[];
  romaneio?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Palet {
  id: string;
  carregamentoId: string;
  number: number;
  city: string;
  items: Array<{
    productId: string;
    clients: Array<{
      orderId: string;
      customerName: string;
      quantity: number;
    }>;
  }>;
  totalWeight: number;
  totalUnits: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaletHistory {
  id: string;
  carregamentoId: string;
  paletId?: string;
  action: 'CRIADO' | 'MODIFICADO' | 'FINALIZADO';
  details: any;
  createdAt: string;
}

export interface SalesGoal {
  id: string;
  month: number;
  year: number;
  revenue: number;
  tons: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}
export type CrmColuna = 'ENTRADA' | 'QUALIFICACAO' | 'PROPOSTA' | 'FECHADO';

export interface CrmMovimento {
  id: string;
  pipelineId: string;
  colunaAnterior: CrmColuna | null;
  colunaAtual: CrmColuna;
  createdAt: string;
}

export interface CrmPipeline {
  id: string;
  customerId: string;
  objetivo: string;
  coluna: CrmColuna;

  canal?: string | null;
  proximaAcao?: string | null;
  statusCrm?: string | null;
  resultado?: string | null;
  valorRecuperado?: number | null;
  observacao?: string | null;
  nomeContato?: string | null;
  ultimoContato?: string | null;

  createdAt: string;
  updatedAt: string;

  customer?: {
    id: string;
    name: string;
    city?: string;
  };

  movimentos: CrmMovimento[];
}

// Lista de cidades para autocomplete
export const citiesWithStates: { name: string; state: string }[] = [
  { name: "Belo Horizonte", state: "MG" },
  { name: "Uberlândia", state: "MG" },
  { name: "Contagem", state: "MG" },
  { name: "Juiz de Fora", state: "MG" },
  { name: "São Paulo", state: "SP" },
  { name: "Guarulhos", state: "SP" },
  { name: "Campinas", state: "SP" },
  { name: "Rio de Janeiro", state: "RJ" },
  { name: "São Gonçalo", state: "RJ" },
  { name: "Duque de Caxias", state: "RJ" },
  { name: "Vitória", state: "ES" },
  { name: "Vila Velha", state: "ES" },
];
