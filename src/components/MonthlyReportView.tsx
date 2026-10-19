import { PresenceEvidence } from './PresenceEvidence';
import type { PresenceObservation } from '../../shared/presenceAnalysis';
import { socialReportRows } from '../../shared/socialReport';
import type { SocialAccount } from '../../shared/socialMetrics';
import { technicalScoreChange } from '../../shared/scoreEvidence';
import { reportPerformance } from '../../shared/reportPerformance';
import { measurementTime } from '../../shared/measurementTime';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import { prepareReportPdf, reportPdfBlocks } from '../services/reportPdfService';
import { reportPdfName } from '../../shared/reportPdfName';
import { Business, MonthlyEvolution, ExecutiveIssue, ActionTask, SeoAuditResult, Workspace } from '../types';
import { SaveReportToClient } from './SaveReportToClient';
import { reportContentFingerprint, type GeneratedReportStore } from '../../shared/generatedClientReport';
import { measuredSeries, reportEvidence, reportSearchEvidence, measurementDateLabel, technicalFindingReduction, findingChangeLabel, taskPlanEvidence } from '../../shared/reportEvidence';

interface MonthlyReportViewProps {
  business: Business;
  evolution: MonthlyEvolution;
  issues: ExecutiveIssue[];
  tasks?: ActionTask[];
  auditMeta?: Partial<SeoAuditResult> | null;
  workspace?: Workspace | null;
  clientReportStore?: GeneratedReportStore;
  onOpenClients?: () => void;
}
const emptyTasks: ActionTask[] = [];

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({ business, evolution, issues, tasks = emptyTasks, auditMeta, workspace, clientReportStore, onOpenClients }) => {
  const socialScope = workspace?.id && business.workspaceId === workspace.id ? `${workspace.id}:${business.id}` : '';
  const [social, setSocial] = useState<{scope:string; loading:boolean; error:string; accounts:SocialAccount[]; presence:PresenceObservation[]}>({scope:'',loading:true,error:'',accounts:[],presence:[]});
  const [socialReload, setSocialReload] = useState(0);
  useEffect(() => {
    let active=true;
    setSocial({scope:socialScope,loading:!!socialScope,error:'',accounts:[],presence:[]});
    if (socialScope && workspace) Promise.all([import('../services/socialMetricsService').then(({socialMetricsService}) => socialMetricsService.list(workspace.id,business.id)),import('../services/presenceService').then(({presenceService})=>presenceService.list(workspace.id,business.id))])
      .then(([accounts,presence]) => {if(active)setSocial({scope:socialScope,loading:false,error:'',accounts,presence});})
      .catch(() => {if(active)setSocial({scope:socialScope,loading:false,error:'No se pudieron cargar Redes o Buscadores e IA. Reintentá antes de descargar o guardar el informe.',accounts:[],presence:[]});});
    return () => {active=false;};
  },[socialScope,socialReload]);
  const socialReady = !socialScope || (social.scope === socialScope && !social.loading && !social.error);
  const socialRows = socialReady && socialScope ? socialReportRows(social.accounts,workspace!.id,business.id) : [];
  const articleRef = useRef<HTMLElement>(null);
  const exporting = useRef(false);
  const [pdfBusy,setPdfBusy] = useState(false);
  const [pdfError,setPdfError] = useState('');
  const [download,setDownload] = useState<{url:string;name:string} | null>(null);
  const alive = useRef(true);
  const reportVersion = useRef(0);
  useEffect(() => { alive.current=true; return () => {alive.current=false;}; },[]);
  useEffect(() => () => { if(download)URL.revokeObjectURL(download.url); },[download]);
  useEffect(() => {reportVersion.current++;setDownload(null);setPdfError('');},[business,evolution,issues,tasks,auditMeta,social]);
  const prepareForClient = useCallback(async () => {
    const article = articleRef.current;
    if (!article || !socialReady) throw new Error('Esperá a que se carguen las fuentes del informe o reintentá la carga de fuentes.');
    const version = reportVersion.current;
    const name = reportPdfName(business.name,new Intl.DateTimeFormat('en-CA',{timeZone:business.timezone || 'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
    const blocks = reportPdfBlocks(article);
    const contentSha256 = await reportContentFingerprint(blocks);
    const blob = await prepareReportPdf(blocks);
    if (!alive.current || articleRef.current !== article || version !== reportVersion.current) throw new Error('El informe cambió durante la preparación. Revisalo antes de guardar.');
    return {file:new File([blob], name, {type:'application/pdf'}),contentSha256};
  }, [business,evolution,issues,tasks,auditMeta,social,socialReady]);
  async function exportPdf() {
    if(exporting.current || !articleRef.current || !socialReady)return;
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
  const evidence = reportEvidence(business.id, evolution, issues, business.url, socialRows.some(row => row.followers !== null));
  const { mode, priorities, useDemoMetrics } = evidence;
  const isReal = mode === 'PARCIAL REAL';
  const technical = evolution.source === 'real' ? measuredSeries(evolution.months, evolution.visibility) : [];
  const technicalChange = technicalScoreChange(evolution);
  const search = reportSearchEvidence(evolution,business.url);
  const positionChange = search.positionChange;
  const reduction = technicalFindingReduction(evolution);
  const plan = taskPlanEvidence(business.id, tasks);
  const currentTasks = plan.tasks.filter(task => task.source !== 'demo');
  const performance = reportPerformance(auditMeta, business.url);
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
    { label: 'Variación neta de hallazgos', value: useDemoMetrics ? String(evolution.monthComparison.solvedProblemsCount) : findingChangeLabel(reduction), source: useDemoMetrics ? 'DEMO' : reduction !== null ? 'AUDITORÍAS' : 'SIN COMPARACIÓN', note: 'Respecto de la primera auditoría con las mismas fuentes. Indica hallazgos menos o más; no acredita tareas resueltas.' },
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
      <div className="flex flex-wrap gap-2"><button disabled={pdfBusy || !socialReady} onClick={() => void exportPdf()} className="vai-button vai-button-primary shrink-0"><Download className="w-4 h-4" />{pdfBusy?'Preparando PDF…':'Descargar PDF'}</button><button disabled={!socialReady} onClick={() => window.print()} className="vai-button vai-button-secondary shrink-0"><Printer className="w-4 h-4" />Imprimir</button></div>
    </div>
    {pdfError && <p role="alert" className="no-print rounded-xl bg-red-50 text-red-800 p-4">{pdfError}</p>}
    {download && <p role="status" className="no-print rounded-xl bg-emerald-50 p-4 text-sm">PDF preparado. Si la descarga no comenzó, <a href={download.url} download={download.name} className="underline font-semibold">descargá el PDF preparado</a>. Si AI Studio bloquea la descarga, abrí Visibility publicada y repetí este paso.</p>}
    {socialScope && !socialReady && <div role={social.error ? 'alert' : 'status'} className="no-print rounded-xl bg-amber-50 text-amber-900 p-4 text-sm">{social.error || 'Cargando mediciones guardadas de Redes…'}{social.error && <button onClick={() => setSocialReload(n => n+1)} className="ml-3 underline font-semibold">Reintentar carga de Redes</button>}</div>}
    {socialReady && isReal && clientReportStore && workspace?.role === 'owner' && business.workspaceId === workspace.id && <SaveReportToClient key={`${workspace.id}:${business.id}`} workspace={workspace} business={business} prepare={prepareForClient} store={clientReportStore} onOpenClients={onOpenClients} />}
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
            <p>{performance.score !== null ? `${performance.score}/100 · medido el ${dateLabel(performance.measuredAt)}.` : 'Sin medición actual de rendimiento disponible.'}</p>
            {performance.measuredAt && <>
              <p>FCP: {performance.fcp ?? 'Sin medición'} · primer contenido visible.</p>
              <p>LCP: {performance.lcp ?? 'Sin medición'} · contenido principal.</p>
              <p>Fecha de PageSpeed: {measurementTime(performance.measuredAt, business.timezone)}.</p>
              <p className="break-all">URL consultada: {performance.sourceUrl}</p>
            </>}
            {performance.warning && <p className="font-semibold">{performance.warning}</p>}
            {!performance.measuredAt && <p>La revisión del HTML no aprueba LCP, FCP ni CLS. Es necesario obtener una medición móvil con URL y fecha registradas.</p>}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{metrics.map(metric => <div key={metric.label} data-pdf-keep={`metric-${metric.label}`} className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-600">{metric.label}</p><p className="text-xl font-bold text-slate-900 my-1">{metric.value}</p>
          <p className="text-[10px] font-semibold text-indigo-600">{metric.source}</p><p className="text-xs text-slate-500 mt-1">{metric.note}</p>
        </div>)}</div>
      </section>
      {socialScope && <section className="space-y-3">
        <h3 data-pdf-keep={socialRows.length ? `social-${socialRows[0].network}` : undefined} className="text-sm font-bold text-slate-900">Redes · últimas observaciones guardadas</h3>
        <p data-pdf-keep={socialRows.length ? `social-${socialRows[0].network}` : undefined} className="text-xs text-slate-600">Son recuentos observados en la fecha indicada, no seguidores ganados en el mes. Una captura guardada no confirma que la autorización siga activa ni constituye una consulta nueva.</p>
        {!socialReady && <p>{social.error || 'Carga de Redes pendiente. No entregar este documento hasta completar la revisión.'}</p>}
        {socialRows.map(row => <div key={row.network} data-pdf-keep={`social-${row.network}`} className="rounded-xl border border-slate-200 p-4 space-y-1 text-xs">
          <strong>{({instagram:'Instagram',facebook:'Facebook',tiktok:'TikTok',youtube:'YouTube'})[row.network]}</strong>
          {row.notUsed ? <p>Red declarada como no utilizada en la ficha del negocio. No equivale a cero seguidores.</p> : <>
            <p className="break-all">Perfil: {row.profileUrl || 'Sin perfil confirmado disponible'}.</p>
            <p>{row.network === 'youtube' ? 'Suscriptores reportados' : 'Seguidores observados'}: {row.followers === null ? 'Sin datos verificados' : row.followers.toLocaleString('es-AR')}.</p>
            {row.capturedAt && <><p>Observado: {measurementTime(row.capturedAt,business.timezone)}.</p><p>Fuente: {row.source}. {row.evidence}</p></>}
          </>}
        </div>)}
        <p className="text-xs text-slate-500">YouTube informa suscriptores redondeados por la plataforma. Este resumen no incorpora informes de alcance ni visualizaciones para un período de entrega definido. No se calculan a partir de seguidores o muestras de publicaciones. Consultá en Redes los informes disponibles con su período y fuente.</p>
      </section>}
      {socialScope && <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Presencia en buscadores e IA · evidencias guardadas</h3>
        <p className="text-xs text-slate-600">Últimas observaciones disponibles; cada una conserva su propia fecha y consulta. No son una medición uniforme de todo el mercado ni posiciones permanentes. Las comprobaciones manuales son declaraciones del operador; las respuestas automáticas identifican proveedor y modelo. No comparar mercados, consultas o métodos distintos como si fueran la misma medición.</p>
        {socialReady ? social.presence.length ? <PresenceEvidence rows={social.presence.slice(0,10)}/> : <p className="text-xs">Sin observaciones guardadas para este negocio; no se evaluó su presencia en estas plataformas.</p> : <p className="text-xs">Carga pendiente; no entregar el informe.</p>}
        {social.presence.length>10 && <p className="text-xs">Se incluyen las diez observaciones más recientes; el historial completo está en Buscadores e IA.</p>}
      </section>}
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Tres prioridades para la próxima revisión</h3>
        {priorities.length ? <ol className="space-y-3">{priorities.map((issue, index) => <li key={issue.id} data-pdf-keep={`priority-${issue.id}`} className="rounded-xl border border-slate-200 p-4 text-sm">
          <strong>{index + 1}. {issue.name}</strong><p className="text-xs text-slate-600 mt-1">{issue.simpleExplanation}</p>
          <p className="text-xs text-slate-600 mt-1">Propuesta: {issue.possibleSolution}</p>
          <p className="text-[10px] text-slate-500 mt-2">{useDemoMetrics ? 'Prioridad de ejemplo' : `Hallazgo de auditoría · ${dateLabel(issue.checkedAt)}`}. Validar el cambio antes de ejecutarlo.</p>
        </li>)}</ol> : <p className="text-sm text-slate-500">No hay prioridades verificadas pendientes en las fuentes disponibles. Esto no equivale a una revisión completa de todo el sitio.</p>}
      </section>
      {isReal && <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Estado del plan de acción</h3>
        {currentTasks.length ? <><p className="text-xs text-slate-600">{plan.pending} tareas pendientes o en curso · {plan.manualCompleted} marcadas como completadas manualmente · {plan.verified} registradas como verificadas por auditoría.</p>
          {plan.notes.map(task => <div key={task.id} data-pdf-keep={`note-${task.id}`} className="rounded-xl border border-slate-200 p-3 text-xs space-y-1">
            <strong>{task.title} · Nota manual</strong><p className="whitespace-pre-wrap break-words text-slate-600">{task.userEvidence}</p>
            <p className="text-slate-500">Actualizada: {dateLabel(task.manualUpdatedAt)}. Registro de avance, no medición técnica.</p>
          </div>)}
          {currentTasks.filter(task => task.auditEvidence && task.status === 'verificada_auditoria').slice(0, 3).map(task => <div key={`verified-${task.id}`} data-pdf-keep={`verification-${task.id}`} className="rounded-xl border border-emerald-200 p-3 text-xs space-y-1">
            <strong>{task.title} · Factor verificado por auditoría</strong>
            <p>{task.auditEvidence!.metricValue || 'Resultado correcto del factor evaluado'} · {measurementTime(task.auditEvidence!.checkedAt, business.timezone)}.</p>
            <p className="break-all">URL comprobada: {task.auditEvidence!.url}</p>
            <p>La comprobación se limita a ese factor y fecha; no certifica toda la web.</p>
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
