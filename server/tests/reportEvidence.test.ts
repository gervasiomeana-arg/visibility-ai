import test from 'node:test';
import assert from 'node:assert/strict';
import { comparableSearchPeriods, measurementDateLabel, measuredSeries, reportEvidence, reportSearchEvidence, validatedSearchHistory, searchPositionChange } from '../../shared/reportEvidence';
import { storageService } from '../../src/services/storageService';
import type { ExecutiveIssue, MonthlyEvolution } from '../../src/types';
const empty: MonthlyEvolution = { source: 'real', months: [], visibility: [], googlePositions: [], estimatedVisits: [], consultations: [], fixedProblems: [], monthComparison: { visibilityChangePercent: 0, improvedPositionsCount: 0, solvedProblemsCount: 0, newOpportunitiesCount: 0, consultationsTotal: 0 } };
const issue = (businessId: string, source: 'real' | 'demo', severity: 'high' | 'medium' | 'ok', name: string): ExecutiveIssue => ({ id: name, businessId, source, severity, name, simpleExplanation: '', possibleSolution: '', category: 'SEO', impactText: '' });
const previous = { loadedAt: '2026-10-01', siteUrl: 'sc-domain:openvoley.com', startDate: '2026-09-01', endDate: '2026-09-28' };
const latest = { loadedAt: '2026-11-01', siteUrl: previous.siteUrl, startDate: '2026-10-01', endDate: '2026-10-28' };

test('evolution omits foreign records without shifting the remaining period or copying stored CTR',()=>{
  const evolution={...empty,searchMonths:['wrong old label','wrong new label'],searchPeriods:[{...previous,siteUrl:'sc-domain:foreign.com'},latest],searchClicks:[900,7],searchImpressions:[1000,200],searchCtr:[90,999],searchPositions:[9,12]};
  const result=validatedSearchHistory(evolution,'https://openvoley.com/');
  assert.deepEqual(result.labels,['','2026-10-01 a 2026-10-28']);
  assert.ok(Number.isNaN(result.clicks[0]));assert.ok(Number.isNaN(result.positions[0]));
  assert.equal(result.clicks[1],7);assert.equal(result.ctr[1],3.5);assert.equal(result.positions[1],12);
  assert.ok(result.warning.includes('1 medición'));
  assert.equal(reportSearchEvidence(evolution,'https://openvoley.com/').positionChange,null);
});

test('evolution preserves measured zeros while omitting unmeasured CTR and position',()=>{
  const evolution={...empty,searchMonths:['old','new'],searchPeriods:[previous,latest],searchClicks:[0,0],searchImpressions:[100,0],searchPositions:[12,0]};
  const result=validatedSearchHistory(evolution,'https://openvoley.com/');
  assert.deepEqual(result.clicks,[0,0]);assert.deepEqual(result.impressions,[100,0]);
  assert.equal(result.ctr[0],0);assert.ok(Number.isNaN(result.ctr[1]));assert.ok(Number.isNaN(result.positions[1]));
});

test('evolution rejects misaligned arrays and cannot turn an invalid load date into a position improvement',()=>{
  const evolution={...empty,searchMonths:['old','new'],searchPeriods:[{...previous,loadedAt:'invalid'},latest],searchClicks:[3,7],searchImpressions:[100,200],searchPositions:[18,12]};
  assert.equal(reportSearchEvidence(evolution,'https://openvoley.com/').positionChange,null);
  const result=validatedSearchHistory({...evolution,searchClicks:[7]},'https://openvoley.com/');
  assert.deepEqual(result.labels,[]);assert.deepEqual(result.clicks,[]);assert.ok(result.warning);
});

test('report search metrics share their property and period and derive CTR from supplied counts',()=>{
  const evolution={...empty,searchMonths:['Septiembre','Octubre'],searchPeriods:[previous,latest],searchClicks:[3,7],searchImpressions:[100,200],searchCtr:[999,999],searchPositions:[18,12]};
  const result=reportSearchEvidence(evolution,'https://openvoley.com/');
  assert.equal(result.latest?.period,latest);
  assert.equal(result.latest?.ctr,3.5);
  assert.equal(result.positionChange,6);
  const zero=reportSearchEvidence({...evolution,searchClicks:[3,0],searchImpressions:[100,0]},'https://openvoley.com/');
  assert.equal(zero.latest?.clicks,0);assert.equal(zero.latest?.ctr,null);assert.equal(zero.positionChange,null);
});

test('incomplete, foreign or invalid search data cannot be exported as current report measurements',()=>{
  const valid={...empty,searchMonths:['Octubre'],searchPeriods:[latest],searchClicks:[7],searchImpressions:[100]};
  for(const change of [
    {searchMonths:[]},{searchPeriods:[previous,latest]},{searchClicks:[]},
    {searchPeriods:[{...latest,siteUrl:'sc-domain:other.com'}]},
    {searchPeriods:[{...latest,startDate:'2026-02-30'}]},
    {searchPeriods:[{...latest,loadedAt:'invalid'}]},
    {searchClicks:[-1]},{searchClicks:[101]},{searchImpressions:[Number.NaN]},
  ]){
    const evolution={...valid,...change};
    const result=reportSearchEvidence(evolution,'https://openvoley.com/');
    assert.equal(result.latest,null);assert.equal(result.positionChange,null);assert.ok(result.warning);
    assert.equal(reportEvidence('voley',evolution,[],'https://openvoley.com/').mode,'SIN DATOS');
  }
});

test('real reports exclude demo priorities and other businesses, with errors first', () => {
  const evidence = reportEvidence('voley', empty, [issue('voley', 'demo', 'high', 'Fake'), issue('other', 'real', 'high', 'Foreign'), issue('voley', 'real', 'medium', 'Warning'), issue('voley', 'real', 'ok', 'Correct'), issue('voley', 'real', 'high', 'Error')]);
  assert.equal(evidence.mode, 'PARCIAL REAL');
  assert.deepEqual(evidence.priorities.map(i => i.name), ['Error', 'Warning']);
  assert.equal(evidence.usableIssues.length, 3);
});

test('missing sources remain missing, while a pure demo is explicitly demonstrative', () => {
  assert.equal(reportEvidence('voley', empty, [issue('voley', 'demo', 'high', 'Fake')]).mode, 'SIN DATOS');
  assert.equal(reportEvidence('voley', { ...empty, source: 'demo' }, []).useDemoMetrics, true);
  const mixed = reportEvidence('voley', { ...empty, source: 'demo' }, [issue('voley', 'real', 'high', 'Real')]);
  assert.equal(mixed.mode, 'PARCIAL REAL');
  assert.equal(mixed.useDemoMetrics, false);
});

test('series preserve label alignment and measured zero while excluding invalid values', () => {
  assert.deepEqual(measuredSeries(['a', 'b', 'c', 'd'], [0, Number.NaN, 12, null as any]), [{ label: 'a', value: 0, index: 0 }, { label: 'c', value: 12, index: 2 }]);
  assert.deepEqual(measuredSeries(['a', 'b', 'c'], [0, 12, Number.NaN], true), [{ label: 'b', value: 12, index: 1 }]);
  assert.deepEqual(measuredSeries([], [3]), []);
});

test('only known equal-length non-overlapping periods from the same property compare', () => {
  assert.equal(comparableSearchPeriods(previous, latest), true);
  for (const changes of [
    { startDate: '2026-09-15', endDate: '2026-10-12' }, { siteUrl: 'sc-domain:other.com' },
    { startDate: undefined }, { endDate: '2026-10-29' }, { startDate: '2026-02-30' },
  ]) assert.equal(comparableSearchPeriods(previous, { ...latest, ...changes }), false);
  assert.equal(comparableSearchPeriods(previous, previous), false);
});

test('position changes never manufacture improvement from a missing or zero position', () => {
  const evolution = { ...empty, searchPositions: [18, 12], searchPeriods: [previous, latest] };
  assert.equal(searchPositionChange(evolution), 6);
  assert.equal(searchPositionChange({ ...evolution, searchPositions: [12, 18] }), -6);
  for (const position of [0, Number.NaN, null as any]) assert.equal(searchPositionChange({ ...evolution, searchPositions: [18, position] }), null);
  assert.equal(searchPositionChange({ ...evolution, searchPeriods: [previous, previous] }), null);
  assert.equal(searchPositionChange({ ...evolution, searchPeriods: [] }), null);
});

test('reloading a period updates one snapshot and preserves the actual measurement dates', () => {
  const values = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } });
  storageService.setScope('report-test');
  try {
    const metrics = { clicks: 2, impressions: 50, ctr: 0.04, position: 12 };
    storageService.saveSearchConsoleHistoryPoint('voley', { ...latest, ...metrics });
    storageService.saveSearchConsoleHistoryPoint('voley', { ...previous, ...metrics, loadedAt: '2026-11-02' });
    storageService.saveSearchConsoleHistoryPoint('voley', { ...latest, ...metrics, loadedAt: '2026-11-03', clicks: 4 });
    const history = storageService.getSearchConsoleHistory('voley');
    assert.equal(history.length, 2);
    assert.equal(history[0].startDate, previous.startDate);
    assert.equal(history[1].clicks, 4);
    const evolution = storageService.getEvolution('voley');
    assert.equal(evolution.searchMonths?.[0], '2026-09-01 a 2026-09-28');
    assert.equal(evolution.searchPeriods?.[1].loadedAt, '2026-11-03');
    storageService.saveSearchConsoleHistoryPoint('voley', { ...latest, ...metrics, loadedAt: '2026-11-04', impressions: 0, position: 0 });
    assert.ok(Number.isNaN(storageService.getEvolution('voley').searchPositions?.[1]));
    assert.equal(storageService.getSearchConsoleHistory('other').length, 0);
  } finally {
    storageService.setScope();
    if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete (globalThis as any).localStorage;
  }
});


test('calendar-only measurement dates never shift to the previous day', () => {
  assert.match(measurementDateLabel('2026-10-01', 'es-AR', 'America/Argentina/Buenos_Aires'), /^01 de oct/);
  assert.match(measurementDateLabel('2026-10-01T01:00:00Z', 'es-AR', 'America/Argentina/Buenos_Aires'), /^30 de sept/);
  assert.equal(measurementDateLabel('not-a-date'), 'Sin fecha registrada');
});

test('stored audit counts preserve worsening and subsequent recovery across reloads',()=>{
  const values=new Map<string,string>();
  const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)}});
  storageService.setScope('finding-trend-test');
  try {
    for(const [day,count] of [[1,3],[2,5],[3,2]])storageService.saveAuditHistoryPoint('own',{auditedAt:`2026-10-0${day}T12:00:00Z`,overallScore:70,seoScore:70,webScore:null,unresolvedIssues:count});
    assert.deepEqual(storageService.getEvolution('own').fixedProblems,[0,-2,1]);
    assert.deepEqual(storageService.getEvolution('own').fixedProblems,[0,-2,1]);
    assert.deepEqual(storageService.getEvolution('other').fixedProblems,[]);
  } finally {
    storageService.setScope();
    if(original)Object.defineProperty(globalThis,'localStorage',original);else delete(globalThis as any).localStorage;
  }
});

 test('a verified social source makes a partial real report without promoting demo metrics or priorities',()=>{
 const e=reportEvidence('voley',{...empty,source:'demo'},[issue('voley','demo','high','Demo issue')],'https://openvoley.com/',true);
 assert.equal(e.mode,'PARCIAL REAL');assert.equal(e.useDemoMetrics,false);assert.deepEqual(e.usableIssues,[]);assert.deepEqual(e.priorities,[]);
 });
