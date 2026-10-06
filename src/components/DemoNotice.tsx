import { AlertTriangle } from 'lucide-react';

export function DemoNotice() {
  return (
    <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-bold">Modo DEMO</p>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            Los puntajes, palabras clave, competidores, oportunidades y evolución que ves en esta etapa son datos de demostración,
            salvo que la pantalla indique expresamente una fuente real. Visibility AI nunca debe presentar una estimación o un ejemplo
            como si fuera una medición verificada.
          </p>
        </div>
      </div>
    </div>
  );
}
