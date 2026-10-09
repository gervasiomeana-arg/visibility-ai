import React from 'react';
import {
  BarChart3,
  Search,
  Globe,
  Sparkles,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  MapPin,
} from 'lucide-react';
import { Business, ActiveTab, ExecutiveIssue } from '../types';

interface DashboardOverviewProps {
  business: Business;
  issues: ExecutiveIssue[];
  searchConsoleMeta?: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    startDate: string;
    endDate: string;
    loadedAt: string;
  } | null;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAssistant: () => void;
  onGenerateOpportunity: (oppId: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  business,
  issues,
  searchConsoleMeta,
  setActiveTab,
  onOpenAssistant,
}) => {
  const { scores } = business;
  const scoreSources = business.scoreSources || {
    overall: 'demo',
    google: 'demo',
    seo: 'demo',
    web: 'demo',
    aiVisibility: 'demo',
  };
  const labelForSource = (source: 'demo' | 'partial' | 'real') =>
    source === 'real' ? 'DATO REAL' : source === 'partial' ? 'PARCIAL REAL' : 'DEMO';
  const hasSearchConsole = Boolean(searchConsoleMeta && searchConsoleMeta.impressions >= 0);

  // Filter top issues
  const highIssues = issues.filter((i) => i.severity === 'high');
  const mediumIssues = issues.filter((i) => i.severity === 'medium');
  const okIssues = issues.filter((i) => i.severity === 'ok');
  const isRealDiagnosis = issues.length > 0 && issues.every((issue) => issue.source === 'real');
  const unresolvedIssues = highIssues.length + mediumIssues.length;

  return (
    <div className="space-y-7 sm:space-y-8 pb-14">
      {/* Top Welcome & Business Header */}
      <div className="vai-shell">
        <div className="vai-core vai-panel p-6 sm:p-8 lg:p-9 flex flex-col md:flex-row md:items-center justify-between gap-7">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-indigo-600 mb-2 tracking-[0.08em] uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>{scoreSources.seo === 'real' || scoreSources.web === 'real' ? 'Diagnóstico con datos reales' : 'Diagnóstico demo'}</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-500 normal-case tracking-normal">{business.category}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-slate-950 font-heading tracking-[-0.04em] text-balance">
              {business.name}
            </h1>

            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-500">
              <a
                href={business.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-slate-700 hover:text-indigo-600 font-medium"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="truncate max-w-[16rem] sm:max-w-md">{business.url}</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {business.city}, {business.country}
              </span>
            </div>
          </div>

          <div className="bg-slate-950 text-white rounded-[1.4rem] p-5 sm:p-6 flex items-center gap-6 shrink-0 shadow-[0_20px_50px_rgba(15,23,42,0.18)] ring-1 ring-white/10">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.14em] block">
                Visibilidad digital
              </span>
              <p className="text-[11px] text-emerald-400 font-medium mt-2">
                {labelForSource(scoreSources.overall)}
              </p>
            </div>
            <div className="w-20 h-20 rounded-full ring-[6px] ring-white/8 flex items-center justify-center bg-white/[0.06]">
              <div className="text-center font-tabular">
                <span className="text-3xl font-black text-white font-heading">
                  {scores.overall}
                </span>
                <span className="text-[10px] text-slate-400 block -mt-1 font-bold">
                  /100
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The 4 Core Indicators */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 font-heading">
            Indicadores Clave de Visibilidad
          </h2>
          <span className="text-xs text-slate-500">
            Arquitectura modular para conexión con APIs reales
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Google / Search Console */}
          <div className="vai-panel rounded-[1.35rem] p-5 ring-1 ring-slate-200/60 hover:-translate-y-0.5 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              {hasSearchConsole ? (
                <span className="text-2xl font-extrabold text-slate-900 font-heading">
                  {searchConsoleMeta!.position > 0 ? searchConsoleMeta!.position.toFixed(1) : '—'}
                  <span className="text-xs text-slate-400 font-normal"> pos. media</span>
                </span>
              ) : (
                <span className="text-2xl font-extrabold text-slate-900 font-heading">
                  {scores.google} <span className="text-xs text-slate-400 font-normal">/100</span>
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-4 font-heading">Google</h3>
            {hasSearchConsole ? (
              <div className="mt-1 space-y-1 text-xs text-slate-500">
                <p>{searchConsoleMeta!.impressions.toLocaleString('es-AR')} impresiones · {searchConsoleMeta!.clicks.toLocaleString('es-AR')} clics</p>
                <p>{(searchConsoleMeta!.ctr * 100).toFixed(1)}% CTR · Search Console</p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Search Console todavía no está conectado. Google Maps y perfil local siguen pendientes de fuente real.
              </p>
            )}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className={`font-semibold px-2 py-0.5 rounded ${hasSearchConsole ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'}`}>
                {hasSearchConsole ? 'PARCIAL REAL' : labelForSource(scoreSources.google)}
              </span>
              <button
                onClick={() => setActiveTab('keywords')}
                className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-0.5 cursor-pointer"
              >
                Ver búsquedas <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* SEO */}
          <div className="vai-panel rounded-[1.35rem] p-5 ring-1 ring-slate-200/60 hover:-translate-y-0.5 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Search className="w-5 h-5" />
              </div>
              <span className="text-2xl font-extrabold text-slate-900 font-heading">
                {scores.seo} <span className="text-xs text-slate-400 font-normal">/100</span>
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-4 font-heading">SEO</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Puntaje calculado desde señales técnicas verificadas del sitio. Rankings y tráfico todavía no forman parte de este score.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded">
                {labelForSource(scoreSources.seo)}
              </span>
              <button
                onClick={() => setActiveTab('keywords')}
                className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-0.5 cursor-pointer"
              >
                Ver keywords <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Web */}
          <div className="vai-panel rounded-[1.35rem] p-5 ring-1 ring-slate-200/60 hover:-translate-y-0.5 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <span className="text-2xl font-extrabold text-slate-900 font-heading">
                {scores.web} <span className="text-xs text-slate-400 font-normal">/100</span>
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-4 font-heading">Web</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Rendimiento móvil desde Google PageSpeed cuando está disponible, más señales técnicas del sitio.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                {labelForSource(scoreSources.web)}
              </span>
              <button
                onClick={() => setActiveTab('seo')}
                className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-0.5 cursor-pointer"
              >
                Ver auditoría <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Visibilidad IA */}
          <div className="vai-panel rounded-[1.35rem] p-5 ring-1 ring-slate-200/60 hover:-translate-y-0.5 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-2xl font-extrabold text-slate-900 font-heading">
                {scores.aiVisibility} <span className="text-xs text-slate-400 font-normal">/100</span>
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-4 font-heading">Visibilidad IA</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Presencia en respuestas de ChatGPT, Gemini, Perplexity y Google AI Overviews.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded">
                {labelForSource(scoreSources.aiVisibility)}
              </span>
              <button
                onClick={() => setActiveTab('opportunities')}
                className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-0.5 cursor-pointer"
              >
                Optimizar con IA <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Executive Summary Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3">
              <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
              <span>{isRealDiagnosis ? 'RESUMEN EJECUTIVO · DATOS REALES' : 'RESUMEN EJECUTIVO COMERCIAL'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-heading">
              {isRealDiagnosis
                ? `Detectamos ${issues.length} señales técnicas verificadas; ${unresolvedIssues} requieren atención.`
                : `Mostramos ${business.totalOpportunities} oportunidades de ejemplo para validar cómo se verá el diagnóstico.`}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              {isRealDiagnosis
                ? 'Estos resultados provienen de la última auditoría técnica guardada para este sitio. Rankings, Google Maps y demanda comercial siguen pendientes de sus fuentes reales.'
                : 'En esta fase los hallazgos son ejemplos de producto. Las próximas integraciones convertirán estas tarjetas en resultados verificables.'}
            </p>
          </div>

          <button
            onClick={() => setActiveTab('executive-summary')}
            className="px-5 py-3 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold uppercase tracking-wider shadow-md shrink-0 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-105"
          >
            <span>VER RESUMEN COMPLETO</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Categories Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
          <button
            onClick={() => setActiveTab('executive-summary')}
            className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] text-left"
          >
            <div>
              <span className="text-xs font-semibold text-rose-300 block">Problemas importantes</span>
              <span className="text-[11px] text-slate-400">{isRealDiagnosis ? 'Hallazgos reales de alto impacto' : 'Ejemplos de alto impacto'}</span>
            </div>
            <span className="text-lg font-black text-rose-400">{highIssues.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('executive-summary')}
            className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] text-left"
          >
            <div>
              <span className="text-xs font-semibold text-amber-300 block">Mejoras recomendadas</span>
              <span className="text-[11px] text-slate-400">{isRealDiagnosis ? 'Hallazgos reales a mejorar' : 'Ejemplos de mejora'}</span>
            </div>
            <span className="text-lg font-black text-amber-400">{mediumIssues.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('executive-summary')}
            className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] text-left"
          >
            <div>
              <span className="text-xs font-semibold text-emerald-300 block">Elementos correctos</span>
              <span className="text-[11px] text-slate-400">{isRealDiagnosis ? 'Señales verificadas correctas' : 'Ejemplos positivos'}</span>
            </div>
            <span className="text-lg font-black text-emerald-400">{okIssues.length}</span>
          </button>
        </div>
      </div>

      {/* Two Columns: Top Critical Issues & Quick Action Prompts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Issues Preview */}
        <div className="vai-panel rounded-[1.5rem] p-6 ring-1 ring-slate-200/60">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Problemas más urgentes
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('action-plan')}
              className="text-xs text-indigo-600 font-semibold hover:underline"
            >
              Ver plan de acción
            </button>
          </div>

          <div className="space-y-3">
            {highIssues.length === 0 && (
              <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/60 text-xs text-emerald-800">
                {isRealDiagnosis
                  ? 'La última auditoría no detectó problemas críticos. Revisá las mejoras recomendadas para seguir optimizando.'
                  : 'No hay problemas críticos disponibles en este ejemplo.'}
              </div>
            )}
            {highIssues.slice(0, 3).map((issue) => (
              <div
                key={issue.id}
                className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/50 hover:bg-rose-50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">
                    {issue.name}
                  </h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded shrink-0">
                    URGENTE
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {issue.simpleExplanation}
                </p>
                <div className="mt-2.5 pt-2 border-t border-rose-100/70 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Solución: {issue.possibleSolution}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next actions / Commercial demo */}
        <div className="vai-panel rounded-[1.5rem] p-6 ring-1 ring-slate-200/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  {isRealDiagnosis ? 'Próximas acciones reales' : 'Oportunidades Comerciales DEMO'}
                </h3>
              </div>
              <button
                onClick={() => setActiveTab(isRealDiagnosis ? 'action-plan' : 'opportunities')}
                className="text-xs text-indigo-600 font-semibold hover:underline"
              >
                {isRealDiagnosis ? `Ver plan (${unresolvedIssues})` : `Ver todas (${business.totalOpportunities})`}
              </button>
            </div>

            {isRealDiagnosis ? (
              <div className="space-y-3">
                {[...highIssues, ...mediumIssues].slice(0, 3).map((issue) => (
                  <button
                    key={issue.id}
                    onClick={() => setActiveTab('action-plan')}
                    className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                  >
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${issue.severity === 'high' ? 'text-rose-700' : 'text-amber-700'}`}>
                      {issue.severity === 'high' ? 'URGENTE' : 'MEJORA'}
                    </span>
                    <p className="mt-1 text-xs font-bold text-slate-900">{issue.name}</p>
                    <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">{issue.possibleSolution}</p>
                  </button>
                ))}
                {unresolvedIssues === 0 && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                    No quedan hallazgos técnicos pendientes en la última auditoría.
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  EJEMPLO DE OPORTUNIDAD
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                  “Ejemplo: una búsqueda local relevante podría justificar crear una página específica para ese servicio.”
                </p>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Acción de ejemplo: <strong>crear una página enfocada en una necesidad local concreta</strong> cuando los datos reales confirmen la oportunidad.
                </p>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500 font-medium">
                    Demanda: pendiente de fuente real
                  </span>
                  <button
                    onClick={() => setActiveTab('content-generator')}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>GENERAR CON IA</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* AI Assistant Callout */}
          <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div className="text-xs text-slate-700">
                <span className="font-bold block">¿Tenés dudas sobre tu diagnóstico?</span>
                <span className="text-slate-500">Preguntale al Asistente IA de Visibility</span>
              </div>
            </div>
            <button
              onClick={onOpenAssistant}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline shrink-0 cursor-pointer"
            >
              Abrir chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
