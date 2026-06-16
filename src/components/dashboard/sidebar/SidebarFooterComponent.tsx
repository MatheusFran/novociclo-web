import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarFooterComponentProps {
  onSignOut: () => void;
}

export function SidebarFooterComponent({ onSignOut }: SidebarFooterComponentProps) {
  return (
    <div className="flex flex-col gap-2 group-data-[collapsible=icon]:items-center">
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-3 text-red-300 hover:text-red-200 hover:bg-red-500/20 font-medium text-sm transition-all duration-200 rounded-sm h-9"
        onClick={onSignOut}
      >
        <LogOut className="w-4 h-4" />
        <span className="group-data-[collapsible=icon]:hidden">Sair</span>
      </Button>
    </div>
  );
}
