import test from 'node:test';
import assert from 'node:assert/strict';
import {auditRunBlocks,type AuditRun} from '../../shared/auditRun';

const at='2026-01-20T12:00:00Z';
function base(id:string):AuditRun{return {id,workspaceId:'w',businessId:'b',clientId:'c',businessName:'Prueba local',channel:'search',observedAt:at,periodStart:'2026-01-01',periodEnd:'2026-01-20',savedAt:at,data:{kind:'search',siteUrl:'sc-domain:fixture.example',result:{startDate:'2026-01-01',endDate:'2026-01-20',rows:[],totals:{clicks:0,impressions:1,ctr:0,position:1}}}};}
function combined(rows:AuditRun[]):AuditRun{return {...base('combined-fixture'),savedAt:undefined,channel:'combined',data:{kind:'combined',runs:rows}};}
function summary(run:AuditRun){const blocks=auditRunBlocks(run);return blocks.slice(blocks.findIndex(b=>b.text==='Resumen ejecutivo'),blocks.findIndex(b=>b.text==='Anexo · evidencias y límites de cada fuente'));}

test('executive summary preserves real totals, distinguishes missing channels and leaves saved evidence untouched',()=>{
 const run=combined([base('search')]),before=JSON.stringify(run),text=summary(run).map(b=>b.text).join('\n');
 assert.match(text,/0 clics y 1 impresiones/);
 assert.match(text,/Consultas recuperadas: 0/);
 assert.match(text,/Alcance pendiente.*Página web, Redes, IA/);
 assert.match(text,/no actualiza las mediciones/);
 assert.match(text,/no se inventaron tareas/);
 assert.match(text,/registro search/);
 assert.equal(JSON.stringify(run),before);
});

test('client actions retain measured evidence and source references, remain bounded, and flag unreviewed AI',()=>{
 const web:AuditRun={...base('web'),channel:'web',periodStart:'2026-01-20',data:{kind:'web',result:{requestedUrl:'https://fixture.example/',finalUrl:'https://fixture.example/',fetchedAt:at,httpStatus:200,responseTimeMs:20,pageSpeed:null,items:Array.from({length:7},(_,i)=>({id:'factor-'+i,key:'factor-'+i,title:'Factor '+i,source:'real' as const,status:i===6?'error' as const:'warning' as const,statusLabel:'Revisar',category:'Contenido y On-Page' as const,impact:'Medio' as const,simpleExplanation:'Dato local '+i,detectedData:'Dato local '+i,solution:'Cambio local '+i,howToVerify:'Comprobar factor '+i,checkedAt:at}))}}};
 const ai=(id:string,reviewed=true):AuditRun=>({...base(id),channel:'ai',data:{kind:'presence',observation:{id,workspaceId:'w',businessId:'b',platform:reviewed?'claude':'gemini',query:'Consulta local de prueba',market:'No verificado',language:'Español',device:'desktop',observedAt:at,method:reviewed?'manual':'gemini-api',result:reviewed?'not-observed':'unreviewed',evidenceUrl:'https://claude.ai/chat/fixture',excerpt:'Evidencia de prueba local sin medición de producción.',recommendation:'Revisión propuesta '+id,...(!reviewed?{model:'fixture-model',sources:[{url:'https://fixture.example/source',title:'Fuente local'}],queries:['consulta local']}:{} )}}});
 const text=summary(combined([web,ai('ai-1'),ai('ai-2'),ai('ai-3',false)])).map(b=>b.text).join('\n');
 assert.match(text,/Revisión pendiente/);
 assert.match(text,/1\. Factor 6/);
 assert.match(text,/Dato observado: Dato local 6/);
 assert.match(text,/Cómo comprobarlo: Comprobar factor 6/);
 assert.match(text,/Fuente: registro web/);
 assert.equal((text.match(/^\d\. /gm)||[]).length,5);
 assert.match(text,/marca no observada en esta respuesta\/consulta/);
 assert.match(text,/no una posición permanente/);
});

test('a known zero follower count remains zero and does not become reach or historical growth',()=>{
 const social:AuditRun={...base('social'),channel:'networks',data:{kind:'networks',network:'facebook',snapshot:{id:'snapshot',profileUrl:'https://www.facebook.com/fixture/',capturedAt:at,source:'public-web',followers:0,posts:[],evidence:'Fixture local, no datos de cliente.',periodStart:'2026-01-01',periodEnd:'2026-01-20'}}};
 const text=summary(combined([social])).map(b=>b.text).join('\n');
 assert.match(text,/Seguidores observados: 0/);
 assert.match(text,/No equivale a alcance/);
 assert.doesNotMatch(text,/Alcance: 0|Crecimiento:|Ventas:/);
});
