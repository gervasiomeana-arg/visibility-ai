import type { ActionTask, ExecutiveIssue, MonthlyEvolution, SearchHistoryPeriod } from '../src/types';
import { technicalScoreChange } from './scoreEvidence';
import { propertyMatchesBusiness } from './searchConsoleDiagnostics';

export function summaryEvidence(businessId: string, supplied: ExecutiveIssue[]) {
  const own = supplied.filter(issue => issue.businessId === businessId);
  const real = own.filter(issue => issue.source === 'real');
  const issues = real.length ? real : own.filter(issue => issue.source === 'demo');
  return { issues, mode: real.length ? 'real' : issues.length ? 'demo' : 'empty' } as const;
}

export function taskPlanEvidence(businessId: string, supplied: ActionTask[]) {
  const own = supplied.filter(task => task.businessId === businessId);
  const backed = own.filter(task => task.source === 'seo-audit' || task.source === 'manual');
  const tasks = backed.length ? backed : own.filter(task => task.source === 'demo');
  const verified = tasks.filter(task => task.status === 'verificada_auditoria' || (task.status === 'completada' && task.completionType === 'auditoria')).length;
  const manualCompleted = tasks.filter(task => task.status === 'completada_manual' || (task.status === 'completada' && task.completionType !== 'auditoria')).length;
  const pending = tasks.filter(task => task.status === 'pendiente' || task.status === 'en_progreso').length;
  return { tasks, verified, manualCompleted, pending, notes: backed.filter(task => task.userEvidence?.trim()).slice(0, 3) };
}

export function technicalFindingReduction(evolution: MonthlyEvolution): number | null {
  if (technicalScoreChange(evolution) === null || evolution.fixedProblems.length !== evolution.visibility.length) return null;
  if (evolution.fixedProblems[0] !== 0 || evolution.fixedProblems.some(value => !Number.isSafeInteger(value))) return null;
  const value = evolution.fixedProblems.at(-1);
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function findingChangeLabel(value: number | null): string {
  return value === null ? '—' : value === 0 ? 'Sin cambio' : `${Math.abs(value)} ${value > 0 ? 'menos' : 'más'}`;
}

export function measuredSeries(labels: string[], values: number[], positiveOnly = false) {
  return labels.flatMap((label, index) => {
    const value = values[index];
    return typeof value === 'number' && Number.isFinite(value) && (!positiveOnly || value > 0)
      ? [{ label, value, index }] : [];
  });
}

export function reportEvidence(businessId: string, evolution: MonthlyEvolution, issues: ExecutiveIssue[], businessUrl?: string) {
  const ownIssues = issues.filter(issue => issue.businessId === businessId);
  const realIssues = ownIssues.filter(issue => issue.source === 'real');
  const hasMeasurements = evolution.source === 'real' && (
    measuredSeries(evolution.months, evolution.visibility).length > 0 ||
    (businessUrl ? !!reportSearchEvidence(evolution,businessUrl).latest : measuredSeries(evolution.searchMonths || [], evolution.searchImpressions || []).length > 0)
  );
  const mode = hasMeasurements || realIssues.length > 0 ? 'PARCIAL REAL'
    : evolution.source === 'demo' ? 'DEMO' : 'SIN DATOS';
  const usableIssues = mode === 'DEMO' ? ownIssues.filter(issue => issue.source === 'demo') : realIssues;
  const priorities = usableIssues.filter(issue => issue.severity !== 'ok')
    .sort((a, b) => (a.severity === 'high' ? 0 : 1) - (b.severity === 'high' ? 0 : 1) || a.name.localeCompare(b.name)).slice(0, 3);
  return { mode, realIssues, usableIssues, priorities, useDemoMetrics: mode === 'DEMO' };
}

function periodBounds(period: SearchHistoryPeriod | undefined) {
  if (!period?.siteUrl || !/^\d{4}-\d{2}-\d{2}$/.test(period.startDate || '') || !/^\d{4}-\d{2}-\d{2}$/.test(period.endDate || '')) return null;
  const start = Date.parse(period.startDate!); const end = Date.parse(period.endDate!);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end ||
      new Date(start).toISOString().slice(0, 10) !== period.startDate || new Date(end).toISOString().slice(0, 10) !== period.endDate) return null;
  return { start, end, duration: end - start, site: period.siteUrl };
}

export function comparableSearchPeriods(previous?: SearchHistoryPeriod, latest?: SearchHistoryPeriod): boolean {
  const a = periodBounds(previous); const b = periodBounds(latest);
  return !!a && !!b && a.site === b.site && a.duration === b.duration && a.end < b.start;
}

export function searchPositionChange(evolution: MonthlyEvolution): number | null {
  if (evolution.source !== 'real') return null;
  const values = evolution.searchPositions || [];
  const periods = evolution.searchPeriods || [];
  const n = values.length;
  if (n < 2 || periods.length !== n || !comparableSearchPeriods(periods[n - 2], periods[n - 1]) ||
      !Number.isFinite(values[n - 2]) || values[n - 2] <= 0 || !Number.isFinite(values[n - 1]) || values[n - 1] <= 0) return null;
  return Number((values[n - 2] - values[n - 1]).toFixed(1));
}

export function reportSearchEvidence(evolution: MonthlyEvolution, businessUrl: string) {
  const missing = { latest:null, positionChange:null, warning:'' };
  if (evolution.source !== 'real') return missing;
  const periods=evolution.searchPeriods || [], labels=evolution.searchMonths || [];
  const clicks=evolution.searchClicks || [], impressions=evolution.searchImpressions || [];
  if (!periods.length && !labels.length && !clicks.length && !impressions.length) return missing;
  const n=periods.length;
  if (!n || labels.length!==n || clicks.length!==n || impressions.length!==n) return { ...missing,warning:'Las mediciones de búsqueda guardadas están incompletas. Volvé a importar el período antes de incluirlo en el informe.' };
  const period=periods[n-1];
  if (!periodBounds(period) || !Number.isFinite(Date.parse(period.loadedAt))) return { ...missing,warning:'No se pudo validar el período y la fecha de carga de las mediciones de búsqueda. Volvé a importarlas.' };
  if (!propertyMatchesBusiness(period.siteUrl!,businessUrl)) return { ...missing,warning:'Las mediciones de búsqueda guardadas no corresponden al sitio de este negocio. Importá una propiedad correspondiente al sitio actual.' };
  const validCounts=(index:number)=>Number.isSafeInteger(clicks[index]) && clicks[index]>=0 && Number.isSafeInteger(impressions[index]) && impressions[index]>=0 && clicks[index]<=impressions[index];
  if (!validCounts(n-1)) return { ...missing,warning:'Las cifras de búsqueda guardadas no son consistentes. Volvé a importar el período antes de incluirlo en el informe.' };
  const latest={ period,clicks:clicks[n-1],impressions:impressions[n-1],ctr:impressions[n-1]>0?Number((clicks[n-1]/impressions[n-1]*100).toFixed(2)):null };
  const positionChange=n>1 && validCounts(n-2) && Number.isFinite(Date.parse(periods[n-2].loadedAt)) && impressions[n-2]>0 && impressions[n-1]>0 && propertyMatchesBusiness(periods[n-2].siteUrl || '',businessUrl) ? searchPositionChange(evolution):null;
  return {latest,positionChange,warning:''};
}

export function validatedSearchHistory(evolution: MonthlyEvolution, businessUrl: string) {
  const empty={labels:[] as string[],clicks:[] as number[],impressions:[] as number[],ctr:[] as number[],positions:[] as number[],periods:[] as SearchHistoryPeriod[],warning:''};
  if (evolution.source !== 'real') return empty;
  const periods=evolution.searchPeriods || [];
  const labels=evolution.searchMonths || [],clicks=evolution.searchClicks || [],impressions=evolution.searchImpressions || [];
  const latest=reportSearchEvidence(evolution,businessUrl);
  if (periods.length!==labels.length || clicks.length!==labels.length || impressions.length!==labels.length) return {...empty,warning:latest.warning};
  const snapshots=periods.map((_,index)=>reportSearchEvidence({...evolution,
    searchPeriods:periods.slice(0,index+1),searchMonths:labels.slice(0,index+1),
    searchClicks:clicks.slice(0,index+1),searchImpressions:impressions.slice(0,index+1),
    searchPositions:evolution.searchPositions?.slice(0,index+1),
  },businessUrl).latest);
  const positions=evolution.searchPositions || [];
  const excluded=snapshots.filter(snapshot=>!snapshot).length;
  return {
    labels:snapshots.map(snapshot=>snapshot?`${snapshot.period.startDate} a ${snapshot.period.endDate}`:''),
    clicks:snapshots.map(snapshot=>snapshot?.clicks ?? Number.NaN),
    impressions:snapshots.map(snapshot=>snapshot?.impressions ?? Number.NaN),
    ctr:snapshots.map(snapshot=>snapshot?.ctr ?? Number.NaN),
    positions:snapshots.map((snapshot,index)=>snapshot && snapshot.impressions>0 && positions.length===periods.length && Number.isFinite(positions[index]) && positions[index]>0?positions[index]:Number.NaN),
    periods,
    warning:latest.warning || (excluded?`${excluded} medición${excluded===1?'':'es'} de búsqueda excluida${excluded===1?'':'s'} del historial mostrado: no se pudo validar su propiedad, período o cifras. Volvé a importar los datos si corresponde.`:''),
  };
}

export function measurementDateLabel(value?: string, locale = 'es-AR', timeZone = 'UTC'): string {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Sin fecha registrada';
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (dateOnly && new Date(value).toISOString().slice(0, 10) !== value) return 'Sin fecha registrada';
  try {
    return new Date(value).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric', timeZone: dateOnly ? 'UTC' : timeZone });
  } catch {
    return new Date(value).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
}
