import { Info } from 'lucide-react';

export function DemoNotice() {
  return (
    <div className="mb-5 rounded-2xl ring-1 ring-slate-200/70 bg-white/90 px-4 py-3 text-slate-800 shadow-sm">
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
        <div>
          <p className="text-sm font-bold">Fuentes identificadas en cada pantalla</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Visibility AI combina datos reales, parciales y DEMO. Auditoría SEO, PageSpeed y Search Console pueden aportar datos reales cuando están conectados; Keywords, Oportunidades y Evolución también pueden construirse desde esas fuentes. Competidores y cualquier módulo sin fuente verificable permanecen claramente marcados como DEMO.
          </p>
        </div>
      </div>
    </div>
  );
}
