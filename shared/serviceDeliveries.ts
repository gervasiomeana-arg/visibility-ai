import {validateAuditRun,auditRunBlocks,type AuditRun,type ServiceWork,measurementChannels,validateServiceWork} from './auditRun';
import {compareAuditRuns} from './compareAuditRuns';
import {normalizeAuditUrl} from './auditUrl';
import type {ClientAccount} from './clientLedger';
import type {Business} from '../src/types';
import type {ReportPdfBlock} from './reportPdf';
export {measurementChannels} from './auditRun';
export const serviceNames={plan:'Plan de mejoras',monthly:'Seguimiento mensual',implementation:'Implementación adicional'};
export interface DeliveryContext {workspaceId:string;client:ClientAccount;business:Business;history:AuditRun[];now?:string;}
const text=(value:string,kind:ReportPdfBlock['kind']='body'):ReportPdfBlock=>({kind,text:value});
function checked(c:DeliveryContext){
 if(c.client.workspaceId!==c.workspaceId||c.business.workspaceId!==c.workspaceId||!c.client.businessIds.includes(c.business.id))throw new Error('Elegí un negocio asociado al cliente de este espacio.');
 for(const r of c.history){validateAuditRun(r);if(r.workspaceId!==c.workspaceId||r.clientId!==c.client.id||r.businessId!==c.business.id)throw new Error('El historial contiene registros de otro cliente o negocio.');}
 return c.history.filter(r=>r.savedAt&&measurementChannels.includes(r.channel as any)&&!(r.data.kind==='web'&&(!c.business.url||normalizeAuditUrl(c.business.url)!==r.data.result.requestedUrl)));
}
function key(r:AuditRun){const d=r.data;return d.kind==='web'?'web':d.kind==='networks'?`network:${d.network}`:d.kind==='search'?`search:${d.siteUrl}`:d.kind==='presence'?`presence:${d.observation.platform}:${d.observation.query}:${d.observation.market}:${d.observation.language}`:r.id;}
function latest(rows:AuditRun[]){const groups=new Map<string,AuditRun>();for(const r of [...rows].sort((a,b)=>b.observedAt.localeCompare(a.observedAt)))if(!groups.has(key(r)))groups.set(key(r),r);return [...groups.values()];}
function wrap(c:DeliveryContext,kind:keyof typeof serviceNames,start:string,end:string,blocks:ReportPdfBlock[],sources:AuditRun[],work?:ServiceWork){const now=c.now||new Date().toISOString();return validateAuditRun({id:crypto.randomUUID(),workspaceId:c.workspaceId,clientId:c.client.id,businessId:c.business.id,businessName:c.business.name,channel:kind,observedAt:now,periodStart:start,periodEnd:end,data:{kind:'service',service:kind,blocks,sources,...(work?{work}:{})}});}
export function buildImprovementPlan(c:DeliveryContext,questionsInput:string){
 const sources=latest(checked(c));if(!sources.length)throw new Error('Primero ejecutá y guardá al menos una auditoría para este cliente y negocio.');
 if(sources.length>12)throw new Error('Hay más de doce fuentes. Prepará el plan con una selección menor de auditorías.');
 const questions=questionsInput.split('\n').map(q=>q.trim()).filter(Boolean);if(questions.length>10||questions.some(q=>q.length>300))throw new Error('Ingresá hasta diez preguntas de clientes, de hasta 300 caracteres cada una.');
 const blocks=[text('Propuesta para revisión. Las prioridades iniciales siguen el estado de los factores, no una estimación de ventas o impacto comercial. No se ejecutaron cambios ni se verificaron mejoras automáticamente.','small')];
 if(c.client.brief?.needs)blocks.push(text(`Objetivos declarados por el cliente: ${c.client.brief.needs}`));
 let count=0;
 for(const r of sources){if(r.data.kind==='web'){
  const findings=r.data.result.items.filter(i=>i.source==='real'&&i.status!=='ok').sort((a,b)=>(a.status==='error'?0:1)-(b.status==='error'?0:1));
  for(const f of findings){count++;blocks.push(text(`${f.status==='error'?'Alta':'Media'} · ${f.title}`,'heading'),text(`Dato medido: ${f.detectedData||f.simpleExplanation}`),text(`Por qué importa: ${f.whyItMatters||f.simpleExplanation}`),text(`Cambio propuesto: ${f.proposedChange||f.solution}`),text(`Cómo comprobarlo: ${f.howToVerify||'Repetir la comprobación del factor y contrastar el resultado con esta evidencia.'}`),text(`Fuente: ${r.data.result.finalUrl} · ${r.observedAt} · registro ${r.id}`,'small'));}
 }else{
  count++;const d=r.data;const measured=d.kind==='networks'?`Perfil ${d.snapshot.profileUrl}. Seguidores observados: ${d.snapshot.followers??'Sin dato verificado'}.`:d.kind==='search'?`Google Search Console: ${d.siteUrl}. Consultas recuperadas: ${d.result.rows.length}. Período: ${r.periodStart} a ${r.periodEnd}.`:d.kind==='presence'?`Consulta: ${d.observation.query}. Plataforma: ${d.observation.platform}. Método: ${d.observation.method}. Extracto registrado: ${d.observation.excerpt}. Referencia: ${d.observation.evidenceUrl}`:'';blocks.push(text(`${r.channel==='networks'?'Redes':r.channel==='search'?'Buscadores':'IA'} · revisión de evidencia`,'heading'),text(`Dato observado: ${measured}`),...auditRunBlocks(r).filter(b=>b.kind!=='brand'&&b.kind!=='title'&&b.text.startsWith('Propuesta:')),...(d.kind==='presence'&&!d.observation.recommendation?[text('Propuesta: revisar la exactitud y las fuentes de la respuesta registrada, identificar datos faltantes y contrastarlos con la web del negocio antes de proponer contenido. No acredita demanda de búsqueda ni recomendación espontánea.')]:[]),text(`Fuente: registro ${r.id} · ${r.observedAt}`,'small'));
 }}
 if(!count)blocks.push(text('Las mediciones seleccionadas no contienen hallazgos técnicos pendientes para generar acciones. Esto no prueba que toda la presencia digital sea óptima.'));
 blocks.push(text('Propuestas de contenido','heading'));
 if(!questions.length)blocks.push(text('No se aportaron preguntas reales de clientes. No se inventaron preguntas, servicios ni temas para completar esta sección.'));
 for(const q of questions){blocks.push(text(q,'heading'),text(`Pregunta aportada por el operador: ${q}`,'small'),text('Propuesta de pieza: una respuesta breve, explicación del servicio o decisión, condiciones y costos confirmados cuando correspondan, y un canal de consulta real.'),text(c.business.description?`Descripción registrada del negocio (revisar antes de publicar): ${c.business.description}`:'Descripción del negocio pendiente de confirmar; completar antes de redactar.'),text('Pendiente editorial: reunir datos y fuentes, redactar la respuesta y revisarla antes de publicar. Este esquema no es contenido terminado ni acredita demanda de búsqueda.','small'));}
 const day=(c.now||new Date().toISOString()).slice(0,10);return wrap(c,'plan',day,day,blocks,sources);
}
export function monthWindow(month:string,now=new Date().toISOString()){
 if(!/^\d{4}-\d{2}$/.test(month)||Number(month.slice(5))<1||Number(month.slice(5))>12||month>now.slice(0,7))throw new Error('Elegí un mes válido, sin fechas futuras.');
 const start=month+'-01',end=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),0)).toISOString().slice(0,10);
 return {start,end:end>now.slice(0,10)?now.slice(0,10):end,previous:new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5))-2,1)).toISOString().slice(0,7)};
}
export function buildMonthlyFollowup(c:DeliveryContext,month:string){
 const rows=checked(c),w=monthWindow(month,c.now),prev=monthWindow(w.previous,c.now);
 const inWindow=(r:AuditRun,start:string,end:string)=>r.data.kind==='search'?r.periodStart===start&&r.periodEnd===end:r.observedAt.slice(0,10)>=start&&r.observedAt.slice(0,10)<=end;
 const current=latest(rows.filter(r=>inWindow(r,w.start,w.end)));if(!current.length)throw new Error('No hay mediciones guardadas compatibles con este mes. Guardá auditorías del período antes de preparar el seguimiento.');
 if(current.length>12)throw new Error('Elegí un conjunto menor de fuentes: el informe admite hasta doce fuentes actuales.');
 const previous=latest(rows.filter(r=>inWindow(r,prev.start,prev.end))),used:AuditRun[]=[...current];
 const blocks=[text(`Período revisado: ${w.start} a ${w.end}. ${w.end<new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),0)).toISOString().slice(0,10)?'Mes en curso: corte parcial.':''}`),text('Se usa la última observación guardada por fuente. Los seguidores son recuentos de una fecha; no se suman capturas ni se convierten publicaciones en alcance o vistas mensuales. Search Console exige que su período coincida exactamente.','small')];
 for(const channel of measurementChannels)if(!current.some(r=>r.channel===channel))blocks.push(text(`${channel==='web'?'Página web':channel==='networks'?'Redes':channel==='search'?'Buscadores':'IA'}: sin mediciones guardadas compatibles en este informe.`));
 for(const r of current){blocks.push(...auditRunBlocks(r).filter(b=>b.kind!=='brand'&&b.kind!=='title'));const before=previous.find(p=>key(p)===key(r));
  blocks.push(text('Comparación con el mes anterior','heading'));
  if(before){used.push(before);blocks.push(text(compareAuditRuns(before,r).text));}else blocks.push(text('No hay una observación compatible del mes anterior. Esta medición sirve como referencia inicial; no se calculó una evolución.'));
 }
 blocks.push(text('Próximo control','heading'),text('Repetir las mismas fuentes y condiciones, revisar las mejoras implementadas con su evidencia y mantener separados los resultados que no sean comparables.'));
 return wrap(c,'monthly',w.start,w.end,blocks,[...new Map(used.map(r=>[r.id,r])).values()]);
}
export function buildImplementation(c:DeliveryContext,work:ServiceWork){
 validateServiceWork(work);checked(c);const day=(c.now||new Date().toISOString()).slice(0,10);
 if(work.previousId){const old=c.history.find(r=>r.id===work.previousId&&r.savedAt&&r.data.kind==='service'&&r.data.service==='implementation');if(!old)throw new Error('No se encontró el registro anterior de este trabajo.');}
 const status={proposal:'Propuesta',approved:'Aprobación declarada',in_progress:'En curso',implemented:'Implementación declarada'}[work.status];
 const blocks=[text('Registro de trabajo adicional. No ejecuta cambios en la web ni cobra automáticamente.','small'),text(work.title,'heading'),text(`Estado: ${status}. El estado fue declarado por el operador, no medido automáticamente.`),text(`Alcance: ${work.scope}`),text(`Presupuesto propuesto: ${(work.amountCents/100).toFixed(2)} ${work.currency}. No acredita pago.`),text(`Fecha objetivo: ${work.dueOn||'Sin acordar'}.`),text(`Aprobación declarada: ${work.approval||'Pendiente; no comenzar trabajos sin acordar el alcance.'}`),text(`Registro y evidencia: ${work.note||'Sin observaciones'}`)];
 if(work.evidenceUrl)blocks.push(text(`Referencia aportada por el operador: ${work.evidenceUrl}`,'small'));
 if(work.previousId)blocks.push(text(`Actualiza el registro ${work.previousId}; el anterior se conserva.`,'small'));
 blocks.push(text('Cómo verificar','heading'),text('Después de implementar, ejecutar una nueva auditoría o adjuntar evidencia verificable y contrastarla con el hallazgo original. Marcar el trabajo como implementado no prueba una mejora de posicionamiento ni ventas.'));
 return wrap(c,'implementation',day,day,blocks,[],work);
}
