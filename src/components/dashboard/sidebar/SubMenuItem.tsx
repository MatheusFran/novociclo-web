import Link from 'next/link';
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import * as Icons from 'lucide-react';

interface SubMenuItemProps {
  icon: string;
  label: string;
  path: string;
  isActive: boolean;
}

export function SubMenuItem({ icon, label, path, isActive }: SubMenuItemProps) {
  const IconComponent = Icons[icon as keyof typeof Icons] as React.ComponentType<{ className: string }>;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={label}
        className="h-9 pl-8 hover:bg-accent/5 data-[active=true]:bg-accent/10 group-data-[collapsible=icon]:pl-0 transition-all duration-200 rounded-lg text-xs"
      >
        <Link href={path} className="flex items-center gap-3">
          <IconComponent className={`w-4 h-4 transition-colors ${isActive ? 'text-accent' : 'text-primary/50'}`} />
          <span className={`font-medium text-xs ${isActive ? 'text-primary' : 'text-primary/60'}`}>
            {label}
          </span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
