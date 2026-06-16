'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, RotateCcw } from 'lucide-react';
import { ReactNode } from 'react';

export interface FilterField {
  type: 'search' | 'select' | 'date' | 'custom';
  key: string;
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  options?: { label: string; value: string }[];
  className?: string;
  customContent?: ReactNode;
}

export interface FilterPanelProps {
  title?: string;
  fields: FilterField[];
  onClear: () => void;
  gridCols?: string;
  compact?: boolean;
  showClearButton?: boolean;
}

export function FilterPanel({
  title = 'Filtros',
  fields,
  onClear,
  gridCols = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4',
  compact = false,
  showClearButton = true,
}: FilterPanelProps) {
  return (
    <div className={`bg-white border border-slate-200 rounded-md ${compact ? 'p-3' : 'p-4 lg:p-5'} space-y-3 shadow-sm`}>
      {title && (
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </p>
      )}

      <div className={`grid ${gridCols} gap-3`}>
        {fields.map(field => (
          <div key={field.key} className={field.className}>
            {field.type === 'search' && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder={field.placeholder || 'Buscar...'}
                  className="pl-9 h-9 text-xs border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 rounded-md"
                  value={field.value}
                  onChange={e => field.onChange(e.target.value)}
                />
              </div>
            )}

            {field.type === 'select' && (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-9 text-xs rounded-md border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20">
                  <SelectValue placeholder={field.placeholder || 'Selecionar'} />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {field.type === 'date' && (
              <Input
                type="date"
                className="h-9 text-xs rounded-md border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                value={field.value}
                onChange={e => field.onChange(e.target.value)}
              />
            )}

            {field.type === 'custom' && field.customContent}
          </div>
        ))}
      </div>

      {showClearButton && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs font-semibold uppercase text-slate-500 hover:text-slate-800 hover:bg-slate-100 gap-2 rounded-md transition-all"
          onClick={onClear}
        >
          <RotateCcw className="w-3 h-3" />
          Limpar Filtros
        </Button>
      )}
    </div>
  );
}
