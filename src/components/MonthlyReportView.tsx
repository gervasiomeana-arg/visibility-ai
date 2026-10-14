import { technicalScoreChange, webMeasurement } from '../../shared/scoreEvidence';
import React, { useEffect, useRef, useState } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import { prepareReportPdf, reportPdfBlocks } from '../services/reportPdfService';
import { reportPdfName } from '../../shared/reportPdfName';
import { Business, MonthlyEvolution, ExecutiveIssue, ActionTask, SeoAuditResult } from '../types';
import { measuredSeries, reportEvidence, reportSearchEvidence, measurementDateLabel, technicalFindingReduction, taskPlanEvidence } from '../../shared/reportEvidence';

interface MonthlyReportViewProps {
  business: Business;
  evolution: MonthlyEvolution;
  issues: ExecutiveIssue[];
  tasks?: ActionTask[];
  auditMeta?: Partial<SeoAuditResult> | null;
}
const emptyTasks: ActionTask[] = [];

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({ business, evolution, issues, tasks = emptyTasks, auditMeta }) => {
  const articleRef = useRef<HTMLElement>(null);
  const exporting = useRef(false);
  const [pdfBusy,setPdfBusy] = useState(false);
  const [pdfError,setPdfError] = useState('');
  const [download,setDownload] = useState<{url:string;name:string} | null>(null);
  const alive = useRef(true);
  const reportVersion = useRef(0);
  useEffect(() => { alive.current=true; return () => {alive.current=false;}; },[]);
  useEffect(() => () => { if(download)URL.revokeObjectURL(download.url); },[download]);
  useEffect(() => {reportVersion.current++;setDownload(null);setPdfError('');},[business,evolution,issues,tasks,auditMeta]);
  async function exportPdf() {
    if(exporting.current || !articleRef.current)return;
    const article = articleRef.current;
    const blocks=reportPdfBlocks(article);
    const version=reportVersion.current;
    const name=reportPdfName(business.name,new Intl.DateTimeFormat('en-CA',{timeZone:business.timezone || 'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
    exporting.current=true;setPdfBusy(true);setPdfError('');setDownload(null);
    try {
      const blob=await prepareReportPdf(blocks);
      if(!alive.current || articleRef.current !== article || reportVersion.current !== version)return;
      const url=URL.createObjectURL(blob);setDownload({url,name});
      const link=document.createElement('a');link.href=url;link.download=name;link.click();
    } catch(error) {if(alive.current)setPdfError(error instanceof Error?error.message:'No se pudo generar el PDF.');}
    finally {exporting.current=false;if(alive.current)setPdfBusy(false);}
  }
  const dateLabel = (value?: string) => measurementDateLabel(value, business.locale || 'es-AR', business.timezone || 'America/Argentina/Buenos_Aires');
  const evidence = reportEvidence(business.id, evolution, issues, business.url);
  const { mode, priorities, useDemoMetrics } = evidence;
  const isReal = mode === 'PARCIAL REAL';
  const technical = evolution.source === 'real' ? measuredSeries(evolution.months, evolution.visibility) : [];
  const technicalChange = technicalScoreChange(evolution);
  const search = reportSearchEvidence(evolution,business.url);
  const positionChange = search.positionChange;
  const reduction = technicalFindingReduction(evolution);
  const plan = taskPlanEvidence(business.id, tasks);
  const currentTasks = plan.tasks.filter(task => task.source !== 'demo');
  const performance = webMeasurement(auditMeta, business.scores.web, business.scoreSources?.web || 'unavailable');
  const latestSearch = search.latest?.period;
  const auditDates = evolution.source === 'real' ? evolution.auditDates || [] : [];
  const lastIssueDate = evidence.realIssues.map(issue => issue.checkedAt).filter((date): date is string => !!date && Number.isFinite(Date.parse(date))).sort().at(-1);
  const auditDate = auditMeta?.fetchedAt || lastIssueDate || auditDates.at(-1);
  const searchCount = search.latest ? 1 : 0;
  const signed = (value: number) => `${value > 0 ? '+' : ''}${Number(value.toFixed(1))}`;
  const clicks = search.latest?.clicks ?? null;
  const impressions = search.latest?.impressions ?? null;
  const ctr = search.latest?.ctr ?? null;
  const metrics = [
    { label: 'Clics de consultas recuperadas', value: clicks !== null ? clicks.toLocaleString('es-AR') : '—', source: clicks !== null ? 'SEARCH CONSOLE' : 'SIN FUENTE', note: 'Último período medido; no equivale a consultas comerciales.' },
    { label: 'Impresiones de consultas recuperadas', value: impressions !== null ? impressions.toLocaleString('es-AR') : '—', source: impressions !== null ? 'SEARCH CONSOLE' : 'SIN FUENTE', note: 'Último período medido; el alcance depende de las consultas disponibles.' },
    { label: 'CTR de consultas recuperadas', value: ctr !== null ? `${ctr.toLocaleString('es-AR')}%` : '—', source: ctr !== null ? 'SEARCH CONSOLE' : 'SIN MEDICIÓN', note: 'Clics sobre impresiones. Sin impresiones no se calcula una tasa.' },
    { label: 'Cambio del índice técnico', value: useDemoMetrics ? `+${evolution.monthComparison.visibilityChangePercent}%` : technicalChange !== null ? `${signed(technicalChange)} puntos` : '—', source: useDemoMetrics ? 'DEMO' : technicalChange !== null ? 'AUDITORÍAS' : 'SIN COMPARACIÓN', note: 'Primera y última medición con las mismas fuentes; no es una posición en Google.' },
    { label: 'Cambio de posición media', value: useDemoMetrics ? String(evolution.monthComparison.improvedPositionsCount) : positionChange !== null ? signed(positionChange) : '—', source: useDemoMetrics ? 'DEMO' : positionChange !== null ? 'SEARCH CONSOLE' : 'SIN COMPARACIÓN', note: positionChange !== null ? 'Últimos dos períodos comparables; positivo = menor posición.' : 'Requiere períodos conocidos, de igual duración y sin solapamiento.' },
    { label: 'Reducción neta de hallazgos', value: useDemoMetrics ? String(evolution.monthComparison.solvedProblemsCount) : reduction !== null ? String(reduction) : '—', source: useDemoMetrics ? 'DEMO' : reduction !== null ? 'AUDITORÍAS' : 'SIN COMPARACIÓN', note: 'Requiere auditorías con las mismas fuentes. No acredita tareas resueltas.' },
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
      <div className="flex flex-wrap gap-2"><button disabled={pdfBusy} onClick={() => void exportPdf()} className="vai-button vai-button-primary shrink-0"><Download className="w-4 h-4" />{pdfBusy?'Preparando PDF…':'Descargar PDF'}</button><button onClick={() => window.print()} className="vai-button vai-button-secondary shrink-0"><Printer className="w-4 h-4" />Imprimir</button></div>
    </div>
    {pdfError && <p role="alert" className="no-print rounded-xl bg-red-50 text-red-800 p-4">{pdfError}</p>}
    {download && <p role="status" className="no-print rounded-xl bg-emerald-50 p-4 text-sm">PDF preparado. Si la descarga no comenzó, <a href={download.url} download={download.name} className="underline font-semibold">descargá el PDF preparado</a>. Si AI Studio bloquea la descarga, abrí Visibility publicada y repetí este paso.</p>}
    <article ref={articleRef} className="vai-report-document bg-white rounded-2xl p-5 sm:p-10 border border-slate-200 shadow-sm max-w-4xl mx-auto space-y-8 print:border-none print:shadow-none print:p-0">
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
          {isReal && <div className="rounded-xl bg-slate-50 p-4 space-y-1"><strong>Google PageSpeed · Móvil</strong>
            <p>{performance.state === 'real' ? `${performance.value}/100 · medido el ${dateLabel(performance.measuredAt)}.` : 'Sin medición actual de rendimiento disponible.'}</p>
            {performance.state !== 'real' && <p>La revisión del HTML no aprueba LCP, FCP ni CLS. {auditMeta?.pageSpeedError || 'Es necesario obtener una medición móvil.'}</p>}
            <p>Prueba de laboratorio; no representa la experiencia de todos los visitantes.</p>
          </div>}
          <div className="rounded-xl bg-slate-50 p-4 space-y-1"><strong>Google Search Console</strong>
            <p>{searchCount ? `Período: ${latestSearch?.startDate && latestSearch.endDate ? `${latestSearch.startDate} a ${latestSearch.endDate}` : 'No registrado en el historial anterior'}.` : 'Sin mediciones guardadas disponibles.'}</p>
            {search.warning && <p className="font-semibold">{search.warning}</p>}
            {latestSearch && <><p className="break-all">Propiedad: {latestSearch.siteUrl || 'No registrada'}.</p><p>Cargado: {dateLabel(latestSearch.loadedAt)}.</p></>}
            {searchCount > 0 && clicks === 0 && impressions === 0 && <p className="font-semibold">Sin consultas de búsqueda recuperadas para este período. Este resultado no demuestra que el sitio no haya recibido visitas.</p>}
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
        {currentTasks.length ? <><p className="text-xs text-slate-600">{plan.pending} tareas pendientes o en curso · {plan.manualCompleted} marcadas como completadas manualmente · {plan.verified} registradas como verificadas por auditoría.</p>
          {plan.notes.map(task => <div key={task.id} className="rounded-xl border border-slate-200 p-3 text-xs space-y-1">
            <strong>{task.title} · Nota manual</strong><p className="whitespace-pre-wrap break-words text-slate-600">{task.userEvidence}</p>
            <p className="text-slate-500">Actualizada: {dateLabel(task.manualUpdatedAt || task.completedAt || undefined)}. Registro de avance, no medición técnica.</p>
          </div>)}
          <p className="text-xs text-slate-500">Los estados y notas reflejan el registro del plan. Una nota o un marcado manual no constituye verificación técnica.</p></> : <p className="text-sm text-slate-500">Sin tareas reales o manuales registradas para este negocio.</p>}
      </section>}
      <footer className="border-t border-slate-200 pt-4 text-xs text-slate-500 space-y-1">
        <p>Las propuestas requieren revisión y autorización antes de modificar o publicar el sitio.</p>
        <p>No se atribuyen consultas, ventas ni cambios de posición a una corrección técnica sin evidencia específica.</p>
      </footer>
    </article>
  </div>;
};
