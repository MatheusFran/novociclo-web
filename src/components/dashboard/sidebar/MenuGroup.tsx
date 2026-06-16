import { ChevronDown, ChevronRight } from 'lucide-react';
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import * as Icons from 'lucide-react';

interface MenuGroupProps {
  icon: string;
  label: string;
  isActive: boolean;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export function MenuGroup({ icon, label, isActive, isOpen, onToggle, children }: MenuGroupProps) {
  const IconComponent = Icons[icon as keyof typeof Icons] as React.ComponentType<{ className: string }>;

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={label}
          isActive={isActive}
          className="h-11 hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/10 data-[active=true]:bg-gradient-to-r data-[active=true]:from-primary/15 data-[active=true]:to-accent/15 cursor-pointer transition-all duration-200 rounded-lg"
          onClick={onToggle}
        >
          <IconComponent className={`w-5 h-5 transition-colors ${isActive ? 'text-primary' : 'text-primary/60'}`} />
          <span className={`font-semibold text-sm tracking-wide flex-1 ${isActive ? 'text-primary' : 'text-primary/70'}`}>
            {label}
          </span>
          {isOpen
            ? <ChevronDown className="w-3.5 h-3.5 text-primary/40 group-data-[collapsible=icon]:hidden" />
            : <ChevronRight className="w-3.5 h-3.5 text-primary/40 group-data-[collapsible=icon]:hidden" />
          }
        </SidebarMenuButton>
      </SidebarMenuItem>
      {isOpen && children}
    </>
  );
}
