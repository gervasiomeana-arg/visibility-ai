import test from 'node:test';
import assert from 'node:assert/strict';
import {auditRunBlocks, type AuditRun} from '../../shared/auditRun';
import {validatePresenceObservation, type PresenceObservation} from '../../shared/presenceAnalysis';

function observation(): PresenceObservation {
  return {id:'fixture-observation',workspaceId:'w',businessId:'b',platform:'gemini',
    query:'Consulta local de prueba',market:'Argentina',language:'Español',device:'desktop',
    observedAt:'2026-01-20T12:00:00Z',method:'gemini-api',result:'unreviewed',model:'fixture-model',
    evidenceUrl:'https://gemini.google.com/app',excerpt:'Respuesta de prueba local con una referencia explícita.',
    recommendation:'Revisar la referencia antes de entregar.',
    sources:[{url:'https://fixture.example/source',title:'Fuente de prueba'}],queries:['consulta de la herramienta']};
}
function report(o=observation()): AuditRun {
  return {id:'fixture-report',workspaceId:'w',businessId:'b',clientId:'c',businessName:'Prueba local',
    channel:o.platform==='google'?'search':'ai',observedAt:o.observedAt,
    periodStart:'2026-01-01',periodEnd:'2026-01-31',data:{kind:'presence',observation:o}};
}

test('an older requested month never becomes continuous AI monitoring and its evidence stays unchanged', () => {
  const run=report(),before=JSON.stringify(run);
  const text=auditRunBlocks(run).map(b=>b.text).join('\n');
  assert.match(text,/Comprobación puntual de una consulta/);
  assert.match(text,/no es una medición continua.*2026-01-01 a 2026-01-31/);
  assert.match(text,/2026-01-20T12:00:00Z/);
  assert.match(text,/pendiente de revisión/);
  assert.match(text,/no demuestra recomendación espontánea/);
  assert.match(text,/Consultas realizadas por la herramienta: consulta de la herramienta/);
  assert.match(text,/fixture.example\/source/);
  assert.match(text,/no acreditan una ubicación geográfica configurada/);
  assert.equal(JSON.stringify(run),before);
});

test('not observed is confined to the actual manual query, never absence from the entire search engine', () => {
  const o:PresenceObservation={...observation(),platform:'google',method:'manual',result:'not-observed',
    model:undefined,sources:undefined,queries:undefined,evidenceUrl:'https://www.google.com/search?q=fixture'};
  const text=auditRunBlocks(report(o)).map(b=>b.text).join('\n');
  assert.match(text,/No observada en esta consulta/);
  assert.match(text,/no representa todas las búsquedas/);
  assert.doesNotMatch(text,/Posición orgánica observada/);
  assert.match(text,/Abrirla de nuevo puede devolver otro resultado/);
});

test('malformed model, citations and tool queries cannot be saved as grounded evidence', () => {
  for(const patch of [
    {model:42},{model:' '},{queries:'apparently valid'},{queries:[42]},
    {queries:[' ']},{queries:['q'.repeat(2001)]},
    {sources:{length:1}},{sources:[null]},
  ])assert.throws(()=>validatePresenceObservation({...observation(),...patch} as PresenceObservation));
  assert.doesNotThrow(()=>validatePresenceObservation(observation()));
});
