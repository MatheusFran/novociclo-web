'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
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
    <div className={`bg-white border rounded-xl ${compact ? 'p-3' : 'p-4'} space-y-3`}>
      {title && (
        <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-muted-foreground">
          {title}
        </p>
      )}

      <div className={`grid ${gridCols} gap-2`}>
        {fields.map(field => (
          <div key={field.key} className={field.className}>
            {field.type === 'search' && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder={field.placeholder || 'Buscar...'}
                  className="pl-8 h-8 text-[12px] sm:text-xs font-bold"
                  value={field.value}
                  onChange={e => field.onChange(e.target.value)}
                />
              </div>
            )}

            {field.type === 'select' && (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-8 text-[12px] sm:text-xs">
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
                className="h-8 text-[11px] sm:text-xs"
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
          className="h-8 text-[9px] sm:text-[10px] font-black uppercase text-muted-foreground"
          onClick={onClear}
        >
          Limpar Filtros
        </Button>
      )}
    </div>
  );
}
