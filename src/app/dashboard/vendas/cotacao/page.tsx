'use client';

import { useMemo, useState } from 'react';
import { useSystemData } from '@/server/store';
import { Product, PriceTable } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import Image from 'next/image';

// ─── helpers ──────────────────────────────────────────────────────────────────

function getBasePrice(product: Product, priceTables: PriceTable[], tableId: string): number {
  const table = priceTables.find(t => t.id === tableId);
  const price = table?.prices[product.id] ?? product.price ?? 0;
  return Number(price) || 0;
}

function currency(value: number | undefined): string {
  if (value === undefined || value === null || isNaN(value)) return '0,00';
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

// ─── types ────────────────────────────────────────────────────────────────────

interface RowState {
  qty: number;
  customPrice: number | '';
}

// ─── component ────────────────────────────────────────────────────────────────

export default function CotacaoPage() {
  const { products, priceTables } = useSystemData();

  const [priceTableId, setPriceTableId] = useState<string>(priceTables[0]?.id ?? '');
  const [customerName, setCustomerName] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // rowState keyed by productId
  const [rows, setRows] = useState<Record<string, RowState>>({});

  const salesProducts = useMemo(
    () => products.filter(p => !p.isRawMaterial),
    [products],
  );

  // group by category
  const groups = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of salesProducts) {
      const cat = (p.category as string) || 'Geral';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    return map;
  }, [salesProducts]);

  function getRow(productId: string, basePrice: number): RowState {
    return rows[productId] ?? { qty: 0, customPrice: '' };
  }

  function setRow(productId: string, patch: Partial<RowState>) {
    setRows(prev => ({
      ...prev,
      [productId]: { ...getRow(productId, 0), ...patch },
    }));
  }

  // when price table changes, clear custom prices
  function handleTableChange(id: string) {
    setPriceTableId(id);
    setRows(prev => {
      const next: Record<string, RowState> = {};
      for (const [k, v] of Object.entries(prev)) {
        next[k] = { ...v, customPrice: '' };
      }
      return next;
    });
  }

  // totals
  const totals = useMemo(() => {
    let totalQty = 0;
    let totalValue = 0;
    let totalWeight = 0;

    for (const product of salesProducts) {
      const base = getBasePrice(product, priceTables, priceTableId);
      const row = getRow(product.id, base);
      const qty = row.qty;
      const price = row.customPrice !== '' ? Number(row.customPrice) : base;
      totalQty += qty;
      totalValue += qty * price;
      totalWeight += qty * (product.weight ?? 0);
    }

    return { totalQty, totalValue, totalWeight };
  }, [rows, salesProducts, priceTables, priceTableId]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden ">

      {/* ── PAGE HEADER ──────────────────────────────────────────────── */}
      <div>
        <p className="text-xl font-bold text-slate-900">Calculadora de Cotação</p>
        <p className="text-sm text-muted-foreground">Preencha as quantidades e ajuste os preços se necessário</p>
      </div>


      {/* ── SCROLLABLE CONTENT ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-1 print-area">

          {/* PRINT HEADER */}
          <div className="hidden print:flex justify-between items-center mb-6 border-b-2 border-green-700 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 relative">
                <Image src="/logo.png" alt="Logo" fill className="object-contain" />
              </div>
              <div>
                <p className="text-base font-black uppercase">NOVO CICLO</p>
                <p className="text-[9px] text-zinc-400 uppercase tracking-widest">Gestão Sustentável</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black uppercase">Cotação</p>
              {customerName && <p className="text-sm font-semibold">{customerName} — {customerCity}</p>}
            </div>
          </div>



          {/* TABLE */}
          <div className="rounded-xl overflow-hidden border border-zinc-200 shadow-sm">
            <table className="w-full text-sm border-collapse">

              {/* THEAD */}
              <thead>
                <tr className="bg-green-700 text-white">
                  <th className="text-left px-3 py-1.5 text-[10px] font-black uppercase tracking-wide w-[40%]">Produto</th>
                  <th className="text-center px-2 py-1.5 text-[10px] font-black uppercase tracking-wide w-[8%]">Qtd</th>
                  <th className="text-right px-2 py-1.5 text-[10px] font-black uppercase tracking-wide w-[10%]">Preço Orig.</th>
                  <th className="text-right px-2 py-1.5 text-[10px] font-black uppercase tracking-wide w-[10%]">Preço Ajust.</th>
                  <th className="text-right px-2 py-1.5 text-[10px] font-black uppercase tracking-wide w-[10%]">Total</th>
                  <th className="text-right px-2 py-1.5 text-[10px] font-black uppercase tracking-wide w-[7%]">Peso Item</th>
                  <th className="text-right px-2 py-1.5 text-[10px] font-black uppercase tracking-wide w-[8%]">Peso Total</th>
                  <th className="text-right px-2 py-1.5 text-[10px] font-black uppercase tracking-wide w-[7%]">R$/kg</th>
                </tr>
              </thead>

              <tbody>
                {Array.from(groups.entries()).map(([category, prods], gIdx) => (
                  <>
                    {/* CATEGORY ROW */}
                    <tr key={`cat-${category}`} className="bg-green-100 border-t border-green-200">
                      <td className="px-3 py-1 text-[10px] font-black uppercase text-green-800 tracking-wide">{category}</td>
                      <td className="px-2 py-1 text-center text-[10px] font-black text-green-700">Qtd</td>
                      <td className="px-2 py-1 text-right text-[10px] font-black text-green-700">Preço Unit.</td>
                      <td className="px-2 py-1 text-right text-[10px] font-black text-green-700">Preço Ajust.</td>
                      <td className="px-2 py-1 text-right text-[10px] font-black text-green-700">Total</td>
                      <td className="px-2 py-1 text-right text-[10px] font-black text-green-700">Peso</td>
                      <td className="px-2 py-1 text-right text-[10px] font-black text-green-700">Peso Total</td>
                      <td className="px-2 py-1 text-right text-[10px] font-black text-green-700">R$/kg</td>
                    </tr>

                    {/* PRODUCT ROWS */}
                    {prods.map((product, pIdx) => {
                      const basePrice = getBasePrice(product, priceTables, priceTableId);
                      const row = getRow(product.id, basePrice);
                      const effectivePrice = row.customPrice !== '' ? Number(row.customPrice) : basePrice;
                      const lineTotal = row.qty * effectivePrice;
                      const weightUnit = product.weight ?? 0;
                      const weightTotal = row.qty * weightUnit;
                      const costPerKg = weightTotal > 0 ? lineTotal / weightTotal : 0;
                      const isPriceChanged = row.customPrice !== '' && Number(row.customPrice) !== basePrice;
                      const isEven = pIdx % 2 === 0;

                      return (
                        <tr
                          key={product.id}
                          className={`border-t border-zinc-100 ${isEven ? 'bg-white' : 'bg-zinc-50/60'} ${row.qty > 0 ? 'ring-inset ring-1 ring-green-200' : ''}`}
                        >
                          {/* Nome */}
                          <td className="px-3 py-1.5">
                            <p className="text-[11px] font-semibold text-slate-800">{product.name}</p>
                            {product.uom && (
                              <p className="text-[9px] text-zinc-400 font-mono uppercase">{product.uom}</p>
                            )}
                          </td>

                          {/* Quantidade */}
                          <td className="px-2 py-1.5 text-center">
                            <Input
                              type="number"
                              min={0}
                              className="h-6 w-14 mx-auto text-center text-xs font-bold border-zinc-300"
                              value={row.qty === 0 ? '' : row.qty}
                              placeholder="0"
                              onChange={e => setRow(product.id, { qty: parseInt(e.target.value) || 0 })}
                            />
                          </td>

                          {/* Preço original */}
                          <td className="px-2 py-1.5 text-right">
                            <span className="text-[11px] font-semibold text-zinc-500">
                              R$ {currency(basePrice)}
                            </span>
                          </td>

                          {/* Preço ajustado (editável) */}
                          <td className="px-2 py-1.5 text-right">
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              className={`h-6 w-20 ml-auto text-right text-xs font-bold ${isPriceChanged ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-zinc-300'}`}
                              value={row.customPrice}
                              placeholder={currency(basePrice)}
                              onChange={e => setRow(product.id, { customPrice: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                            />
                          </td>

                          {/* Total */}
                          <td className="px-2 py-1.5 text-right">
                            <span className={`text-[11px] font-black ${row.qty > 0 ? 'text-slate-900' : 'text-zinc-300'}`}>
                              {row.qty > 0 ? `R$ ${currency(lineTotal)}` : '—'}
                            </span>
                          </td>

                          {/* Peso item */}
                          <td className="px-2 py-1.5 text-right">
                            <span className="text-[10px] text-zinc-500">{weightUnit.toFixed(2)}</span>
                          </td>

                          {/* Peso total */}
                          <td className="px-2 py-1.5 text-right">
                            <span className={`text-[10px] font-semibold ${row.qty > 0 ? 'text-slate-700' : 'text-zinc-300'}`}>
                              {row.qty > 0 ? weightTotal.toFixed(1) : '0,0'}
                            </span>
                          </td>

                          {/* Custo por kg */}
                          <td className="px-2 py-1.5 text-right">
                            <span className={`text-[10px] font-semibold ${row.qty > 0 && weightTotal > 0 ? 'text-slate-900' : 'text-zinc-300'}`}>
                              {row.qty > 0 && weightTotal > 0 ? currency(costPerKg) : '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                ))}

                {/* TOTAL ROW */}
                <tr className="bg-green-700 text-white border-t-2 border-green-800">
                  <td className="px-3 py-2 text-[11px] font-black uppercase tracking-widest">Total</td>
                  <td className="px-2 py-2 text-center text-[11px] font-black">{totals.totalQty}</td>
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2 text-right text-[12px] font-black">
                    R$ {currency(totals.totalValue)}
                  </td>
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2 text-right text-[11px] font-black">
                    {totals.totalWeight.toFixed(1)} kg
                  </td>
                  <td className="px-2 py-2 text-right text-[11px] font-black">
                    {totals.totalWeight > 0 ? currency(totals.totalValue / totals.totalWeight) : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* LEGEND */}
          <div className="flex items-center gap-4 pt-2 text-[10px] text-zinc-400 no-print">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded border border-amber-400 bg-amber-50" />
              Preço ajustado manualmente
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded ring-1 ring-green-300 bg-white" />
              Linha com quantidade preenchida
            </span>
          </div>

        </div>
      </div>

      {/* PRINT STYLES */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; inset: 0; padding: 2rem; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}