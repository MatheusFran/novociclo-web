import Link from 'next/link';
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import * as Icons from 'lucide-react';

interface SimpleMenuItemProps {
  icon: string;
  label: string;
  path: string;
  isActive: boolean;
}

export function SimpleMenuItem({ icon, label, path, isActive }: SimpleMenuItemProps) {
  const IconComponent = Icons[icon as keyof typeof Icons] as React.ComponentType<{ className: string }>;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={label}
        className="h-9 hover:bg-white/10 data-[active=true]:bg-white/15 transition-all duration-200"
      >
        <Link href={path} className="flex items-center gap-3">
          <IconComponent className={`w-4 h-4 transition-colors ${isActive ? 'text-white' : 'text-white/60'}`} />
          <span className={`font-medium text-sm ${isActive ? 'text-white' : 'text-white/80'}`}>
            {label}
          </span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
