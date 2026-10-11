import { Info } from 'lucide-react';

export function DemoNotice() {
  return <details className="vai-source-note no-print">
    <summary><Info size={14} /><span>Cada resultado identifica su fuente</span><span className="vai-source-more">Ver criterio</span></summary>
    <p>Los datos reales provienen de mediciones o conexiones verificadas. Los resultados parciales indican su alcance. Los ejemplos permanecen etiquetados como DEMO; no representan mediciones de tu negocio.</p>
  </details>;
}
