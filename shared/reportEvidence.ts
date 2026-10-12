import type { ActionTask, ExecutiveIssue, MonthlyEvolution, SearchHistoryPeriod } from '../src/types';
import { technicalScoreChange } from './scoreEvidence';

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
  const value = evolution.fixedProblems.at(-1);
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function measuredSeries(labels: string[], values: number[], positiveOnly = false) {
  return labels.flatMap((label, index) => {
    const value = values[index];
    return typeof value === 'number' && Number.isFinite(value) && (!positiveOnly || value > 0)
      ? [{ label, value, index }] : [];
  });
}

export function reportEvidence(businessId: string, evolution: MonthlyEvolution, issues: ExecutiveIssue[]) {
  const ownIssues = issues.filter(issue => issue.businessId === businessId);
  const realIssues = ownIssues.filter(issue => issue.source === 'real');
  const hasMeasurements = evolution.source === 'real' && (
    measuredSeries(evolution.months, evolution.visibility).length > 0 ||
    measuredSeries(evolution.searchMonths || [], evolution.searchImpressions || []).length > 0
  );
  const mode = hasMeasurements || realIssues.length > 0 ? 'PARCIAL REAL'
    : evolution.source === 'demo' ? 'DEMO' : 'SIN DATOS';
  const usableIssues = mode === 'DEMO' ? ownIssues.filter(issue => issue.source === 'demo') : realIssues;
  const priorities = usableIssues.filter(issue => issue.severity !== 'ok')
    .sort((a, b) => (a.severity === 'high' ? 0 : 1) - (b.severity === 'high' ? 0 : 1)).slice(0, 3);
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
