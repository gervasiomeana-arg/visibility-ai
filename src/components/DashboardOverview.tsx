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
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAssistant: () => void;
  onGenerateOpportunity: (oppId: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  business,
  issues,
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

  // Filter top issues
  const highIssues = issues.filter((i) => i.severity === 'high');
  const mediumIssues = issues.filter((i) => i.severity === 'medium');
  const okIssues = issues.filter((i) => i.severity === 'ok');

  return (
    <div className="space-y-8 pb-12">
      {/* Top Welcome & Business Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{scoreSources.seo === 'real' || scoreSources.web === 'real' ? 'DIAGNÓSTICO CON DATOS REALES' : 'DIAGNÓSTICO DEMO'}</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500">{business.category}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
            {business.name}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
            <a
              href={business.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-slate-700 hover:text-indigo-600 font-medium underline"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{business.url}</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
            <span>·</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {business.city}, {business.country}
            </span>
          </div>
        </div>

        {/* Global Score Card */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 flex items-center gap-6 shrink-0 shadow-md">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Puntuación General
            </span>
            <span className="text-xs text-slate-300 font-bold block mt-0.5">
              VISIBILIDAD DIGITAL
            </span>
            <p className="text-[11px] text-emerald-400 font-medium mt-1">
              {labelForSource(scoreSources.overall)}
            </p>
          </div>
          <div className="relative flex items-center justify-center">
            <div className="w-20 h-20 rounded-full border-4 border-slate-700 flex items-center justify-center bg-slate-800">
              <div className="text-center">
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
          {/* Google */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-indigo-200 transition-all">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <span className="text-2xl font-extrabold text-slate-900 font-heading">
                {scores.google} <span className="text-xs text-slate-400 font-normal">/100</span>
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-4 font-heading">Google</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Google Maps, perfil local verificado y presencia en búsquedas por cercanía.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                {labelForSource(scoreSources.google)}
              </span>
              <button
                onClick={() => setActiveTab('seo')}
                className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-0.5 cursor-pointer"
              >
                Ver detalle <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* SEO */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-indigo-200 transition-all">
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
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-indigo-200 transition-all">
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
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-indigo-200 transition-all relative overflow-hidden">
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
              <span>RESUMEN EJECUTIVO COMERCIAL</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-heading">
              Mostramos {business.totalOpportunities} oportunidades de ejemplo para validar cómo se verá el diagnóstico.
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              En esta fase los hallazgos son ejemplos de producto. Las próximas integraciones convertirán estas tarjetas en resultados verificables.
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
            className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left"
          >
            <div>
              <span className="text-xs font-semibold text-rose-300 block">🔴 Problemas importantes</span>
              <span className="text-[11px] text-slate-400">Ejemplos de alto impacto</span>
            </div>
            <span className="text-lg font-black text-rose-400">{highIssues.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('executive-summary')}
            className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left"
          >
            <div>
              <span className="text-xs font-semibold text-amber-300 block">🟡 Mejoras recomendadas</span>
              <span className="text-[11px] text-slate-400">Ejemplos de mejora</span>
            </div>
            <span className="text-lg font-black text-amber-400">{mediumIssues.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('executive-summary')}
            className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left"
          >
            <div>
              <span className="text-xs font-semibold text-emerald-300 block">🟢 Elementos correctos</span>
              <span className="text-[11px] text-slate-400">Ejemplos positivos</span>
            </div>
            <span className="text-lg font-black text-emerald-400">{okIssues.length}</span>
          </button>
        </div>
      </div>

      {/* Two Columns: Top Critical Issues & Quick Action Prompts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Issues Preview */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
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
            {highIssues.slice(0, 3).map((issue) => (
              <div
                key={issue.id}
                className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/50 hover:bg-rose-50 transition-colors"
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

        {/* Commercial Opportunities Preview */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Oportunidades Comerciales DEMO
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('opportunities')}
                className="text-xs text-indigo-600 font-semibold hover:underline"
              >
                Ver todas ({business.totalOpportunities})
              </button>
            </div>

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
