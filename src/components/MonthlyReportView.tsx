import React from 'react';
import {
  FileText,
  Printer,
  CheckCircle2,
} from 'lucide-react';
import { Business, MonthlyEvolution, ExecutiveIssue } from '../types';

interface MonthlyReportViewProps {
  business: Business;
  evolution: MonthlyEvolution;
  issues: ExecutiveIssue[];
}

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({
  business,
  evolution,
  issues,
}) => {
  const { monthComparison } = evolution;
  const realIssues = issues.filter((issue) => issue.source === 'real');
  const pendingIssues = issues.filter((issue) => issue.severity !== 'ok');
  const hasRealEvolution =
    evolution.source === 'real' &&
    ((evolution.months?.length || 0) > 0 || (evolution.searchMonths?.length || 0) > 0);
  const reportMode = hasRealEvolution || realIssues.length > 0 ? 'PARCIAL REAL' : 'DEMO';

  const visibilityHasSeries = evolution.source === 'real' && evolution.visibility.length >= 2;
  const searchPositions = evolution.searchPositions || [];
  const positionHasSeries = evolution.source === 'real' && searchPositions.length >= 2;
  const positionChange = positionHasSeries
    ? Number((searchPositions[0] - searchPositions[searchPositions.length - 1]).toFixed(1))
    : null;
  const solvedProblems =
    evolution.source === 'real' && evolution.fixedProblems.length > 0
      ? evolution.fixedProblems[evolution.fixedProblems.length - 1]
      : null;

  const latestPeriod =
    evolution.searchMonths?.[evolution.searchMonths.length - 1] ||
    evolution.months?.[evolution.months.length - 1] ||
    (reportMode === 'DEMO' ? 'Período de ejemplo' : 'Sin período registrado');

  const metrics = [
    {
      label: 'Visibilidad técnica',
      value:
        evolution.source === 'demo'
          ? `+${monthComparison.visibilityChangePercent}%`
          : visibilityHasSeries
          ? `${monthComparison.visibilityChangePercent > 0 ? '+' : ''}${monthComparison.visibilityChangePercent}%`
          : '—',
      source: evolution.source === 'demo' ? 'DEMO' : visibilityHasSeries ? 'AUDITORÍAS' : 'SIN SERIE',
      note: 'score derivado',
    },
    {
      label: 'Cambio posición media',
      value:
        evolution.source === 'demo'
          ? String(monthComparison.improvedPositionsCount)
          : positionChange !== null
          ? `${positionChange > 0 ? '+' : ''}${positionChange}`
          : '—',
      source: evolution.source === 'demo' ? 'DEMO' : positionHasSeries ? 'SEARCH CONSOLE' : 'SIN SERIE',
      note: positionHasSeries ? 'positivo = mejora' : 'requiere historial',
    },
    {
      label: 'Problemas resueltos',
      value:
        evolution.source === 'demo'
          ? String(monthComparison.solvedProblemsCount)
          : solvedProblems !== null
          ? String(solvedProblems)
          : '—',
      source: evolution.source === 'demo' ? 'DEMO' : solvedProblems !== null ? 'AUDITORÍAS' : 'SIN SERIE',
      note: 'comparación técnica',
    },
    {
      label: 'Hallazgos actuales',
      value: reportMode === 'DEMO' ? String(issues.length) : String(realIssues.length),
      source: reportMode === 'DEMO' ? 'DEMO' : 'AUDITORÍA REAL',
      note: 'ítems evaluados',
    },
    {
      label: 'Consultas / conversiones',
      value: evolution.source === 'demo' ? String(monthComparison.consultationsTotal) : '—',
      source: evolution.source === 'demo' ? 'DEMO' : 'SIN FUENTE',
      note: evolution.source === 'demo' ? 'ejemplo' : 'requiere analítica/CRM',
    },
  ];

  const priorities = pendingIssues.slice(0, 3);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="no-print vai-panel rounded-[1.5rem] p-6 sm:p-8 ring-1 ring-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] tracking-[0.12em] uppercase text-indigo-600 font-semibold mb-2">
            <FileText className="w-3.5 h-3.5" />
            <span>Reporting ejecutivo · {reportMode}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 font-heading tracking-[-0.035em]">
            Informe de Visibilidad
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            {reportMode === 'PARCIAL REAL'
              ? <>Resumen construido con las fuentes verificadas disponibles para <strong>{business.name}</strong>. Las métricas sin fuente permanecen vacías.</>
              : <>Vista demostrativa del informe para <strong>{business.name}</strong>. Ninguna cifra DEMO debe interpretarse como una medición real.</>}
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-[0.1em] flex items-center justify-center gap-2"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir / Guardar PDF</span>
        </button>
      </div>

      <div className="bg-white rounded-[1.75rem] p-5 sm:p-10 border border-slate-200 shadow-lg max-w-4xl mx-auto space-y-8 print:border-none print:shadow-none print:p-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-8 border-b-2 border-slate-900">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-slate-950 text-white flex items-center justify-center font-bold text-sm">
                V
              </div>
              <span className="text-base font-extrabold text-slate-900 tracking-tight font-heading">
                VISIBILITY <span className="text-indigo-600">AI</span>
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">
              Informe de Evolución Digital · {reportMode}
            </h2>
            <p className="text-sm font-semibold text-slate-600 mt-0.5">
              {business.name} · {business.category} · {business.city || business.country}
            </p>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-500">
            <span className="text-slate-400 block uppercase font-bold text-[10px]">Último período disponible</span>
            <span className="font-bold text-slate-900 text-sm block">{latestPeriod}</span>
            <span>{reportMode === 'DEMO' ? 'Datos de ejemplo' : 'Fuentes mixtas identificadas'}</span>
          </div>
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 block mb-3 font-heading">
            Resumen de métricas
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            {metrics.map((metric) => (
              <div key={metric.label} className="p-4 rounded-2xl bg-slate-50/80 ring-1 ring-slate-200/70 text-center">
                <span className="text-[10px] font-semibold text-slate-500 block uppercase tracking-wider">
                  {metric.label}
                </span>
                <span className="text-2xl font-black text-slate-950 font-heading mt-1 block font-tabular">
                  {metric.value}
                </span>
                <span className="text-[9px] text-indigo-600 font-bold block mt-1 uppercase tracking-wider">
                  {metric.source}
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">
                  {metric.note}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 ring-1 ring-slate-200/70 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <p className="font-bold text-slate-900 mb-1">
            Conclusión del período para {business.name}:
          </p>
          <p>
            {reportMode === 'PARCIAL REAL'
              ? 'Este informe resume únicamente los datos que Visibility AI puede reconstruir desde auditorías técnicas y fuentes conectadas. No se atribuyen consultas, ventas ni mejoras comerciales sin una fuente específica.'
              : 'Este es un ejemplo de presentación. Las cifras mostradas como DEMO sirven para validar la experiencia del producto y no representan resultados del negocio.'}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 font-heading">
            Prioridades para el próximo período
          </h3>

          <div className="space-y-2.5">
            {priorities.length > 0 ? (
              priorities.map((issue) => (
                <div key={issue.id} className="p-3.5 rounded-xl ring-1 ring-slate-200 flex items-start gap-3 text-xs sm:text-sm">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block">{issue.name}</strong>
                    <span className="text-slate-500 text-xs">
                      {issue.source === 'real'
                        ? issue.possibleSolution
                        : 'Prioridad de ejemplo. Debe validarse con una fuente real antes de ejecutarla.'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 ring-1 ring-slate-200 text-xs text-slate-500">
                No hay prioridades verificadas pendientes para mostrar en este informe.
              </div>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
          <span>VISIBILITY AI · Plataforma de Visibilidad Digital para Empresas</span>
          <span>Próxima revisión: cuando se actualicen las fuentes conectadas</span>
        </div>
      </div>
    </div>
  );
};
