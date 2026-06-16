'use client';

import { useSystemData } from '@/server/store';
import { Loader2 } from 'lucide-react';

export default function EstoquePage() {
  const { isReady } = useSystemData();

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <Loader2 className="w-12 h-12 text-muted-foreground opacity-40" />
      <div className="text-center">
        <h2 className="text-lg font-black uppercase text-muted-foreground">Em Desenvolvimento</h2>
        <p className="text-xs text-muted-foreground mt-1">Esta funcionalidade estará disponível em breve</p>
      </div>
    </div>
  );
}