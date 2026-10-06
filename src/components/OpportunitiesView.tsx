import React from 'react';
import {
  Lightbulb,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Search,
  CheckCircle2,
  Building2,
  Users,
} from 'lucide-react';
import { Opportunity, Business, ActiveTab } from '../types';

interface OpportunitiesViewProps {
  business: Business;
  opportunities: Opportunity[];
  setActiveTab: (tab: ActiveTab) => void;
  onSelectOpportunityForAI: (opp: Opportunity) => void;
}

export const OpportunitiesView: React.FC<OpportunitiesViewProps> = ({
  business,
  opportunities,
  setActiveTab,
  onSelectOpportunityForAI,
}) => {
  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
              <span>CRECIMIENTO COMERCIAL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
              Oportunidades de Negocio Detectadas
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
              Transformamos problemas técnicos y vacíos de contenido en recomendaciones comerciales directas para <strong>{business.name}</strong>.
            </p>
          </div>

          <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 shrink-0">
            <span className="font-bold block mb-0.5">Visibilidad = Más Consultas</span>
            <span className="text-indigo-700">
              Cada oportunidad representa clientes reales que buscan tu servicio en {business.city}.
            </span>
          </div>
        </div>
      </div>

      {/* Opportunities Cards Grid */}
      <div className="space-y-5">
        {opportunities.map((opp, idx) => (
          <div
            key={opp.id}
            className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 hover:border-indigo-300 shadow-sm transition-all relative overflow-hidden"
          >
            {/* Top Indicator */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                  OPORTUNIDAD DETECTADA
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                  Impacto: <strong className="text-slate-900">{opp.potentialImpact}</strong>
                </span>
                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium">
                  {opp.searchDemand}
                </span>
              </div>
            </div>

            {/* Problem Statement */}
            <blockquote className="text-base sm:text-lg font-bold text-slate-900 leading-snug font-heading my-2">
              “{opp.detectedProblem}”
            </blockquote>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-2">
              {opp.simpleExplanation}
            </p>

            {/* Action Box */}
            <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                  Acción recomendada:
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  {opp.commercialAction}
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Título sugerido: <em>{opp.suggestedPageTitle}</em>
                </p>
              </div>

              <button
                onClick={() => onSelectOpportunityForAI(opp)}
                className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-indigo-200 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer hover:scale-105 active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>GENERAR CON IA</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
