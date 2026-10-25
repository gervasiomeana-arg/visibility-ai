import {validateGoogleBusinessSnapshot,type GoogleBusinessSnapshot} from './googleBusiness';
import {validCurrency} from './clientLedger';
import {calendarDay,publicSourceLabel,validatePublicSnapshot,type PublicNetwork,type PublicSnapshot} from './socialMetrics';
import {validateSeoAuditResponse} from './seoAuditResponse';
import {validatePresenceObservation,type PresenceObservation} from './presenceAnalysis';
import {validateSearchQueryRows,validateSearchTotals,type SearchMetricTotals} from './searchAnalytics';
import type {SeoAuditResult} from '../src/types';
import type {ReportPdfBlock} from './reportPdf';
export type MeasurementChannel='web'|'networks'|'search'|'ai';
export const measurementChannels:readonly MeasurementChannel[]=['web','networks','search','ai'];
export type AuditChannel=MeasurementChannel|'combined'|'plan'|'monthly'|'implementation';
export interface ServiceWork {title:string;scope:string;status:'proposal'|'approved'|'in_progress'|'implemented';amountCents:number;currency:string;dueOn?:string;approval:string;note:string;evidenceUrl?:string;previousId?:string;}
export function validateServiceWork(w:ServiceWork){
 const bounded=(v:unknown,max:number,required=false)=>typeof v==='string'&&v.length<=max&&(!required||!!v.trim());
 if(!w||!bounded(w.title,200,true)||!bounded(w.scope,5000,true)||!['proposal','approved','in_progress','implemented'].includes(w.status)||!Number.isSafeInteger(w.amountCents)||w.amountCents<0||w.amountCents>1e12||!validCurrency(w.currency)||!bounded(w.approval,2000)||!bounded(w.note,5000))throw new Error('Completá título, alcance, estado, presupuesto y moneda válidos.');
 if(w.status!=='proposal'&&!w.approval.trim())throw new Error('Registrá cómo y cuándo se aprobó el alcance antes de avanzar.');
 if(w.status==='implemented'&&!w.note.trim())throw new Error('Registrá qué se implementó y la evidencia para comprobarlo.');
 if(w.dueOn!==undefined&&!calendarDay(w.dueOn))throw new Error('Fecha objetivo inválida.');
 if(w.previousId!==undefined&&!bounded(w.previousId,200,true))throw new Error('Referencia anterior inválida.');
 if(w.evidenceUrl!==undefined){try{const u=new URL(w.evidenceUrl);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||w.evidenceUrl.length>2000)throw new Error();}catch{throw new Error('La referencia debe ser una URL HTTP o HTTPS sin credenciales.');}}
 return w;
}
export const auditChannelNames:Record<AuditChannel,string>={web:'Página web',networks:'Redes',search:'Buscadores',ai:'IA',combined:'Informe combinado',plan:'Plan de mejoras',monthly:'Seguimiento mensual',implementation:'Implementación adicional'};
export interface AuditRun {
 id:string;workspaceId:string;businessId:string;clientId:string;businessName:string;
 channel:AuditChannel;observedAt:string;periodStart:string;periodEnd:string;savedAt?:string;
 data:{kind:'google-business';snapshot:GoogleBusinessSnapshot}|{kind:'web';result:SeoAuditResult}|{kind:'networks';network:PublicNetwork;snapshot:PublicSnapshot}|{kind:'search';siteUrl:string;result:{rows:any[];startDate:string;endDate:string;totals?:SearchMetricTotals|null}}|{kind:'presence';observation:PresenceObservation}|{kind:'combined';runs:AuditRun[]}|{kind:'service';service:'plan'|'monthly'|'implementation';blocks:ReportPdfBlock[];sources:AuditRun[];work?:ServiceWork};
}
export function validateAuditRun(r:AuditRun):AuditRun {
 if(!r||![r.id,r.workspaceId,r.businessId,r.clientId,r.businessName].every(v=>typeof v==='string'&&v.length>0&&v.length<=200)||!Object.hasOwn(auditChannelNames,r.channel)||!r.data||!calendarDay(r.periodStart)||!calendarDay(r.periodEnd)||r.periodStart>r.periodEnd||r.periodEnd>new Date().toISOString().slice(0,10)||!Number.isFinite(Date.parse(r.observedAt))||Date.parse(r.observedAt)>Date.now())throw new Error('La auditoría necesita cliente, negocio, fechas y datos verificables.');
 if(JSON.stringify(r).length>500000)throw new Error('La auditoría supera el tamaño admitido; consultá un período menor.');
 if(r.data.kind==='google-business'){
  const s=validateGoogleBusinessSnapshot(r.data.snapshot);if(r.channel!=='search'||s.observedAt!==r.observedAt||r.periodStart!==s.observedAt.slice(0,10)||r.periodEnd!==r.periodStart)throw new Error('Una ficha actual no acredita un período histórico.');
 }else if(r.data.kind==='web'){
  if(r.channel!=='web')throw new Error('Canal incorrecto.');validateSeoAuditResponse(r.data.result,r.data.result.requestedUrl);
  if(r.observedAt!==r.data.result.fetchedAt||r.periodStart!==r.observedAt.slice(0,10)||r.periodEnd!==r.periodStart)throw new Error('Una auditoría web actual no acredita fechas históricas.');
 }else if(r.data.kind==='networks'){
  if(r.channel!=='networks')throw new Error('Canal incorrecto.');const s=validatePublicSnapshot(r.data.network,r.data.snapshot);
  if(s.capturedAt!==r.observedAt||s.periodStart!==r.periodStart||s.periodEnd!==r.periodEnd)throw new Error('La captura no corresponde a la fecha o período.');
 }else if(r.data.kind==='search'){
  if(r.channel!=='search')throw new Error('Canal incorrecto.');if(!r.data.siteUrl||r.data.result.startDate!==r.periodStart||r.data.result.endDate!==r.periodEnd)throw new Error('Propiedad o período incorrecto.');validateSearchQueryRows(r.data.result.rows);if(Object.hasOwn(r.data.result,'totals'))validateSearchTotals(r.data.result.totals);
 }else if(r.data.kind==='presence'){
  const o=validatePresenceObservation(r.data.observation);
  if(!['search','ai'].includes(r.channel)||o.workspaceId!==r.workspaceId||o.businessId!==r.businessId||o.observedAt!==r.observedAt||(r.channel==='search')!==['google','bing','duckduckgo'].includes(o.platform))throw new Error('La evidencia corresponde a otro negocio, fecha o canal.');
 }else if(r.data.kind==='combined'){
  if(r.channel!=='combined'||!Array.isArray(r.data.runs)||!r.data.runs.length||r.data.runs.length>12)throw new Error('Elegí entre una y doce auditorías.');
  for(const child of r.data.runs){if(!measurementChannels.includes(child.channel as MeasurementChannel)||child.workspaceId!==r.workspaceId||child.clientId!==r.clientId||child.businessId!==r.businessId||!child.savedAt)throw new Error('Solo se combinan auditorías guardadas del mismo cliente y negocio.');validateAuditRun(child);}
 }else if(r.data.kind==='service'){
  const d=r.data;if(!['plan','monthly','implementation'].includes(r.channel)||r.channel!==d.service||!Array.isArray(d.blocks)||!d.blocks.length||d.blocks.length>1000||d.blocks.some(b=>!b||!['brand','title','heading','strong','body','small'].includes(b.kind)||typeof b.text!=='string'||!b.text.trim()||b.text.length>20000||(b.keepTogether!==undefined&&(typeof b.keepTogether!=='string'||b.keepTogether.length>200))))throw new Error('Documento de servicio inválido.');
  if(!Array.isArray(d.sources)||d.sources.length>24||(d.service!=='implementation'&&!d.sources.length)||new Set(d.sources.map(s=>s.id)).size!==d.sources.length)throw new Error('El documento necesita fuentes guardadas únicas.');
  for(const source of d.sources){if(!measurementChannels.includes(source.channel as MeasurementChannel)||!source.savedAt||source.workspaceId!==r.workspaceId||source.clientId!==r.clientId||source.businessId!==r.businessId||source.observedAt>r.observedAt)throw new Error('Las fuentes deben ser mediciones guardadas de este cliente y anteriores al documento.');validateAuditRun(source);}
  if(d.service==='implementation'){validateServiceWork(d.work!);if(d.work?.previousId===r.id)throw new Error('El registro anterior debe ser diferente.');}else if(d.work!==undefined)throw new Error('El documento no admite un registro de implementación.');
  if(d.service!=='monthly'&&(r.periodStart!==r.observedAt.slice(0,10)||r.periodEnd!==r.periodStart))throw new Error('El registro conserva su fecha de preparación real.');
  if(d.service==='monthly'&&(r.periodStart.slice(8)!=='01'||r.periodStart.slice(0,7)!==r.periodEnd.slice(0,7)))throw new Error('El seguimiento corresponde a un único mes.');
 }else throw new Error('Fuente de auditoría no admitida.');
 return r;
}
export function auditRunBlocks(run:AuditRun):ReportPdfBlock[]{
 validateAuditRun(run);
 const b:ReportPdfBlock[]=[{kind:'brand',text:'VISIBILITY · INFORME CON FUENTES'},{kind:'title',text:run.businessName},{kind:'heading',text:run.data.kind==='service'?auditChannelNames[run.channel]:`Auditoría de ${auditChannelNames[run.channel]}`},{kind:'body',text:`${run.data.kind==='service'?'Preparado':'Observado'}: ${run.observedAt}. Período solicitado: ${run.periodStart} a ${run.periodEnd}.`},{kind:'small',text:'La fecha de observación y el período solicitado son distintos. Solo se informa lo disponible en las fuentes; no se reconstruyen datos ausentes ni se garantizan posiciones o ventas.'}];
 const add=(text:string,kind:ReportPdfBlock['kind']='body',keepTogether?:string)=>b.push({kind,text,...(keepTogether?{keepTogether}:{})});
 const d=run.data;
 if(d.kind==='google-business'){
  const s=d.snapshot,l=s.location;add('Fuente: Google Business Information API · accounts.locations.list. Cuenta '+s.account+' · '+l.name,'small');add('Ficha confirmada por el operador: '+l.title);for(const [label,value]of [['Categoría',l.category],['Web',l.websiteUri],['Teléfono',l.phone],['Dirección',l.address],['Horarios informados por Google (JSON)',l.hours],['Google Maps',l.mapsUri]])add(label+': '+(value||'Sin dato verificado'));add('Esta lectura describe la ficha observada hoy. No acredita verificación de propiedad, posición en Maps, reseñas, llamadas, visualizaciones, alcance ni evolución histórica.');add('Propuesta: contrastar estos datos con la información confirmada del cliente y corregir discrepancias en Google Business Profile después de su aprobación.');
 }else if(d.kind==='web'){
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
  const rows=d.result.rows;const clicks=rows.reduce((n,r)=>n+r.clicks,0),impressions=rows.reduce((n,r)=>n+r.impressions,0);add(`Fuente: Google Search Console · ${d.siteUrl}. Búsqueda web, datos finalizados. Fechas según Google: hora del Pacífico. Sin segmentación por país o dispositivo.`,'small');
  const totals=d.result.totals;
  if(totals)add(`Totales de la propiedad (consulta sin dimensiones): Clics: ${totals.clicks}. Impresiones: ${totals.impressions}. CTR: ${totals.impressions>0?(100*totals.ctr).toFixed(2)+' %':'Sin dato calculable'}. Posición media: ${totals.impressions>0?totals.position:'Sin dato calculable'}.`);
  else add('Totales de la propiedad: sin dato verificado en este registro. No se deducen de las consultas recuperadas.');
  add(`Muestra de consultas recuperadas: ${rows.length} (hasta 100). Clics de esta muestra: ${clicks}. Impresiones de esta muestra: ${impressions}. La muestra omite consultas anónimas y no equivale a los totales de la propiedad.`);
  if(!rows.length)add('No se recuperaron consultas para este período. Esto no demuestra que el sitio no haya recibido visitas.');
  for(const r of rows)add(`${r.query} · ${r.clicks} clics · ${r.impressions} impresiones · posición media ${r.impressions>0?r.position:'Sin dato calculable'}.`,'small');
  add('Propuesta: revisar consultas con impresiones y contrastar las páginas asociadas. La posición media no es una posición fija y la muestra no equivale al tráfico total.');
 }else if(d.kind==='combined'){
  add('Selección de auditorías guardadas. No se realizó una medición nueva. Cada sección conserva sus fechas y fuentes.');for(const child of d.runs)b.push(...auditRunBlocks(child).filter(x=>!['brand','title'].includes(x.kind)));
 }else if(d.kind==='service'){
  // Layout metadata is applied at export time, including to older saved plans.
  // Never rewrite the saved evidence or split an action that fits on one page.
  let section:string|undefined;
  b.push(...d.blocks.map((block,index)=>{
   if(block.kind==='heading')section=`${run.id}-service-section-${index}`;
   return {...block,...(!block.keepTogether&&section?{keepTogether:section}:{})};
  }));
  if(d.sources.length){const group=`${run.id}-sources`;add('Fuentes conservadas','strong',group);for(const source of d.sources)add(`${auditChannelNames[source.channel]} · registro ${source.id} · observado ${source.observedAt} · período ${source.periodStart} a ${source.periodEnd}`,'small',group);}
 }else{
  const o=d.observation;add(`Plataforma: ${o.platform} · Método: ${o.method} ${o.model?`· Modelo: ${o.model}`:''}`);add(`Consulta exacta: ${o.query}. Mercado: ${o.market}. Idioma: ${o.language}. Dispositivo: ${o.device}.`);
  add(o.method==='gemini-api'?'Respuesta API con fuentes, pendiente de revisión. Incluye contexto de la marca; no demuestra recomendación espontánea ni reproduce otros asistentes.':`Comprobación manual aportada por el operador: ${o.result}.`);if(o.position!==undefined)add(`Posición orgánica observada manualmente: ${o.position}. No es una posición permanente.`);add(o.excerpt);add(`Referencia: ${o.evidenceUrl}`,'small');for(const s of o.sources||[])add(`${s.title}: ${s.url}`,'small');if(o.recommendation)add(`Propuesta: ${o.recommendation}`);
 }
 return b;
}
