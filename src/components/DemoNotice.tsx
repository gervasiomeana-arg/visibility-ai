import { AlertTriangle } from 'lucide-react';

export function DemoNotice() {
  return (
    <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-bold">Modo DEMO</p>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            Visibility AI ya puede mostrar una auditoría SEO técnica con datos reales cuando la pantalla lo indica. Los puntajes globales, palabras clave, competidores, oportunidades y evolución continúan en DEMO hasta conectar sus fuentes reales.
          </p>
        </div>
      </div>
    </div>
  );
}
