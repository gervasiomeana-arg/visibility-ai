import React from 'react';
import { FileText, Printer } from 'lucide-react';
import { Business, MonthlyEvolution, ExecutiveIssue, ActionTask } from '../types';
import { measuredSeries, reportEvidence, searchPositionChange, measurementDateLabel } from '../../shared/reportEvidence';

interface MonthlyReportViewProps {
  business: Business;
  evolution: MonthlyEvolution;
  issues: ExecutiveIssue[];
  tasks?: ActionTask[];
}

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({ business, evolution, issues, tasks = [] }) => {
  const dateLabel = (value?: string) => measurementDateLabel(value, business.locale || 'es-AR', business.timezone || 'America/Argentina/Buenos_Aires');
  const evidence = reportEvidence(business.id, evolution, issues);
  const { mode, priorities, useDemoMetrics } = evidence;
  const isReal = mode === 'PARCIAL REAL';
  const technical = evolution.source === 'real' ? measuredSeries(evolution.months, evolution.visibility) : [];
  const technicalChange = technical.length >= 2 ? technical.at(-1)!.value - technical[0].value : null;
  const positionChange = searchPositionChange(evolution);
  const reduction = evolution.source === 'real' && technical.length >= 2 && evolution.fixedProblems.length === evolution.visibility.length
    ? evolution.fixedProblems.at(-1) : undefined;
  const currentTasks = tasks.filter(task => task.businessId === business.id && (task.source === 'seo-audit' || task.source === 'manual'));
  const latestSearch = evolution.source === 'real' ? evolution.searchPeriods?.at(-1) : undefined;
  const auditDates = evolution.source === 'real' ? evolution.auditDates || [] : [];
  const lastIssueDate = evidence.realIssues.map(issue => issue.checkedAt).filter((date): date is string => !!date && Number.isFinite(Date.parse(date))).sort().at(-1);
  const auditDate = auditDates.at(-1) || lastIssueDate;
  const searchCount = evolution.source === 'real' ? measuredSeries(evolution.searchMonths || [], evolution.searchImpressions || []).length : 0;
  const signed = (value: number) => `${value > 0 ? '+' : ''}${Number(value.toFixed(1))}`;
  const searchValue = (values?: number[]) => {
    if (evolution.source !== 'real') return null;
    const index = (evolution.searchMonths?.length || 0) - 1;
    const value = index >= 0 ? values?.[index] : undefined;
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  };
  const clicks = searchValue(evolution.searchClicks);
  const impressions = searchValue(evolution.searchImpressions);
  const ctr = impressions !== null && impressions > 0 ? searchValue(evolution.searchCtr) : null;
  const metrics = [
    { label: 'Clics de consultas recuperadas', value: clicks !== null ? clicks.toLocaleString('es-AR') : '—', source: clicks !== null ? 'SEARCH CONSOLE' : 'SIN FUENTE', note: 'Último período medido; no equivale a consultas comerciales.' },
    { label: 'Impresiones de consultas recuperadas', value: impressions !== null ? impressions.toLocaleString('es-AR') : '—', source: impressions !== null ? 'SEARCH CONSOLE' : 'SIN FUENTE', note: 'Último período medido; el alcance depende de las consultas disponibles.' },
    { label: 'CTR de consultas recuperadas', value: ctr !== null ? `${ctr.toLocaleString('es-AR')}%` : '—', source: ctr !== null ? 'SEARCH CONSOLE' : 'SIN MEDICIÓN', note: 'Clics sobre impresiones. Sin impresiones no se calcula una tasa.' },
    { label: 'Cambio del índice técnico', value: useDemoMetrics ? `+${evolution.monthComparison.visibilityChangePercent}%` : technicalChange !== null ? `${signed(technicalChange)} puntos` : '—', source: useDemoMetrics ? 'DEMO' : technicalChange !== null ? 'AUDITORÍAS' : 'SIN COMPARACIÓN', note: 'Primera y última medición; no es una posición en Google.' },
    { label: 'Cambio de posición media', value: useDemoMetrics ? String(evolution.monthComparison.improvedPositionsCount) : positionChange !== null ? signed(positionChange) : '—', source: useDemoMetrics ? 'DEMO' : positionChange !== null ? 'SEARCH CONSOLE' : 'SIN COMPARACIÓN', note: positionChange !== null ? 'Últimos dos períodos comparables; positivo = menor posición.' : 'Requiere períodos conocidos, de igual duración y sin solapamiento.' },
    { label: 'Reducción neta de hallazgos', value: useDemoMetrics ? String(evolution.monthComparison.solvedProblemsCount) : typeof reduction === 'number' && Number.isFinite(reduction) ? String(reduction) : '—', source: useDemoMetrics ? 'DEMO' : reduction !== undefined ? 'AUDITORÍAS' : 'SIN COMPARACIÓN', note: 'Menos hallazgos respecto del inicio; no acredita tareas resueltas.' },
    { label: 'Factores evaluados', value: evidence.usableIssues.length ? String(evidence.usableIssues.length) : '—', source: useDemoMetrics ? 'DEMO' : evidence.realIssues.length ? 'AUDITORÍA REAL' : 'SIN DATOS', note: 'Incluye factores correctos, advertencias y errores.' },
    { label: 'Consultas / ventas', value: useDemoMetrics ? String(evolution.monthComparison.consultationsTotal) : '—', source: useDemoMetrics ? 'DEMO' : 'SIN FUENTE', note: 'No se deducen de los clics ni del índice técnico.' },
  ];
  return <div className="space-y-6 pb-12">
    <div className="no-print vai-panel rounded-xl p-6 sm:p-8 ring-1 ring-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-xs text-indigo-600 mb-2"><FileText className="w-4 h-4" />Resumen ejecutivo · {mode}</div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 font-heading">Informe de visibilidad</h1>
        <p className="text-sm text-slate-600 mt-2">Revisá las fuentes y prioridades antes de entregar este informe. Las fechas indican el alcance disponible, que puede no coincidir con un mes calendario.</p>
      </div>
      <button onClick={() => window.print()} className="vai-button vai-button-primary shrink-0"><Printer className="w-4 h-4" />Imprimir / Guardar PDF</button>
    </div>
    <article className="vai-report-document bg-white rounded-2xl p-5 sm:p-10 border border-slate-200 shadow-sm max-w-4xl mx-auto space-y-8 print:border-none print:shadow-none print:p-0">
      <header className="pb-6 border-b border-slate-200 space-y-2">
        <p className="text-xs font-bold tracking-widest text-indigo-600">VISIBILITY · {mode}</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">{business.name}</h2>
        <p className="text-sm text-slate-600">{business.description || business.category}</p>
        <p className="text-xs text-slate-500 break-all">Sitio del negocio: {business.url}</p>
        <p className="text-xs text-slate-500">Documento preparado: {dateLabel(new Date().toISOString())}. Esta fecha no reemplaza la fecha de medición.</p>
        {useDemoMetrics && <p className="font-semibold text-amber-800">EJEMPLO DEMOSTRATIVO. No representa resultados medidos de este negocio.</p>}
        {mode === 'SIN DATOS' && <p className="font-semibold text-slate-700">Todavía no hay mediciones reales disponibles para este informe.</p>}
      </header>
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Fuentes y alcance</h3>
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl bg-slate-50 p-4 space-y-1"><strong>Auditorías técnicas</strong>
            <p>{isReal && (technical.length || evidence.realIssues.length) ? `Última medición: ${dateLabel(auditDate)}.` : 'Sin auditoría real disponible.'}</p>
            {auditDates.length > 1 && <p>Historial: {dateLabel(auditDates[0])} a {dateLabel(auditDates.at(-1))}.</p>}
            <p>El análisis del HTML inicial no ejecuta JavaScript. Un hallazgo puede requerir comprobar la página renderizada.</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 space-y-1"><strong>Google Search Console</strong>
            <p>{searchCount ? `Período: ${latestSearch?.startDate && latestSearch.endDate ? `${latestSearch.startDate} a ${latestSearch.endDate}` : 'No registrado en el historial anterior'}.` : 'Sin mediciones guardadas disponibles.'}</p>
            {latestSearch && <><p className="break-all">Propiedad: {latestSearch.siteUrl || 'No registrada'}.</p><p>Cargado: {dateLabel(latestSearch.loadedAt)}.</p></>}
            <p>Las cifras agregan las consultas recuperadas; no representan necesariamente todos los clics del sitio. Una medición guardada no confirma que la conexión siga activa.</p>
          </div>
        </div>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Qué muestran las mediciones</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{metrics.map(metric => <div key={metric.label} className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-600">{metric.label}</p><p className="text-xl font-bold text-slate-900 my-1">{metric.value}</p>
          <p className="text-[10px] font-semibold text-indigo-600">{metric.source}</p><p className="text-xs text-slate-500 mt-1">{metric.note}</p>
        </div>)}</div>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Tres prioridades para la próxima revisión</h3>
        {priorities.length ? <ol className="space-y-3">{priorities.map((issue, index) => <li key={issue.id} className="rounded-xl border border-slate-200 p-4 text-sm">
          <strong>{index + 1}. {issue.name}</strong><p className="text-xs text-slate-600 mt-1">{issue.simpleExplanation}</p>
          <p className="text-xs text-slate-600 mt-1">Propuesta: {issue.possibleSolution}</p>
          <p className="text-[10px] text-slate-500 mt-2">{useDemoMetrics ? 'Prioridad de ejemplo' : `Hallazgo de auditoría · ${dateLabel(issue.checkedAt)}`}. Validar el cambio antes de ejecutarlo.</p>
        </li>)}</ol> : <p className="text-sm text-slate-500">No hay prioridades verificadas pendientes en las fuentes disponibles. Esto no equivale a una revisión completa de todo el sitio.</p>}
      </section>
      {isReal && <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Estado del plan de acción</h3>
        {currentTasks.length ? <><p className="text-xs text-slate-600">{currentTasks.filter(t => t.status === 'pendiente' || t.status === 'en_progreso').length} tareas pendientes o en curso · {currentTasks.filter(t => t.status === 'completada' || t.status === 'completada_manual').length} marcadas como completadas manualmente · {currentTasks.filter(t => t.status === 'verificada_auditoria').length} registradas como verificadas por auditoría.</p>
          <p className="text-xs text-slate-500">Los estados y notas reflejan el registro del plan. Una nota o un marcado manual no constituye verificación técnica.</p></> : <p className="text-sm text-slate-500">Sin tareas reales o manuales registradas para este negocio.</p>}
      </section>}
      <footer className="border-t border-slate-200 pt-4 text-xs text-slate-500 space-y-1">
        <p>Las propuestas requieren revisión y autorización antes de modificar o publicar el sitio.</p>
        <p>No se atribuyen consultas, ventas ni cambios de posición a una corrección técnica sin evidencia específica.</p>
      </footer>
    </article>
  </div>;
};
