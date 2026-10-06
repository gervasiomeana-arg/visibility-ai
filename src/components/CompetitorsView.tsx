import React from 'react';
import {
  Users2,
  TrendingUp,
  ExternalLink,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { Competitor, Business, ActiveTab } from '../types';

interface CompetitorsViewProps {
  business: Business;
  competitors: Competitor[];
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAssistant: () => void;
}

export const CompetitorsView: React.FC<CompetitorsViewProps> = ({
  business,
  competitors,
  setActiveTab,
  onOpenAssistant,
}) => {
  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2">
              <Users2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>BENCHMARKING COMPETITIVO</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
              Análisis de Competidores
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
              Comparativa frente a los 4 competidores directos con mayor presencia digital en <strong>{business.city}</strong>.
            </p>
          </div>

          <div className="bg-slate-900 text-white rounded-xl p-3.5 text-xs shrink-0 max-w-xs">
            <span className="text-amber-300 font-bold block mb-0.5">Visibilidad promedio del sector</span>
            <span className="text-slate-300">
              El líder del mercado en tu zona tiene 88 puntos. Tu negocio tiene {business.scores.overall}.
            </span>
          </div>
        </div>

        {/* Big Alert Banner */}
        <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-amber-950 font-heading">
                Tus competidores aparecen en búsquedas donde tu negocio todavía no aparece.
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Detectamos que hoteles cercanos captan consultas para "hotel familiar", "pileta techada" y "escapada de fin de semana".
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('opportunities')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shrink-0 cursor-pointer shadow-xs"
          >
            Ver oportunidades
          </button>
        </div>
      </div>

      {/* Competitors Comparison Cards */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 font-heading">
          Comparativa de hasta 5 negocios líderes (DEMO)
        </h2>

        <div className="grid grid-cols-1 gap-4">
          {competitors.map((comp) => {
            const isSelf = comp.isCurrentBusiness;

            return (
              <div
                key={comp.id}
                className={`bg-white rounded-2xl p-5 sm:p-6 border transition-all shadow-xs ${
                  isSelf
                    ? 'border-indigo-400 bg-indigo-50/20 ring-2 ring-indigo-200'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Left: Info */}
                  <div className="max-w-md">
                    <div className="flex items-center gap-2 mb-1.5">
                      {isSelf ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-600 text-white px-2 py-0.5 rounded">
                          TU NEGOCIO
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          COMPETIDOR
                        </span>
                      )}
                      <span className="text-xs text-slate-400">·</span>
                      <a
                        href={comp.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 underline truncate"
                      >
                        <span>{comp.url}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 font-heading">
                      {comp.name}
                    </h3>

                    {/* Highlights */}
                    <div className="mt-3 space-y-1 text-xs">
                      {comp.advantages.length > 0 && (
                        <p className="text-slate-600 flex items-start gap-1.5">
                          <strong className="text-slate-900 shrink-0">Puntos fuertes:</strong>
                          <span>{comp.advantages.join(', ')}</span>
                        </p>
                      )}
                      {comp.gaps.length > 0 && (
                        <p className="text-slate-600 flex items-start gap-1.5">
                          <strong className="text-amber-800 shrink-0">Debilidades:</strong>
                          <span>{comp.gaps.join(', ')}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0 lg:w-[540px]">
                    {/* Visibilidad General */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <span className="text-[10px] font-semibold text-slate-500 block uppercase tracking-wider">
                        Visibilidad
                      </span>
                      <span className="text-base font-extrabold text-slate-900 font-heading mt-0.5 block">
                        {comp.visibilityScore}/100
                      </span>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full"
                          style={{ width: `${comp.visibilityScore}%` }}
                        />
                      </div>
                    </div>

                    {/* SEO Score */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <span className="text-[10px] font-semibold text-slate-500 block uppercase tracking-wider">
                        SEO Web
                      </span>
                      <span className="text-base font-extrabold text-slate-900 font-heading mt-0.5 block">
                        {comp.seoScore}/100
                      </span>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full"
                          style={{ width: `${comp.seoScore}%` }}
                        />
                      </div>
                    </div>

                    {/* Contenido */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <span className="text-[10px] font-semibold text-slate-500 block uppercase tracking-wider">
                        Contenido
                      </span>
                      <span className="text-base font-extrabold text-slate-900 font-heading mt-0.5 block">
                        {comp.contentScore}/100
                      </span>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="bg-purple-600 h-full rounded-full"
                          style={{ width: `${comp.contentScore}%` }}
                        />
                      </div>
                    </div>

                    {/* Keywords */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <span className="text-[10px] font-semibold text-slate-500 block uppercase tracking-wider">
                        Keywords
                      </span>
                      <span className="text-base font-extrabold text-slate-900 font-heading mt-0.5 block">
                        {comp.keywordsCount}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-1">posicionadas</span>
                    </div>

                    {/* Local Presence */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-semibold text-slate-500 block uppercase tracking-wider">
                        Google Maps
                      </span>
                      <span className="text-base font-extrabold text-slate-900 font-heading mt-0.5 block">
                        {comp.localPresenceScore}/100
                      </span>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full"
                          style={{ width: `${comp.localPresenceScore}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section: Oportunidades frente a tus competidores */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-lg">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
          <Lightbulb className="w-4 h-4" />
          <span>Oportunidades frente a tus competidores</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold font-heading">
          Estrategias para superarlos en los próximos 30 días
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <h3 className="text-sm font-bold text-white font-heading">
              1. Desbancar en búsquedas familiares
            </h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              El Hotel Costa Galana cobra tarifas altas. Si creas una página de "Hotel familiar con pileta", podés captar a las familias que buscan una excelente relación precio-calidad.
            </p>
            <button
              onClick={() => setActiveTab('content-generator')}
              className="mt-3 text-xs text-indigo-400 hover:text-white font-semibold flex items-center gap-1 cursor-pointer"
            >
              Crear página con IA →
            </button>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <h3 className="text-sm font-bold text-white font-heading">
              2. Superar su velocidad de carga
            </h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              El Hotel Nuevo Horizonte tiene una web no adaptable y lenta. Si optimizas tus fotos a WebP, Google te mostrará primero a los usuarios que buscan desde el celular.
            </p>
            <button
              onClick={() => setActiveTab('action-plan')}
              className="mt-3 text-xs text-indigo-400 hover:text-white font-semibold flex items-center gap-1 cursor-pointer"
            >
              Ver tarea en plan de acción →
            </button>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <h3 className="text-sm font-bold text-white font-heading">
              3. Destacar la pileta climatizada
            </h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              El Hotel Playa Grande Resort capta 980 visitas con su pileta. Tu hotel también cuenta con pileta pero no la promocionas en una página web dedicada.
            </p>
            <button
              onClick={() => setActiveTab('opportunities')}
              className="mt-3 text-xs text-indigo-400 hover:text-white font-semibold flex items-center gap-1 cursor-pointer"
            >
              Ver oportunidad detallada →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
