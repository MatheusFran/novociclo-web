'use client';

import { Card, CardContent } from '@/components/ui/card';
import { ReactNode } from 'react';

export interface SummaryCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: ReactNode;
  color?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  highlight?: boolean;
  className?: string;
}

const colorClasses: Record<string, string> = {
  default: 'text-foreground',
  primary: 'text-primary',
  success: 'text-green-600',
  warning: 'text-yellow-600',
  danger: 'text-red-600',
  info: 'text-indigo-600',
};

const bgClasses: Record<string, string> = {
  default: 'bg-white',
  primary: 'bg-primary text-primary-foreground',
  success: 'bg-white',
  warning: 'bg-white',
  danger: 'bg-white',
  info: 'bg-white',
};

export function SummaryCard({
  label,
  value,
  unit = '',
  icon,
  color = 'default',
  highlight = false,
  className = '',
}: SummaryCardProps) {
  const textColorClass = color === 'primary' ? 'text-primary-foreground' : colorClasses[color];
  const bgClass = highlight ? bgClasses[color] : 'bg-white';
  const isBgPrimary = color === 'primary' && highlight;

  return (
    <Card className={`border-none shadow-sm ${bgClass} ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className={`text-[9px] font-black uppercase text-muted-foreground ${isBgPrimary ? 'opacity-70' : ''} tracking-widest mb-1`}>
              {label}
            </p>
            <p className={`text-2xl font-black ${textColorClass}`}>
              {value}{unit && ` ${unit}`}
            </p>
          </div>
          {icon && (
            <div className={`shrink-0 ${isBgPrimary ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
