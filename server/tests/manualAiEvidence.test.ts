import test from 'node:test';
import assert from 'node:assert/strict';
import {presenceQueryUrl,validatePresenceObservation,type PresenceObservation} from '../../shared/presenceAnalysis';
import {auditRunBlocks,type AuditRun} from '../../shared/auditRun';

test('ChatGPT and Claude web observations retain their own evidence without API models or invented ranks',()=>{
  for(const platform of ['chatgpt','claude'] as const){
    const o:PresenceObservation={id:'fixture-'+platform,workspaceId:'w',businessId:'b',platform,
      query:'Pregunta genérica de prueba sin marca',market:'Ubicación no verificada',language:'Español',device:'desktop',
      observedAt:'2026-01-01T12:00:00Z',method:'manual',result:'not-observed',
      evidenceUrl:platform==='chatgpt'?'https://chatgpt.com/share/fixture':'https://claude.ai/share/fixture',
      excerpt:'Texto de prueba local aportado por el operador, no una respuesta de producción.',
      recommendation:'Revisar las preguntas reales del cliente antes de proponer contenido.'};
    const run:AuditRun={id:o.id,workspaceId:'w',businessId:'b',clientId:'c',businessName:'Prueba local',channel:'ai',
      observedAt:o.observedAt,periodStart:'2026-01-01',periodEnd:'2026-01-01',data:{kind:'presence',observation:o}};
    const text=auditRunBlocks(run).map(b=>b.text).join('\n');
    assert.match(text,new RegExp(`Plataforma: ${platform} · Método: manual`));
    assert.ok(text.includes(o.evidenceUrl));
    assert.match(text,/No observada en esta consulta/);
    assert.doesNotMatch(text,/Modelo:|Posición orgánica observada|API con fuentes/);
    assert.throws(()=>validatePresenceObservation({...o,excerpt:''}));
    assert.throws(()=>validatePresenceObservation({...o,position:1}));
    assert.equal(new URL(presenceQueryUrl(platform,o.query)).hostname,platform==='chatgpt'?'chatgpt.com':'claude.ai');
  }
});
