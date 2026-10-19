import {calendarDay,publicSourceLabel,validatePublicSnapshot,type PublicNetwork,type PublicSnapshot} from './socialMetrics';
import {validateSeoAuditResponse} from './seoAuditResponse';
import {validatePresenceObservation,type PresenceObservation} from './presenceAnalysis';
import {validateSearchQueryRows} from './searchAnalytics';
import type {SeoAuditResult} from '../src/types';
import type {ReportPdfBlock} from './reportPdf';
export type AuditChannel='web'|'networks'|'search'|'ai'|'combined';
export const auditChannelNames:Record<AuditChannel,string>={web:'Página web',networks:'Redes',search:'Buscadores',ai:'IA',combined:'Informe combinado'};
export interface AuditRun {
 id:string;workspaceId:string;businessId:string;clientId:string;businessName:string;
 channel:AuditChannel;observedAt:string;periodStart:string;periodEnd:string;savedAt?:string;
 data:{kind:'web';result:SeoAuditResult}|{kind:'networks';network:PublicNetwork;snapshot:PublicSnapshot}|{kind:'search';siteUrl:string;result:{rows:any[];startDate:string;endDate:string}}|{kind:'presence';observation:PresenceObservation}|{kind:'combined';runs:AuditRun[]};
}
export function validateAuditRun(r:AuditRun):AuditRun {
 if(!r||![r.id,r.workspaceId,r.businessId,r.clientId,r.businessName].every(v=>typeof v==='string'&&v.length>0&&v.length<=200)||!Object.hasOwn(auditChannelNames,r.channel)||!r.data||!calendarDay(r.periodStart)||!calendarDay(r.periodEnd)||r.periodStart>r.periodEnd||r.periodEnd>new Date().toISOString().slice(0,10)||!Number.isFinite(Date.parse(r.observedAt))||Date.parse(r.observedAt)>Date.now())throw new Error('La auditoría necesita cliente, negocio, fechas y datos verificables.');
 if(JSON.stringify(r).length>500000)throw new Error('La auditoría supera el tamaño admitido; consultá un período menor.');
 if(r.data.kind==='web'){
  if(r.channel!=='web')throw new Error('Canal incorrecto.');validateSeoAuditResponse(r.data.result,r.data.result.requestedUrl);
  if(r.observedAt!==r.data.result.fetchedAt||r.periodStart!==r.observedAt.slice(0,10)||r.periodEnd!==r.periodStart)throw new Error('Una auditoría web actual no acredita fechas históricas.');
 }else if(r.data.kind==='networks'){
  if(r.channel!=='networks')throw new Error('Canal incorrecto.');const s=validatePublicSnapshot(r.data.network,r.data.snapshot);
  if(s.capturedAt!==r.observedAt||s.periodStart!==r.periodStart||s.periodEnd!==r.periodEnd)throw new Error('La captura no corresponde a la fecha o período.');
 }else if(r.data.kind==='search'){
  if(r.channel!=='search')throw new Error('Canal incorrecto.');if(!r.data.siteUrl||r.data.result.startDate!==r.periodStart||r.data.result.endDate!==r.periodEnd)throw new Error('Propiedad o período incorrecto.');validateSearchQueryRows(r.data.result.rows);
 }else if(r.data.kind==='presence'){
  const o=validatePresenceObservation(r.data.observation);
  if(!['search','ai'].includes(r.channel)||o.workspaceId!==r.workspaceId||o.businessId!==r.businessId||o.observedAt!==r.observedAt||(r.channel==='search')!==['google','bing','duckduckgo'].includes(o.platform))throw new Error('La evidencia corresponde a otro negocio, fecha o canal.');
 }else if(r.data.kind==='combined'){
  if(r.channel!=='combined'||!Array.isArray(r.data.runs)||!r.data.runs.length||r.data.runs.length>12)throw new Error('Elegí entre una y doce auditorías.');
  for(const child of r.data.runs){if(child.channel==='combined'||child.workspaceId!==r.workspaceId||child.clientId!==r.clientId||child.businessId!==r.businessId||!child.savedAt)throw new Error('Solo se combinan auditorías guardadas del mismo cliente y negocio.');validateAuditRun(child);}
 }else throw new Error('Fuente de auditoría no admitida.');
 return r;
}
export function auditRunBlocks(run:AuditRun):ReportPdfBlock[]{
 validateAuditRun(run);
 const b:ReportPdfBlock[]=[{kind:'brand',text:'VISIBILITY · INFORME CON FUENTES'},{kind:'title',text:run.businessName},{kind:'heading',text:`Auditoría de ${auditChannelNames[run.channel]}`},{kind:'body',text:`Observado: ${run.observedAt}. Período solicitado: ${run.periodStart} a ${run.periodEnd}.`},{kind:'small',text:'La fecha de observación y el período solicitado son distintos. Solo se informa lo disponible en las fuentes; no se reconstruyen datos ausentes ni se garantizan posiciones o ventas.'}];
 const add=(text:string,kind:ReportPdfBlock['kind']='body',keepTogether?:string)=>b.push({kind,text,...(keepTogether?{keepTogether}:{})});
 const d=run.data;
 if(d.kind==='web'){
  add('Resumen','heading');const items=d.result.items;add(`${items.filter(i=>i.status==='ok').length} factores correctos · ${items.filter(i=>i.status==='warning').length} advertencias · ${items.filter(i=>i.status==='error').length} errores.`);
  add(`Fuente: HTML inicial sin ejecutar JavaScript. URL solicitada: ${d.result.requestedUrl}. URL final: ${d.result.finalUrl}. HTTP ${d.result.httpStatus}. Respuesta inicial: ${d.result.responseTimeMs} ms.`,'small');
  if(d.result.pageSpeed)add(`PageSpeed móvil: ${d.result.pageSpeed.performanceScore??'Sin puntuación'}/100 · ${d.result.pageSpeed.fetchedAt}. Medición de laboratorio, no experiencia de todos los visitantes.`);
  else add(`PageSpeed: sin medición disponible. ${d.result.pageSpeedError||''}`);
  for(const i of items){add(i.title,'heading');add(`Estado medido: ${i.statusLabel||i.status}. ${i.detectedData||i.simpleExplanation}`);if(i.whyItMatters)add(`Por qué importa: ${i.whyItMatters}`);add(`Propuesta: ${i.proposedChange||i.solution}`);if(i.howToVerify)add(`Comprobación: ${i.howToVerify}`);}
 }else if(d.kind==='networks'){
  const s=d.snapshot;add(`Red: ${d.network} · Perfil: ${s.profileUrl}`);add(d.network==='youtube'?`Suscriptores reportados por YouTube: ${s.followers??'Sin dato verificado'} (redondeados por la plataforma).`:`Seguidores observados: ${s.followers??'Sin dato verificado'}.`);add(`Publicaciones/videos acumulados: ${s.totalPosts??'Sin dato verificado'}. Publicaciones recuperadas del período: ${s.posts.length}.`);
  add(`Fuente: ${publicSourceLabel(s.source)}. ${s.evidence}`,'small');add('Visualizaciones mensuales y alcance: sin datos verificados en esta consulta pública. No se deducen de seguidores ni de las vistas acumuladas de una muestra.');
  if(s.coverage)add(`Cobertura: ${s.coverage.status} · ${s.coverage.reason} · ${s.coverage.pages} páginas; ${s.coverage.examined} elementos examinados y ${s.coverage.rejected} no válidos.`);
  for(const [index,p] of s.posts.entries()){const group=`${run.id}-post-${index}`;add(`${p.publishedAt} · ${p.url}`,'small',group);add(`Me gusta: ${p.likes??'Sin dato'} · Comentarios: ${p.comments??'Sin dato'} · Vistas acumuladas a la observación: ${p.views??'Sin dato'}`,'small',group);}
  add('Propuesta: repetir una medición en otra fecha para comparar recuentos compatibles. Revisar las publicaciones identificadas antes de proponer cambios de contenido.');
 }else if(d.kind==='search'){
  const rows=d.result.rows;const clicks=rows.reduce((n,r)=>n+r.clicks,0),impressions=rows.reduce((n,r)=>n+r.impressions,0);add(`Fuente: Google Search Console · ${d.siteUrl}. Hasta 100 consultas recuperadas, datos finalizados. Sin segmentación por país o dispositivo.`,'small');add(`Consultas recuperadas: ${rows.length}. Clics: ${clicks}. Impresiones: ${impressions}. CTR: ${impressions>0?(100*clicks/impressions).toFixed(2)+' %':'Sin dato calculable'}.`);
  if(!rows.length)add('No se recuperaron consultas para este período. Esto no demuestra que el sitio no haya recibido visitas.');
  for(const r of rows)add(`${r.query} · ${r.clicks} clics · ${r.impressions} impresiones · posición media ${r.impressions>0?r.position:'Sin dato calculable'}.`,'small');
  add('Propuesta: revisar consultas con impresiones y contrastar las páginas asociadas. La posición media no es una posición fija y la muestra no equivale al tráfico total.');
 }else if(d.kind==='combined'){
  add('Selección de auditorías guardadas. No se realizó una medición nueva. Cada sección conserva sus fechas y fuentes.');for(const child of d.runs)b.push(...auditRunBlocks(child).filter(x=>!['brand','title'].includes(x.kind)));
 }else{
  const o=d.observation;add(`Plataforma: ${o.platform} · Método: ${o.method} ${o.model?`· Modelo: ${o.model}`:''}`);add(`Consulta exacta: ${o.query}. Mercado: ${o.market}. Idioma: ${o.language}. Dispositivo: ${o.device}.`);
  add(o.method==='gemini-api'?'Respuesta API con fuentes, pendiente de revisión. Incluye contexto de la marca; no demuestra recomendación espontánea ni reproduce otros asistentes.':`Comprobación manual aportada por el operador: ${o.result}.`);if(o.position!==undefined)add(`Posición orgánica observada manualmente: ${o.position}. No es una posición permanente.`);add(o.excerpt);add(`Referencia: ${o.evidenceUrl}`,'small');for(const s of o.sources||[])add(`${s.title}: ${s.url}`,'small');if(o.recommendation)add(`Propuesta: ${o.recommendation}`);
 }
 return b;
}
