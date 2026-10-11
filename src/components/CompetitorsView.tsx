import React from 'react';
import { Users2, ExternalLink } from 'lucide-react';
import { Competitor, Business, ActiveTab } from '../types';
import { safePublicUrl } from '../../shared/opportunityEvidence';

interface CompetitorsViewProps {
  business: Business;
  competitors: Competitor[];
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAssistant: () => void;
}

export const CompetitorsView: React.FC<CompetitorsViewProps> = ({ business, competitors, setActiveTab }) => {
  const own = competitors.filter(item => item.businessId === business.id);
  const demoOnly = own.length > 0 && own.every(item => item.source === 'demo');
  const metrics: { key: keyof Competitor; label: string; score?: boolean }[] = [
    { key: 'visibilityScore', label: 'Visibilidad', score: true }, { key: 'seoScore', label: 'SEO', score: true },
    { key: 'contentScore', label: 'Contenido', score: true }, { key: 'keywordsCount', label: 'Palabras clave' },
    { key: 'localPresenceScore', label: 'Google Maps', score: true },
  ];
  return <div className="space-y-6 pb-12">
    <header className="vai-panel rounded-xl p-6 sm:p-8 ring-1 ring-slate-200/60">
      <p className="flex items-center gap-2 text-xs text-indigo-600 mb-2"><Users2 className="w-4 h-4" />{!own.length ? 'SIN DATOS COMPETITIVOS' : demoOnly ? 'COMPARACIÓN DEMO' : 'REGISTROS POR VALIDAR'}</p>
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">Referencias y competidores</h1>
      <p className="text-sm text-slate-600 mt-2">Referencias para <strong>{business.name}</strong>. Visibility todavía no dispone de una fuente integrada que mida posiciones o brechas entre estos negocios.</p>
      <p className="text-xs text-slate-500 mt-3">Una URL o un registro marcado como real no verifica sus puntajes, ventajas ni debilidades. Los ejemplos se identifican por separado y los puntajes sin método de medición permanecen vacíos.</p>
    </header>
    {!own.length && <div className="vai-panel p-8 text-center text-sm text-slate-600">No hay referencias registradas para este negocio. Esto no significa que no tenga competidores.</div>}
    <div className="space-y-4">{own.map(comp => {
      const isDemo = comp.source === 'demo';
      const url = safePublicUrl(comp.url);
      const observations = [...(comp.advantages || []), ...(comp.gaps || [])];
      return <article key={comp.id} className="vai-panel rounded-xl p-5 sm:p-6 border border-slate-200 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-indigo-600">{isDemo ? 'EJEMPLO DEMO' : 'REFERENCIA SIN COMPARACIÓN VERIFICADA'}{comp.isCurrentBusiness ? ' · Tu negocio' : ''}</span>
          {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 max-w-full items-center gap-1 text-slate-500 underline"><span className="break-all">{url}</span><ExternalLink className="w-3 h-3 shrink-0" /></a> : <span className="text-slate-500">URL no válida para abrir</span>}
        </div>
        <h2 className="text-lg font-bold text-slate-900 font-heading break-words">{comp.name}</h2>
        {observations.length > 0 && <p className="text-xs text-slate-600 break-words"><strong>{isDemo ? 'Características de ejemplo: ' : 'Observaciones registradas, pendientes de comprobar: '}</strong>{observations.join('; ')}</p>}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">{metrics.map(metric => {
          const value = comp[metric.key];
          const valid = typeof value === 'number' && Number.isFinite(value) && value >= 0 && (!metric.score || value <= 100);
          return <div key={metric.key} className="rounded-xl bg-slate-50 p-3 text-center">
            <p className="text-xs text-slate-500">{metric.label}</p><p className="text-lg font-bold text-slate-900 mt-1">{isDemo && valid ? `${value}${metric.score ? '/100' : ''}` : '—'}</p>
            <p className="text-[10px] text-slate-500">{isDemo ? 'DEMO' : 'SIN MEDICIÓN'}</p>
          </div>;
        })}</div>
      </article>;
    })}</div>
    <div className="vai-panel p-6 space-y-3"><h2 className="text-base font-bold text-slate-900">Trabajar con las fuentes disponibles</h2>
      <p className="text-sm text-slate-600">Search Console informa sobre tu sitio; sus datos no demuestran que otro negocio aparece antes. Revisá las oportunidades y la auditoría con el alcance indicado.</p>
      <div className="flex flex-wrap gap-3"><button className="vai-button vai-button-secondary" onClick={() => setActiveTab('keywords')}>Ver búsquedas del negocio</button><button className="vai-button vai-button-secondary" onClick={() => setActiveTab('opportunities')}>Ver oportunidades</button></div>
    </div>
  </div>;
};
