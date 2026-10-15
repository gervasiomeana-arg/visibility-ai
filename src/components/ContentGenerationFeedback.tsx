import React from 'react';
import { Loader2 } from 'lucide-react';

export function ContentGenerationFeedback({ generating, error, hasDraft }: { generating: boolean; error: string; hasDraft: boolean }) {
  if (generating) return <div role="status" className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
    <p className="flex items-center gap-2 font-semibold"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Generando tu borrador…</p>
    <p className="mt-1">El resultado aparecerá aquí. Puede tardar hasta un minuto; mantené esta sección abierta.</p>
    {hasDraft && <p className="mt-1">Mientras tanto, se conserva el borrador anterior.</p>}
  </div>;
  if (error) return <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
    <p className="font-semibold">No se generó un nuevo contenido</p>
    <p className="mt-1 whitespace-pre-wrap">{error}</p>
    {hasDraft && <p className="mt-2">El texto anterior se conserva abajo. Corregí lo indicado y volvé a generar.</p>}
  </div>;
  return null;
}
