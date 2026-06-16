'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart,
  Handshake,
  FileCheck,
  Users,
  CirclePercent,
  Warehouse,
  Box,
  BoxesIcon,
  ShoppingBag,
  BarChart3,
  TrendingUp,
  Truck,
  Package,
  Calendar,
  CreditCard,
} from 'lucide-react';

// Map icon names to components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  ShoppingCart,
  Handshake,
  FileCheck,
  Users,
  CirclePercent,
  Warehouse,
  Box,
  BoxesIcon,
  ShoppingBag,
  BarChart3,
  TrendingUp,
  Truck,
  Package,
  Calendar,
  CreditCard,
};

interface CategoryButton {
  label: string;
  icon: string;
  path: string;
  description?: string;
}

interface CategoryButtonsGridProps {
  title: string;
  buttons: CategoryButton[];
}

export function CategoryButtonsGrid({ title, buttons }: CategoryButtonsGridProps) {
  return (
    <div className="w-full">
      <div className="mb-6 border-b border-gray-200 pb-3">
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">Selecione um módulo para gerenciar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {buttons.map(button => {
          const IconComponent = iconMap[button.icon];
          
          return (
            <Link key={button.path} href={button.path} className="block">
              <div className="flex items-start p-4 bg-white border border-gray-200 hover:border-primary/50 hover:bg-slate-50 transition-all duration-200 rounded-sm group h-full">
                <div className="p-2 bg-primary/10 rounded mr-3">
                  {IconComponent && (
                    <IconComponent className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-sm text-gray-900 group-hover:text-primary transition-colors">
                    {button.label}
                  </span>
                  {button.description && (
                    <span className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                      {button.description}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
