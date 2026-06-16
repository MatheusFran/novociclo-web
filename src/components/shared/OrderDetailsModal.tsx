'use client';

import { Order, Product } from '@/lib/types';
import {
  Dialog, DialogContent, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ReactNode } from 'react';

export interface OrderDetailsAction {
  label: string;
  onClick: () => void | Promise<void>;
  variant?: 'default' | 'ghost' | 'destructive' | 'green';
  icon?: ReactNode;
  hidden?: (order: Order) => boolean;
}

export interface OrderDetailsModalProps {
  isOpen: boolean;
  order: Order | null;
  products: Product[];
  onClose: () => void;
  actions?: OrderDetailsAction[];
  headerBadge?: { label: string; color: string };
  extraLeftSections?: { title: string; content: ReactNode }[];
  extraRightSections?: { title: string; content: ReactNode }[];
  footerContent?: ReactNode;
  statusLabels?: Record<string, string>;
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase">
        {label}
      </p>
      <p className="text-sm text-foreground font-medium">
        {value ?? '—'}
      </p>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm font-semibold text-foreground border-b pb-2">
      {children}
    </p>
  );
}

function fmt(date?: string) {
  if (!date) return undefined;
  return new Date(date).toLocaleDateString('pt-BR');
}

function fmtDateTime(date?: string) {
  if (!date) return undefined;
  return new Date(date).toLocaleString('pt-BR');
}

export function OrderDetailsModal({
  isOpen,
  order,
  products,
  onClose,
  actions = [],
  headerBadge,
  extraLeftSections = [],
  extraRightSections = [],
  footerContent,
  statusLabels = {},
}: OrderDetailsModalProps) {
  if (!order) return null;

  const visibleActions = actions.filter(a => !a.hidden?.(order));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[95vh] p-0 overflow-hidden bg-white">
        <DialogTitle className="sr-only">
          Detalhes do Pedido {order.id}
        </DialogTitle>

        <div className="flex flex-col max-h-[95vh]">

          {/* HEADER / RESUMO */}
          <div className="bg-primary px-6 py-4 flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-white/70 uppercase">
                  Pedido #{order.id}
                </p>
                <h2 className="text-lg font-semibold text-white">
                  {order.customerName}
                </h2>
                <p className="text-sm text-white/70">
                  {order.city}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {headerBadge && (
                  <Badge className={headerBadge.color}>
                    {headerBadge.label}
                  </Badge>
                )}
                <Button variant="ghost" onClick={onClose} className="text-white">
                  Fechar
                </Button>
              </div>
            </div>

            {/* RESUMO */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-white">
              <div>
                <p className="text-xs text-white/70">Total</p>
                <p className="text-lg font-semibold">
                  R$ {order.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/70">Itens</p>
                <p className="text-sm font-medium">
                  {order.items.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/70">Criado em</p>
                <p className="text-sm font-medium">
                  {fmtDateTime(order.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/70">Entrega</p>
                <p className="text-sm font-medium">
                  {fmt(order.deliveryDate)}
                </p>
              </div>
            </div>
          </div>

          {/* CONTENT */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr]">

              {/* ESQUERDA */}
              <div className="p-6 space-y-8">

                <div className="space-y-4">
                  <SectionTitle>Cliente</SectionTitle>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoField label="CPF / CNPJ" value={order.customerCpfCnpj} />
                    <InfoField label="Telefone" value={order.customerPhone} />
                    <InfoField label="E-mail" value={order.customerEmail} />
                    <InfoField label="IE" value={order.customerIE} />
                  </div>
                  <InfoField label="Endereço" value={order.customerAddress} />
                </div>

                <div className="space-y-4">
                  <SectionTitle>Comercial</SectionTitle>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoField label="Vendedor" value={order.seller} />
                    <InfoField label="Fechado por" value={order.closedBy} />
                    <InfoField label="Pagamento" value={order.paymentCondition?.replace(/_/g, ' ')} />
                  </div>
                </div>

                {extraLeftSections.map((section, idx) => (
                  <div key={idx} className="space-y-4">
                    <SectionTitle>{section.title}</SectionTitle>
                    {section.content}
                  </div>
                ))}

              </div>

              {/* DIREITA */}
              <div className="p-6 flex flex-col gap-6">

                {/* ITENS */}
                <div className="space-y-4">
                  <SectionTitle>Itens do Pedido</SectionTitle>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-muted-foreground border-b">
                          <th className="py-2">Produto</th>
                          <th className="py-2 text-right">Qtd</th>
                          <th className="py-2 text-right">Peso</th>
                          <th className="py-2 text-right">Unitário</th>
                          <th className="py-2 text-right">Total</th>
                          <th className="py-2 text-right">R$/kg</th>
                        </tr>
                      </thead>

                      <tbody>
                        {order.items.map((item) => {
                          const prod = products.find(p => p.id === item.productId);

                          const total = item.price * item.quantity;

                          // ajuste conforme sua estrutura real
                          const weightPerUnit = prod?.weight || 0;
                          const totalWeight = weightPerUnit * item.quantity;

                          const pricePerKg = totalWeight > 0 ? total / totalWeight : 0;

                          return (
                            <tr key={item.productId} className="border-b last:border-0">
                              <td className="py-2">
                                <p className="font-medium">{prod?.name}</p>
                                <p className="text-xs text-muted-foreground">{item.productId}</p>
                              </td>

                              <td className="py-2 text-right">
                                {item.quantity}
                              </td>

                              <td className="py-2 text-right">
                                {totalWeight.toFixed(2)} kg
                              </td>

                              <td className="py-2 text-right">
                                R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>

                              <td className="py-2 text-right font-medium">
                                R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>

                              <td className="py-2 text-right text-muted-foreground">
                                R$ {pricePerKg.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* TOTAL */}
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Quantidade</span>
                    <span>{order.items.reduce((acc, i) => acc + i.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Peso</span>
                    <span>{order.totalWeight?.toFixed(2)} kg</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                    <span>Total</span>
                    <span>
                      R$ {order.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* STATUS (UNIFICADO) */}
                <div className="space-y-4">
                  <SectionTitle>Status</SectionTitle>
                  <div className="space-y-2 text-sm">
                    {order.createdAt && <p>Criado: {fmtDateTime(order.createdAt)}</p>}
                    {order.approvedAt && <p>Aprovado: {fmtDateTime(order.approvedAt)}</p>}                    {(order as any).approvedByFinance && <p>✓ Aprova\u00e7\u00e3o Financeira: {fmtDateTime((order as any).approvedByFinance)}</p>}                    {order.invoicedAt && <p>Faturado: {fmtDateTime(order.invoicedAt)}</p>}
                    {order.departureTime && <p>Saída: {fmtDateTime(order.departureTime)}</p>}
                    {order.deliveredAt && <p>Entregue: {fmtDateTime(order.deliveredAt)}</p>}
                  </div>
                </div>

                {/* DESCARGA E ENTREGA */}
                {((order as any).meioDescarga || (order as any).responsavelDescarga || (order as any).dataHoraDescarga || (order as any).especificidadesEntrega) && (
                  <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
                    <SectionTitle>Descarga e Entrega</SectionTitle>
                    <div className="space-y-3 text-sm">
                      {(order as any).meioDescarga && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Meio de Descarga</p>
                          <p className="font-medium">
                            {(order as any).meioDescarga === 'PROPRIO' ? '🏢 Próprio' :
                             (order as any).meioDescarga === 'AJUDANTE_EXTERNO' ? '👷 Ajudante Externo' :
                             '🏗️ Empilhadeira'}
                          </p>
                        </div>
                      )}
                      {(order as any).responsavelDescarga && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Responsável pela Descarga</p>
                          <p className="font-medium">
                            {(order as any).responsavelDescarga === 'CLIENTE' ? '👤 Cliente' : '🏪 Lotus'}
                          </p>
                        </div>
                      )}
                      {(order as any).dataHoraDescarga && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Data e Hora da Descarga</p>
                          <p className="font-medium">{fmtDateTime((order as any).dataHoraDescarga)}</p>
                        </div>
                      )}
                      {(order as any).especificidadesEntrega && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Especificidades de Entrega</p>
                          <p className="font-medium">{(order as any).especificidadesEntrega}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {extraRightSections.map((section, idx) => (
                  <div key={idx} className="space-y-4">
                    <SectionTitle>{section.title}</SectionTitle>
                    {section.content}
                  </div>
                ))}

              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="border-t px-6 py-4 flex flex-wrap gap-2">
            {footerContent || visibleActions.map((action, idx) => (
              <Button
                key={idx}
                variant={
                  action.variant === 'green'
                    ? 'default'
                    : (action.variant as any) || 'default'
                }
                className={
                  action.variant === 'green'
                    ? 'bg-green-600 hover:bg-green-700'
                    : action.variant === 'destructive'
                      ? 'bg-red-600 hover:bg-red-700'
                      : ''
                }
                onClick={action.onClick}
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}