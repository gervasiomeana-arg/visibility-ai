import React, { useState } from 'react';
import {
  FileCheck2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Filter,
  ArrowRight,
  Sparkles,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ExecutiveIssue, Business, ActiveTab } from '../types';

interface ExecutiveSummaryViewProps {
  business: Business;
  issues: ExecutiveIssue[];
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAssistant: () => void;
}

export const ExecutiveSummaryView: React.FC<ExecutiveSummaryViewProps> = ({
  business,
  issues,
  setActiveTab,
  onOpenAssistant,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'high' | 'medium' | 'ok'>('all');
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);

  const filteredIssues = issues.filter((issue) => {
    if (activeFilter === 'all') return true;
    return issue.severity === activeFilter;
  });

  const highCount = issues.filter((i) => i.severity === 'high').length;
  const mediumCount = issues.filter((i) => i.severity === 'medium').length;
  const okCount = issues.filter((i) => i.severity === 'ok').length;
  const realCount = issues.filter((i) => i.source === 'real').length;
  const isRealSummary = issues.length > 0 && realCount === issues.length;

  const toggleExpand = (id: string) => {
    setExpandedIssueId(expandedIssueId === id ? null : id);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2">
              <FileCheck2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isRealSummary ? 'RESUMEN CON DATOS REALES' : 'RESUMEN DEMO'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
              Resumen Ejecutivo de Visibilidad
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
              {isRealSummary ? (
                <>Encontramos <strong>{issues.length} hallazgos técnicos verificados</strong> para <strong>{business.name}</strong>, priorizados por severidad e impacto.</>
              ) : (
                <>Mostramos <strong>{business.totalOpportunities} oportunidades de ejemplo</strong> para validar cómo se presentará el diagnóstico de <strong>{business.name}</strong> cuando existan fuentes reales.</>
              )}
            </p>
          </div>

          <button
            onClick={() => setActiveTab('action-plan')}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <span>IR AL PLAN DE ACCIÓN</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-6 pt-6 border-t border-slate-100">
          <button
            onClick={() => setActiveFilter('all')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="text-[11px] block opacity-80 uppercase tracking-wider font-semibold">Todos los ítems</span>
            <span className="text-xl font-bold font-heading">{issues.length}</span>
          </button>

          <button
            onClick={() => setActiveFilter('high')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeFilter === 'high'
                ? 'bg-rose-50 text-rose-900 border-rose-400 ring-2 ring-rose-200'
                : 'bg-white text-rose-800 border-slate-200 hover:bg-rose-50/50'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>🔴 Problemas importantes</span>
            </div>
            <span className="text-xl font-bold font-heading mt-1 block">{highCount}</span>
          </button>

          <button
            onClick={() => setActiveFilter('medium')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeFilter === 'medium'
                ? 'bg-amber-50 text-amber-900 border-amber-400 ring-2 ring-amber-200'
                : 'bg-white text-amber-800 border-slate-200 hover:bg-amber-50/50'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>🟡 Mejoras recomendadas</span>
            </div>
            <span className="text-xl font-bold font-heading mt-1 block">{mediumCount}</span>
          </button>

          <button
            onClick={() => setActiveFilter('ok')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeFilter === 'ok'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-400 ring-2 ring-emerald-200'
                : 'bg-white text-emerald-800 border-slate-200 hover:bg-emerald-50/50'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>🟢 Elementos correctos</span>
            </div>
            <span className="text-xl font-bold font-heading mt-1 block">{okCount}</span>
          </button>
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-4">
        {filteredIssues.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No hay ítems para este filtro.
          </div>
        )}
        {filteredIssues.map((issue) => {
          const isHigh = issue.severity === 'high';
          const isMedium = issue.severity === 'medium';
          const isOk = issue.severity === 'ok';
          const isExpanded = expandedIssueId === issue.id;

          return (
            <div
              key={issue.id}
              className={`bg-white rounded-2xl border transition-all shadow-xs ${
                isHigh
                  ? 'border-rose-200 hover:border-rose-300'
                  : isMedium
                  ? 'border-amber-200 hover:border-amber-300'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {isHigh && <AlertCircle className="w-5 h-5 text-rose-600" />}
                      {isMedium && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                      {isOk && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            isHigh
                              ? 'bg-rose-100 text-rose-800'
                              : isMedium
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isHigh
                            ? '🔴 Problema Importante'
                            : isMedium
                            ? '🟡 Mejora Recomendada'
                            : '🟢 Elemento Correcto'}{issue.source === 'real' ? ' · REAL' : ' · DEMO'}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs font-semibold text-slate-500">
                          {issue.category}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 leading-snug font-heading">
                        {issue.name}
                      </h3>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleExpand(issue.id)}
                    className="self-end sm:self-center text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{isExpanded ? 'Menos detalles' : 'Ver explicación'}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Simple Explanation */}
                <div className="mt-3 pl-8 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  <p>{issue.simpleExplanation}</p>
                </div>

                {/* Expanded Details: Impact & Solution */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-100 pl-8 space-y-3">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                      <span className="font-bold text-slate-900 block mb-1">
                        Importancia comercial para tu negocio:
                      </span>
                      <p className="text-slate-600">{issue.impactText}</p>
                    </div>

                    <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-100 text-xs">
                      <span className="font-bold text-indigo-950 block mb-1">
                        Posible solución recomendada:
                      </span>
                      <p className="text-indigo-900 leading-relaxed">
                        {issue.possibleSolution}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        onClick={() => setActiveTab('action-plan')}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                      >
                        Ver en Plan de Acción
                      </button>
                      <button
                        onClick={onOpenAssistant}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        Pedir ayuda al Asistente IA
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
