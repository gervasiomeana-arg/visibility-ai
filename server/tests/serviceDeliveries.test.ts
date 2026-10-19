import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {buildImprovementPlan,buildMonthlyFollowup,buildImplementation,monthWindow,type DeliveryContext} from '../../shared/serviceDeliveries';
import {auditRunBlocks,validateAuditRun,type AuditRun,type ServiceWork} from '../../shared/auditRun';
import {createReportPdf} from '../../shared/reportPdf';
const now='2026-10-19T00:00:00Z';
function social(day='2026-10-10',followers=125):AuditRun{return {id:'social-'+day,workspaceId:'w',businessId:'b',clientId:'c',businessName:'Fixture test only',channel:'networks',observedAt:day+'T00:00:00Z',periodStart:day,periodEnd:day,savedAt:day+'T01:00:00Z',data:{kind:'networks',network:'instagram',snapshot:{id:'snapshot-'+day,profileUrl:'https://www.instagram.com/fixture/',capturedAt:day+'T00:00:00Z',source:'public-web',followers,evidence:'Fixture local; nunca medición de cliente',posts:[],periodStart:day,periodEnd:day}}};}
function web():AuditRun{const date='2026-10-12T00:00:00Z';return {id:'web-fixture',workspaceId:'w',businessId:'b',clientId:'c',businessName:'Fixture test only',channel:'web',observedAt:date,periodStart:'2026-10-12',periodEnd:'2026-10-12',savedAt:date,data:{kind:'web',result:{requestedUrl:'https://business.example/',finalUrl:'https://business.example/',fetchedAt:date,httpStatus:200,responseTimeMs:50,pageSpeed:null,pageSpeedError:'Fixture unavailable',items:[{id:'h1',key:'h1',title:'Encabezado H1',category:'Contenido y On-Page',status:'warning',statusLabel:'Mejorable',simpleExplanation:'No se detectó H1 en HTML inicial',detectedData:'0 H1 en HTML inicial',solution:'Inspeccionar el DOM renderizado antes de agregar otro H1',whyItMatters:'Estructura semántica',howToVerify:'Inspeccionar y comparar con el código fuente',impact:'Medio',source:'real',checkedAt:date}]}}};}
function context(history:AuditRun[]=[social(),web()]):DeliveryContext{return {workspaceId:'w',now,history,business:{id:'b',workspaceId:'w',name:'Fixture test only',url:'https://business.example/',description:'Descripción del operador para pruebas'} as any,client:{id:'c',workspaceId:'w',name:'Fixture local',kind:'Empresa',country:'AR',email:'',whatsapp:'',businessIds:['b'],monthlyFeeCents:100,currency:'USD',dueDay:10,payments:[],invoices:[],reports:[],brief:{needs:'Revisar visibilidad con evidencia'}}};}
const output=(r:AuditRun)=>auditRunBlocks(r).map(b=>b.text).join('\n');
const proposal:ServiceWork={title:'Actualizar título',scope:'Revisar texto y código fuente',status:'proposal',amountCents:12345,currency:'USD',approval:'',note:''};
test('plan uses real saved findings and supplied questions, retaining source dates and the untouched ledger',()=>{
 const c=context(),before=JSON.stringify(c),r=buildImprovementPlan(c,'¿Qué incluye el servicio?');
 assert.equal(r.channel,'plan');assert.equal(r.savedAt,undefined);assert.match(output(r),/Media · Encabezado H1/);assert.match(output(r),/0 H1 en HTML inicial/);assert.match(output(r),/Inspeccionar el DOM/);assert.match(output(r),/Pregunta aportada por el operador: ¿Qué incluye/);assert.match(output(r),/no es contenido terminado/);assert.match(output(r),/2026-10-12T00:00:00Z/);assert.equal(JSON.stringify(c),before);
});
test('plan does not invent questions or use unsaved or old-site audit sources',()=>{
 const c=context();c.history[0].savedAt=undefined;c.business.url='https://changed.example/';assert.throws(()=>buildImprovementPlan(c,''),/Primero ejecutá/);
 const r=buildImprovementPlan(context([social()]),'');assert.match(output(r),/No se aportaron preguntas reales/);assert.throws(()=>buildImprovementPlan(context(),'a\n'.repeat(11)),/hasta diez/);
});
test('service documents reject foreign workspace/client/business history even if that record would not be selected',()=>{
 for(const patch of [{clientId:'another'},{businessId:'another'},{workspaceId:'another'}])assert.throws(()=>buildImprovementPlan(context([{...social(),...patch}]),''),/otro cliente/);
 const c=context();c.client.businessIds=[];assert.throws(()=>buildImplementation(c,proposal),/asociado/);
});
test('latest evidence per source is used once in a plan instead of repeated findings',()=>{
 const a=social('2026-10-01',100),b=social('2026-10-10',125);const r=buildImprovementPlan(context([a,b]),'');assert.equal(r.data.kind,'service');if(r.data.kind==='service')assert.deepEqual(r.data.sources.map(s=>s.id),[b.id]);
});
test('monthly follow-up selects actual observations in the month and compares compatible earlier snapshots without fabricated reach',()=>{
 const r=buildMonthlyFollowup(context([social('2026-09-12',100),social('2026-10-03',110),social('2026-10-10',125)]),'2026-10');
 assert.equal(r.periodStart,'2026-10-01');assert.equal(r.periodEnd,'2026-10-19');assert.match(output(r),/corte parcial/);assert.match(output(r),/100 → 125/);assert.match(output(r),/Variación del recuento reportado: 25/);assert.match(output(r),/Página web: sin mediciones guardadas/);assert.match(output(r),/alcance: sin datos verificados/);assert.doesNotMatch(output(r),/Seguidores observados: 110/);
 if(r.data.kind==='service')assert.equal(r.data.sources.length,2);
});
test('an old capture cannot populate a missing month and unknown values do not become zero',()=>{
 assert.throws(()=>buildMonthlyFollowup(context([social('2026-09-12')]),'2026-10'),/No hay mediciones/);
 const r=buildMonthlyFollowup(context([social()]),'2026-10');assert.match(output(r),/no se calculó una evolución/);assert.doesNotMatch(output(r),/Variación.*0|Alcance: 0/);
});
test('monthly Search Console requires the exact chosen period, not overlapping query windows',()=>{
 const search:AuditRun={...social('2026-10-18'),id:'gsc',channel:'search',periodStart:'2026-10-01',periodEnd:'2026-10-19',data:{kind:'search',siteUrl:'sc-domain:business.example',result:{startDate:'2026-10-01',endDate:'2026-10-19',rows:[]}}};
 assert.match(output(buildMonthlyFollowup(context([search]),'2026-10')),/No se recuperaron consultas/);
 const mismatch={...search,periodStart:'2026-09-20',periodEnd:'2026-10-18',data:{...search.data,result:{startDate:'2026-09-20',endDate:'2026-10-18',rows:[]}}} as AuditRun;
 assert.throws(()=>buildMonthlyFollowup(context([mismatch]),'2026-10'),/No hay mediciones/);
});
test('month windows validate real calendar months and keep leap years and completed months exact',()=>{
 assert.deepEqual(monthWindow('2024-02',now),{start:'2024-02-01',end:'2024-02-29',previous:'2024-01'});
 for(const m of ['2026-00','2026-13','2026-11','invalid'])assert.throws(()=>monthWindow(m,now));
 assert.doesNotMatch(output(buildMonthlyFollowup(context([social('2026-09-12')]),'2026-09')),/corte parcial/);
});
test('implementation records scope and proposed price without payments, automatic edits or false verification',()=>{
 const c=context(),before=JSON.stringify(c),r=buildImplementation(c,proposal);assert.match(output(r),/123.45 USD. No acredita pago/);assert.match(output(r),/no medido automáticamente/);assert.match(output(r),/No ejecuta cambios/);assert.equal(JSON.stringify(c),before);
 for(const work of [{...proposal,status:'approved'},{...proposal,status:'in_progress'},{...proposal,status:'implemented',approval:'Correo del operador'}])assert.throws(()=>buildImplementation(c,work as ServiceWork));
 assert.doesNotThrow(()=>buildImplementation(c,{...proposal,status:'implemented',approval:'Aprobado por correo, 12 de octubre',note:'Cambio realizado. Pendiente volver a auditar.',evidenceUrl:'https://business.example/'}));
 for(const work of [{...proposal,status:'verified'},{...proposal,amountCents:-1},{...proposal,currency:'ZZZ'},{...proposal,evidenceUrl:'javascript:alert(1)'},{...proposal,dueOn:'2026-02-30'}])assert.throws(()=>buildImplementation(c,work as ServiceWork));
});
test('implementation progress is append-only and must refer to a saved work for this client',()=>{
 const c=context(),old={...buildImplementation(c,proposal),savedAt:now};c.history.push(old);const before=JSON.stringify(old);
 const next=buildImplementation(c,{...proposal,previousId:old.id,status:'approved',approval:'Operador registra aprobación por correo'});assert.notEqual(next.id,old.id);assert.match(output(next),new RegExp(old.id));assert.equal(JSON.stringify(old),before);
 assert.throws(()=>buildImplementation(c,{...proposal,previousId:'missing'}),/registro anterior/);
});
test('validation refuses recursive, foreign, duplicated, unsaved or future sources and service channels in combined reports',()=>{
 const r=buildImprovementPlan(context(),'');if(r.data.kind!=='service')throw new Error();const data=r.data;
 for(const source of [{...social(),clientId:'foreign'},{...social(),savedAt:undefined},{...r,savedAt:now},{...social(),observedAt:'2026-10-19T01:00:00Z'}])assert.throws(()=>validateAuditRun({...r,data:{...data,sources:[source]}}));
 assert.throws(()=>validateAuditRun({...r,data:{...data,sources:[social(),social()]}}));
 assert.throws(()=>validateAuditRun({...r,channel:'monthly'}));
 assert.throws(()=>validateAuditRun({...r,data:{...data,blocks:[{kind:'script',text:'bad'} as any]}}));
 assert.throws(()=>validateAuditRun({...r,channel:'combined',data:{kind:'combined',runs:[{...r,savedAt:now}]}}));
});
test('service documents generate PDFs with their service name, source references, periods and manual work labels',()=>{
 const fonts={regular:readFileSync(new URL('../../src/assets/pdf-fonts/DejaVuSans-report.ttf',import.meta.url)).toString('base64'),bold:readFileSync(new URL('../../src/assets/pdf-fonts/DejaVuSans-report-bold.ttf',import.meta.url)).toString('base64')};
 const dir=mkdtempSync(join(tmpdir(),'visibility-services-'));try{
  const docs=[buildImprovementPlan(context(),'¿Qué incluye?'),buildMonthlyFollowup(context(),'2026-10'),buildImplementation(context(),proposal)];
  for(const r of docs){const path=join(dir,r.channel+'.pdf');writeFileSync(path,Buffer.from(createReportPdf(auditRunBlocks(r),fonts)));const text=execFileSync('pdftotext',[path,'-'],{encoding:'utf8'});assert.match(text,/Fixture test only/);assert.match(text,/Preparado:/);assert.match(text,new RegExp(r.periodStart));if(r.channel==='implementation')assert.match(text,/No acredita pago/);else assert.match(text,/Fuentes conservadas/);}
 }finally{rmSync(dir,{recursive:true,force:true});}
});
