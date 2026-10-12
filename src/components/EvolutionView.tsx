import { technicalScoreChange } from '../../shared/scoreEvidence';
import React, { useState } from 'react';
import { measuredSeries, comparableSearchPeriods, searchPositionChange, technicalFindingReduction } from '../../shared/reportEvidence';
import {
  TrendingUp,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { MonthlyEvolution, Business, ActiveTab } from '../types';

interface EvolutionViewProps {
  business: Business;
  evolution: MonthlyEvolution;
  setActiveTab: (tab: ActiveTab) => void;
}

type MetricKey =
  | 'visibility'
  | 'googlePositions'
  | 'estimatedVisits'
  | 'consultations'
  | 'fixedProblems'
  | 'searchImpressions'
  | 'searchClicks'
  | 'searchCtr'
  | 'searchPositions';

export const EvolutionView: React.FC<EvolutionViewProps> = ({
  business,
  evolution,
  setActiveTab,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('visibility');

  const { months, monthComparison } = evolution;
  const isRealHistory = evolution.source === 'real';
  const searchMonths = evolution.searchMonths || [];
  const searchPositions = evolution.searchPositions || [];

  const technicalSeries = isRealHistory ? measuredSeries(months, evolution.visibility) : [];
  const technicalChange = technicalScoreChange(evolution);
  const hasTechnicalComparison = technicalChange !== null;
  const reduction = technicalFindingReduction(evolution);
  const hasSolvedProblemsSeries = reduction !== null;

  const averagePositionDelta = searchPositionChange(evolution);

  const solvedProblems = reduction;

  const metricConfigs: Record<MetricKey, {
    label: string;
    values: number[];
    unit: string;
    gradient: string;
    description: string;
    lowerIsBetter?: boolean;
    source: 'AUDITORÍAS' | 'SEARCH CONSOLE' | 'DEMO';
  }> = {
    visibility: {
      label: isRealHistory ? 'Score técnico derivado' : 'Visibilidad Digital',
      values: evolution.visibility,
      unit: '/100',
      gradient: 'from-indigo-500 to-blue-600',
      description: isRealHistory
        ? 'Score derivado de las señales técnicas verificadas disponibles. No representa por sí solo toda la visibilidad de mercado.'
        : 'Puntuación DEMO de visibilidad digital.',
      source: isRealHistory ? 'AUDITORÍAS' : 'DEMO',
    },
    googlePositions: {
      label: 'Posición Promedio en Google',
      values: evolution.googlePositions,
      unit: 'posición',
      gradient: 'from-emerald-500 to-teal-600',
      description: 'Métrica DEMO. No se presenta como real sin una fuente de ranking.',
      lowerIsBetter: true,
      source: 'DEMO',
    },
    estimatedVisits: {
      label: 'Visitas Mensuales Estimadas',
      values: evolution.estimatedVisits,
      unit: 'visitas',
      gradient: 'from-blue-500 to-cyan-600',
      description: 'Métrica DEMO. Visibility AI no estima tráfico real sin una fuente conectada.',
      source: 'DEMO',
    },
    consultations: {
      label: 'Consultas y Reservas',
      values: evolution.consultations,
      unit: 'consultas',
      gradient: 'from-purple-500 to-indigo-600',
      description: 'Métrica DEMO. Requiere analítica, CRM o una fuente de conversiones para ser real.',
      source: 'DEMO',
    },
    fixedProblems: {
      label: 'Reducción neta de hallazgos',
      values: evolution.fixedProblems,
      unit: 'hallazgos menos',
      gradient: 'from-amber-500 to-orange-600',
      description: isRealHistory
        ? 'Reducción neta de hallazgos pendientes respecto de la primera auditoría. No verifica tareas completadas.'
        : 'Métrica DEMO de problemas solucionados.',
      source: isRealHistory ? 'AUDITORÍAS' : 'DEMO',
    },
    searchImpressions: {
      label: 'Impresiones en Google',
      values: evolution.searchImpressions || [],
      unit: 'impresiones',
      gradient: 'from-blue-500 to-indigo-600',
      description: 'Impresiones de las consultas recuperadas desde Google Search Console; pueden no representar el total del sitio.',
      source: 'SEARCH CONSOLE',
    },
    searchClicks: {
      label: 'Clics desde Google',
      values: evolution.searchClicks || [],
      unit: 'clics',
      gradient: 'from-emerald-500 to-teal-600',
      description: 'Clics de las consultas recuperadas desde Google Search Console; pueden no representar el total del sitio.',
      source: 'SEARCH CONSOLE',
    },
    searchCtr: {
      label: 'CTR en Google',
      values: evolution.searchCtr || [],
      unit: '% CTR',
      gradient: 'from-purple-500 to-indigo-600',
      description: 'Porcentaje de clics sobre impresiones reportado por Google Search Console.',
      source: 'SEARCH CONSOLE',
    },
    searchPositions: {
      label: 'Posición Media Search Console',
      values: searchPositions,
      unit: 'posición',
      gradient: 'from-slate-500 to-slate-700',
      description: 'Posición media ponderada por impresiones de las consultas recuperadas. Una posición sin impresiones queda sin medición; no se interpreta como cero.',
      lowerIsBetter: true,
      source: 'SEARCH CONSOLE',
    },
  };

  const availableMetricKeys = (Object.keys(metricConfigs) as MetricKey[]).filter(key => {
    const config = metricConfigs[key];
    if (isRealHistory && config.source === 'DEMO') return false;
    if (isRealHistory && key === 'fixedProblems' && !hasSolvedProblemsSeries) return false;
    const labels = key.startsWith('search') ? searchMonths : months;
    return measuredSeries(labels, config.values, config.lowerIsBetter).length > 0;
  });

  const effectiveSelectedMetric = availableMetricKeys.includes(selectedMetric)
    ? selectedMetric
    : availableMetricKeys[0] || 'visibility';

  const currentConfig = metricConfigs[effectiveSelectedMetric];
  const isSearchMetric = effectiveSelectedMetric.startsWith('search');
  const currentMonths = isSearchMetric ? searchMonths : months;
  const points = measuredSeries(currentMonths, currentConfig.values, currentConfig.lowerIsBetter);
  const plottedCount = points.length;
  const plottedMonths = points.map(point => point.label);
  const plottedValues = points.map(point => point.value);
  const hasHistory = plottedCount > 0;
  const maxVal = hasHistory ? Math.max(...plottedValues, 1) * 1.15 : 1;
  const searchPeriodCount = evolution.searchPeriods?.length || 0;
  const hasComparablePeriods = searchPeriodCount >= 2 && comparableSearchPeriods(
    evolution.searchPeriods?.[searchPeriodCount - 2], evolution.searchPeriods?.[searchPeriodCount - 1]
  );
  const completeLastPair = points.length >= 2 && points.at(-1)!.index === currentConfig.values.length - 1 && points.at(-2)!.index === currentConfig.values.length - 2;
  const hasComparison = points.length >= 2 && (effectiveSelectedMetric === 'visibility' ? hasTechnicalComparison : !isSearchMetric || (hasComparablePeriods && completeLastPair));
  const firstValue = isSearchMetric && hasComparison ? plottedValues.at(-2)! : plottedValues[0];
  const firstLabel = isSearchMetric && hasComparison ? plottedMonths.at(-2)! : plottedMonths[0];
  const lastValue = plottedValues.at(-1)!;
  const delta = hasComparison ? lastValue - firstValue : 0;
  const improved = hasComparison
    ? currentConfig.lowerIsBetter
      ? lastValue < firstValue
      : lastValue > firstValue
    : false;
  const unchanged = hasComparison && lastValue === firstValue;

  const comparisonLabel = !hasComparison
    ? effectiveSelectedMetric === 'visibility' ? 'Sin comparación: las fuentes del índice faltan o cambiaron' : isSearchMetric ? 'Sin dos períodos comparables de igual duración y sin solapamiento' : 'Todavía no hay dos mediciones para comparar'
    : unchanged
    ? 'Sin cambio respecto del inicio'
    : currentConfig.lowerIsBetter
    ? improved
      ? 'Mejoró: la posición media bajó'
      : 'Empeoró: la posición media subió'
    : delta > 0
    ? 'Subió respecto del inicio'
    : 'Bajó respecto del inicio';

  const comparisonClass = !hasComparison || unchanged
    ? 'text-slate-500'
    : improved
    ? 'text-emerald-600'
    : currentConfig.lowerIsBetter
    ? 'text-rose-600'
    : delta > 0
    ? 'text-emerald-600'
    : 'text-rose-600';

  const summaryCards = isRealHistory
    ? [
        {
          label: 'Cambio score técnico',
          value: hasTechnicalComparison
            ? `${technicalChange! > 0 ? '+' : ''}${Number(technicalChange!.toFixed(1))} puntos`
            : '—',
          source: hasTechnicalComparison ? 'AUDITORÍAS' : 'SIN SERIE',
          tone: 'indigo',
        },
        {
          label: 'Cambio posición media',
          value: averagePositionDelta !== null
            ? `${averagePositionDelta > 0 ? '+' : ''}${averagePositionDelta}`
            : '—',
          source: averagePositionDelta !== null ? 'SEARCH CONSOLE' : 'SIN SERIE',
          tone: 'emerald',
        },
        {
          label: 'Hallazgos menos',
          value: solvedProblems !== null ? String(solvedProblems) : '—',
          source: solvedProblems !== null ? 'AUDITORÍAS' : 'SIN SERIE',
          tone: 'amber',
        },
        {
          label: 'Nuevas oportunidades',
          value: '—',
          source: 'SIN SERIE',
          tone: 'purple',
        },
        {
          label: 'Consultas / conversiones',
          value: '—',
          source: 'SIN FUENTE',
          tone: 'blue',
        },
      ]
    : [
        {
          label: 'Visibilidad',
          value: `+${monthComparison.visibilityChangePercent}%`,
          source: 'DEMO',
          tone: 'indigo',
        },
        {
          label: 'Posiciones ganadas',
          value: `+${monthComparison.improvedPositionsCount}`,
          source: 'DEMO',
          tone: 'emerald',
        },
        {
          label: 'Problemas resueltos',
          value: String(monthComparison.solvedProblemsCount),
          source: 'DEMO',
          tone: 'amber',
        },
        {
          label: 'Nuevas oportunidades',
          value: String(monthComparison.newOpportunitiesCount),
          source: 'DEMO',
          tone: 'purple',
        },
        {
          label: 'Consultas totales',
          value: String(monthComparison.consultationsTotal),
          source: 'DEMO',
          tone: 'blue',
        },
      ];

  const toneClasses: Record<string, string> = {
    indigo: 'bg-indigo-50/60 ring-indigo-100 text-indigo-950',
    emerald: 'bg-emerald-50/60 ring-emerald-100 text-emerald-950',
    amber: 'bg-amber-50/60 ring-amber-100 text-amber-950',
    purple: 'bg-purple-50/60 ring-purple-100 text-purple-950',
    blue: 'bg-blue-50/60 ring-blue-100 text-blue-950',
  };

  return (
    <div className="space-y-6 pb-14">
      <div className="vai-panel rounded-xl p-6 sm:p-8 lg:p-9 ring-1 ring-slate-200/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              <span>EVOLUCIÓN TEMPORAL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
              Historial de mediciones
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
              {isRealHistory
                ? <>Historial construido con auditorías técnicas y Search Console disponibles para <strong>{business.name}</strong>. Cada métrica indica su fuente.</>
                : <>Vista DEMO de cómo se mostrará el seguimiento histórico de <strong>{business.name}</strong>.</>}
            </p>
          </div>

          <button
            onClick={() => setActiveTab('monthly-report')}
            className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider transition-[background-color,color,transform] shrink-0 cursor-pointer"
          >
            Ver informe mensual
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-100">
          {summaryCards.map((card, index) => (
            <div
              key={card.label}
              className={`p-3 rounded-xl ring-1 text-left ${toneClasses[card.tone]} ${
                index === summaryCards.length - 1 ? 'col-span-2 sm:col-span-1' : ''
              }`}
            >
              <span className="text-[10px] uppercase font-bold opacity-75 block">
                {card.label}
              </span>
              <span className="text-lg font-bold font-heading mt-1 block font-tabular">
                {card.value}
              </span>
              <span className="text-[9px] text-slate-500 font-bold tracking-wider block mt-1">
                {card.source}
              </span>
            </div>
          ))}
        </div>
      </div>

      {!hasHistory && (
        <div className="rounded-2xl ring-1 ring-slate-200 bg-white p-8 text-center">
          <h2 className="text-base font-bold text-slate-900">Sin historial para esta métrica</h2>
          <p className="mt-1 text-sm text-slate-500">
            Seleccioná otra métrica o generá nuevas mediciones. Visibility AI no completará huecos con estimaciones no verificadas.
          </p>
        </div>
      )}

      {availableMetricKeys.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
          {availableMetricKeys.map((key) => {
            const config = metricConfigs[key];
            const isSelected = effectiveSelectedMetric === key;

            return (
              <button
                key={key}
                onClick={() => setSelectedMetric(key)}
                className={`px-4 py-2 rounded-xl whitespace-nowrap font-semibold transition-[background-color,color,transform] cursor-pointer ${
                  isSelected
                    ? 'bg-slate-950 text-white shadow-xs'
                    : 'bg-white ring-1 ring-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {config.label}
              </button>
            );
          })}
        </div>
      )}

      {hasHistory && (
        <div className="vai-panel rounded-xl p-6 sm:p-8 lg:p-9 ring-1 ring-slate-200/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-heading">
                Evolución: {currentConfig.label}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                {currentConfig.description}
              </p>
              <span className="mt-2 inline-flex text-[9px] font-bold tracking-[0.12em] uppercase text-indigo-600">
                Fuente: {currentConfig.source}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg ring-1 ring-slate-200">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {plottedCount} medición{plottedCount === 1 ? '' : 'es'}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <div
              className="flex items-end gap-3 sm:gap-5 h-64 border-b border-slate-200 px-2 sm:px-4"
              style={{ minWidth: `${Math.max(520, plottedCount * (isSearchMetric ? 190 : 100))}px` }}
            >
              {plottedMonths.map((month, idx) => {
                const value = plottedValues[idx];
                const heightPercent = Math.max(0, Math.round((value / maxVal) * 100));
                const isLast = idx === plottedMonths.length - 1;

                return (
                  <div
                    key={`${month}-${idx}`}
                    className="flex-1 min-w-[56px] flex flex-col items-center h-full justify-end group"
                  >
                    <span className="text-[11px] font-bold text-slate-700 mb-2 font-tabular">
                      {value.toLocaleString('es-AR')}
                      <span className="text-[9px] text-slate-400 block -mt-0.5 text-center font-normal">
                        {currentConfig.unit}
                      </span>
                    </span>

                    <div className="w-full max-w-[48px] h-[150px] bg-slate-100 rounded-t-xl overflow-hidden flex flex-col justify-end p-0.5">
                      <div
                        className={`w-full rounded-t-sm ${isLast ? 'bg-indigo-600' : 'bg-slate-300'}`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>

                    <span className={`text-[10px] mt-3 font-semibold text-center ${
                      isLast ? 'text-indigo-600' : 'text-slate-500'
                    }`}>
                      {month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            <span>
              {isSearchMetric && hasComparison ? 'Período anterior comparable:' : 'Primera medición mostrada:'}{' '}
              <strong>{firstValue} {currentConfig.unit}</strong> ({firstLabel})
              {' → '}
              Estado actual:{' '}
              <strong>{lastValue} {currentConfig.unit}</strong> ({plottedMonths[plottedMonths.length - 1]})
            </span>
            <span className={`font-bold ${comparisonClass}`}>
              {comparisonLabel}
            </span>
          </div>
        </div>
      )}

      {isRealHistory && solvedProblems !== null && solvedProblems > 0 && (
        <div className="rounded-xl bg-emerald-50/70 ring-1 ring-emerald-200 px-4 py-3 flex items-start gap-3 text-xs text-emerald-900">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          <p>
            Se registran <strong>{solvedProblems}</strong> hallazgo{solvedProblems === 1 ? '' : 's'} técnico{solvedProblems === 1 ? '' : 's'} menos respecto de la primera auditoría guardada.
          </p>
        </div>
      )}
    </div>
  );
};
