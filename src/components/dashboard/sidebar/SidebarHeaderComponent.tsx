import Link from 'next/link';
import Image from 'next/image';

export function SidebarHeaderComponent() {
  return (
    <Link href="/dashboard" className="flex items-center gap-3 group w-full">
      <div className="w-48 h-12 relative overflow-hidden bg-white shadow-sm border border-primary/20 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10 transition-all duration-300 rounded-sm">
        <Image src="/logo.png" alt="Logo Novo Ciclo" fill className="object-contain p-2" />
      </div>
    </Link>
  );
}
