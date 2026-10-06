import React, { useState } from 'react';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CheckCircle2,
  Users,
  Search,
  Eye,
  MessageSquare,
} from 'lucide-react';
import { MonthlyEvolution, Business, ActiveTab } from '../types';

interface EvolutionViewProps {
  business: Business;
  evolution: MonthlyEvolution;
  setActiveTab: (tab: ActiveTab) => void;
}

export const EvolutionView: React.FC<EvolutionViewProps> = ({
  business,
  evolution,
  setActiveTab,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<
    'visibility' | 'googlePositions' | 'estimatedVisits' | 'consultations' | 'fixedProblems'
  >('visibility');

  const { months, monthComparison } = evolution;

  const metricConfigs = {
    visibility: {
      label: 'Visibilidad Digital',
      values: evolution.visibility,
      unit: '/100',
      color: 'indigo',
      gradient: 'from-indigo-500 to-blue-600',
      description: 'Puntuación integral de presencia en Google, SEO y Web.',
    },
    googlePositions: {
      label: 'Posición Promedio en Google',
      values: evolution.googlePositions,
      unit: 'º lugar',
      color: 'emerald',
      gradient: 'from-emerald-500 to-teal-600',
      description: 'Promedio de ranking en las 8 palabras clave estratégicas (menor es mejor).',
    },
    estimatedVisits: {
      label: 'Visitas Mensuales Estimadas',
      values: evolution.estimatedVisits,
      unit: 'visitas',
      color: 'blue',
      gradient: 'from-blue-500 to-cyan-600',
      description: 'Tráfico orgánico estimado proveniente de Google Search y Maps.',
    },
    consultations: {
      label: 'Consultas y Reservas Recibidas',
      values: evolution.consultations,
      unit: 'consultas',
      color: 'purple',
      gradient: 'from-purple-500 to-indigo-600',
      description: 'Clicks en WhatsApp, llamadas y formularios de contacto.',
    },
    fixedProblems: {
      label: 'Problemas Solucionados',
      values: evolution.fixedProblems,
      unit: 'resueltos',
      color: 'amber',
      gradient: 'from-amber-500 to-orange-600',
      description: 'Optimizaciones técnicas y de contenido aplicadas.',
    },
  };

  const currentConfig = metricConfigs[selectedMetric];
  const maxVal = Math.max(...currentConfig.values) * 1.15;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              <span>EVOLUCIÓN TEMPORAL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
              Crecimiento y Progreso Histórico
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
              Seguimiento del impacto de las mejoras en la presencia online de <strong>{business.name}</strong> a lo largo de los últimos 6 meses.
            </p>
          </div>

          <button
            onClick={() => setActiveTab('monthly-report')}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-all shrink-0 cursor-pointer"
          >
            Ver informe mensual
          </button>
        </div>

        {/* Month-over-Month Comparison Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-left">
            <span className="text-[10px] uppercase font-bold text-indigo-700 block">
              Visibilidad
            </span>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-lg font-bold text-indigo-950 font-heading">
                +{monthComparison.visibilityChangePercent}%
              </span>
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-[10px] text-slate-500">vs. mes anterior</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-left">
            <span className="text-[10px] uppercase font-bold text-emerald-700 block">
              Posiciones ganadas
            </span>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-lg font-bold text-emerald-950 font-heading">
                +{monthComparison.improvedPositionsCount}
              </span>
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-[10px] text-slate-500">en búsquedas clave</span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 text-left">
            <span className="text-[10px] uppercase font-bold text-amber-700 block">
              Problemas resueltos
            </span>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-lg font-bold text-amber-950 font-heading">
                {monthComparison.solvedProblemsCount}
              </span>
              <CheckCircle2 className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-[10px] text-slate-500">este mes</span>
          </div>

          <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 text-left">
            <span className="text-[10px] uppercase font-bold text-purple-700 block">
              Nuevas oportunidades
            </span>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-lg font-bold text-purple-950 font-heading">
                {monthComparison.newOpportunitiesCount}
              </span>
            </div>
            <span className="text-[10px] text-slate-500">detectadas</span>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-left col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-blue-700 block">
              Consultas totales
            </span>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-lg font-bold text-blue-950 font-heading">
                {monthComparison.consultationsTotal}
              </span>
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-[10px] text-slate-500">directas por WhatsApp</span>
          </div>
        </div>
      </div>

      {/* Metric Selector Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
        {Object.entries(metricConfigs).map(([key, cfg]) => {
          const isSelected = selectedMetric === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedMetric(key as any)}
              className={`px-4 py-2 rounded-xl whitespace-nowrap font-semibold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Main Chart Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-heading">
              Evolución: {currentConfig.label}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentConfig.description}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Últimos 6 meses</span>
          </div>
        </div>

        {/* Visual Bar & Line Graphic (Clean Responsive SVG/HTML) */}
        <div className="pt-6 pb-2">
          <div className="grid grid-cols-6 gap-3 sm:gap-6 items-end h-56 border-b border-slate-200 px-2 sm:px-6">
            {months.map((month, idx) => {
              const val = currentConfig.values[idx];
              const heightPercent = Math.max(15, Math.round((val / maxVal) * 100));
              const isLast = idx === months.length - 1;

              return (
                <div key={month} className="flex flex-col items-center h-full justify-end group">
                  {/* Tooltip / value */}
                  <span className="text-[11px] font-bold text-slate-700 mb-2 group-hover:scale-110 transition-transform">
                    {val.toLocaleString('es-AR')}
                    <span className="text-[9px] text-slate-400 block -mt-0.5 text-center font-normal">
                      {currentConfig.unit}
                    </span>
                  </span>

                  {/* Bar */}
                  <div className="w-full max-w-[48px] bg-slate-100 rounded-t-xl overflow-hidden flex flex-col justify-end p-0.5">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-700 bg-gradient-to-t ${
                        isLast
                          ? currentConfig.gradient
                          : 'from-slate-400 to-slate-500 group-hover:from-indigo-500 group-hover:to-blue-600'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>

                  {/* Month Label */}
                  <span className={`text-xs mt-3 font-semibold ${isLast ? 'text-indigo-600 font-bold' : 'text-slate-500'}`}>
                    {month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            Punto de partida: <strong>{currentConfig.values[0]} {currentConfig.unit}</strong> (Mayo) → Estado actual: <strong>{currentConfig.values[currentConfig.values.length - 1]} {currentConfig.unit}</strong> (Octubre)
          </span>
          <span className="text-emerald-600 font-bold">
            Tendencia de crecimiento sostenido ↑
          </span>
        </div>
      </div>
    </div>
  );
};
