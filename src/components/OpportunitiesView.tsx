import React from 'react';
import { Lightbulb, Sparkles, ArrowRight } from 'lucide-react';
import { Opportunity, Business, ActiveTab } from '../types';
import { opportunityEvidence, opportunityKind } from '../../shared/opportunityEvidence';
import { measurementDateLabel } from '../../shared/reportEvidence';

interface OpportunitiesViewProps {
  business: Business;
  opportunities: Opportunity[];
  setActiveTab: (tab: ActiveTab) => void;
  onSelectOpportunityForAI: (opp: Opportunity) => void;
}

export const OpportunitiesView: React.FC<OpportunitiesViewProps> = ({ business, opportunities, setActiveTab, onSelectOpportunityForAI }) => {
  const { visible, mode } = opportunityEvidence(opportunities, business.id);
  return <div className="space-y-6 pb-14">
    <header className="vai-panel rounded-xl p-6 sm:p-8 ring-1 ring-slate-200/60">
      <p className="flex items-center gap-2 text-xs text-indigo-600 mb-2"><Lightbulb className="w-4 h-4" />{mode}</p>
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">Oportunidades para revisar</h1>
      <p className="text-sm text-slate-600 mt-2">Propuestas para <strong>{business.name}</strong>. Las mediciones respaldan el dato observado; la acción sugerida requiere revisión.</p>
      <p className="text-xs text-slate-500 mt-3">Las impresiones no equivalen al volumen total de búsquedas ni garantizan consultas. La prioridad es orientativa y no predice resultados comerciales.</p>
    </header>
    {!visible.length && <div className="vai-panel p-8 text-center text-sm text-slate-600">Todavía no hay oportunidades con evidencia disponible para este negocio. Ejecutá una auditoría o cargá datos de Search Console.</div>}
    <div className="space-y-5">{visible.map((opp, index) => {
      const technical = opportunityKind(opp) === 'technical';
      const backed = (opp.source === 'seo-audit' || opp.source === 'search-console') && !!opp.evidenceText?.trim();
      const isDemo = opp.source === 'demo';
      const canAct = backed || isDemo;
      return <article key={opp.id} className="vai-panel rounded-xl p-6 sm:p-7 border border-slate-200 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-indigo-600">{index + 1}. {isDemo ? 'EJEMPLO DEMO' : backed ? `PROPUESTA · ${opp.source === 'seo-audit' ? 'AUDITORÍA' : 'SEARCH CONSOLE'}` : 'SIN EVIDENCIA VERIFICABLE'}</span>
          <span className="text-slate-500">Prioridad propuesta: {opp.potentialImpact}</span>
        </div>
        <h2 className="text-lg font-bold text-slate-900 font-heading break-words">{opp.detectedProblem}</h2>
        <p className="text-sm text-slate-600 break-words">{opp.simpleExplanation}</p>
        {backed && <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 space-y-1 break-words">
          <p><strong>Dato y criterio:</strong> {opp.evidenceText}</p>
          <p>Medición o carga: {measurementDateLabel(opp.checkedAt, business.locale || 'es-AR', business.timezone || 'America/Argentina/Buenos_Aires')}.</p>
          {opp.evidenceUrl && <p className="break-all">Fuente: {opp.evidenceUrl}</p>}
          {opp.periodStart && opp.periodEnd && <p>Período: {opp.periodStart} a {opp.periodEnd}.</p>}
          <p>Esta evidencia no garantiza el resultado de la propuesta.</p>
        </div>}
        {isDemo && <p className="text-xs text-amber-800">Los datos y la demanda de este ejemplo no son mediciones del negocio.</p>}
        {!isDemo && !backed && <p className="text-xs text-amber-800">Falta evidencia para usar este registro como recomendación del cliente.</p>}
        <div className="rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="min-w-0"><p className="text-xs font-semibold text-slate-500 mb-1">{technical ? 'Revisión técnica propuesta' : 'Contenido propuesto'}</p>
            <p className="text-sm text-slate-900 break-words">{opp.commercialAction}</p>
            {!technical && <p className="text-xs text-slate-500 mt-2">Antes de redactar, confirmá que el tema corresponde a un servicio real del negocio. Un borrador no modifica ni publica la web.</p>}
          </div>
          <button disabled={!canAct} onClick={() => technical ? setActiveTab('seo') : onSelectOpportunityForAI(opp)} className="vai-button vai-button-primary shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">
            {technical ? <ArrowRight className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}{technical ? 'Revisar en auditoría' : 'Preparar borrador'}
          </button>
        </div>
      </article>;
    })}</div>
  </div>;
};
