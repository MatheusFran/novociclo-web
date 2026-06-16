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
  success: 'text-accent',
  warning: 'text-yellow-600',
  danger: 'text-red-600',
  info: 'text-indigo-600',
};

const bgClasses: Record<string, string> = {
  default: 'bg-gradient-to-br from-white to-primary/5',
  primary: 'bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/20',
  success: 'bg-gradient-to-br from-white to-accent/10',
  warning: 'bg-gradient-to-br from-white to-yellow-50',
  danger: 'bg-gradient-to-br from-white to-red-50',
  info: 'bg-gradient-to-br from-white to-indigo-50',
};

const borderClasses: Record<string, string> = {
  default: 'border border-primary/10',
  primary: 'border border-primary/20',
  success: 'border border-accent/20',
  warning: 'border border-yellow-200',
  danger: 'border border-red-200',
  info: 'border border-indigo-200',
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
  const bgClass = highlight ? bgClasses[color] : bgClasses['default'];
  const borderClass = highlight ? borderClasses[color] : borderClasses['default'];
  const isBgPrimary = color === 'primary' && highlight;

  return (
    <Card className={`${borderClass} shadow-md hover:shadow-lg transition-all duration-300 ${bgClass} ${className}`}>
      <CardContent className="p-5 lg:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className={`text-xs font-bold uppercase text-muted-foreground ${isBgPrimary ? 'text-white/70' : ''} tracking-wide mb-2`}>
              {label}
            </p>
            <p className={`text-3xl lg:text-4xl font-black ${textColorClass} truncate`}>
              {value}{unit && ` ${unit}`}
            </p>
          </div>
          {icon && (
            <div className={`shrink-0 w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300 ${
              isBgPrimary 
                ? 'bg-white/20 text-white' 
                : color === 'primary' 
                ? 'bg-primary/10 text-primary' 
                : color === 'success' 
                ? 'bg-accent/10 text-accent'
                : 'bg-primary/5 text-primary'
            }`}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
