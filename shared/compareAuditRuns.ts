import {validateAuditRun,type AuditRun} from './auditRun';
import {publicProfileUrl} from './socialMetrics';
export function compareAuditRuns(a:AuditRun,b:AuditRun):{comparable:boolean;text:string}{
 try{validateAuditRun(a);validateAuditRun(b);}catch{return {comparable:false,text:'Hay una medición sin respaldo válido.'};}
 if(a.workspaceId!==b.workspaceId||a.businessId!==b.businessId||a.clientId!==b.clientId||a.channel!==b.channel||a.observedAt.slice(0,10)===b.observedAt.slice(0,10))return {comparable:false,text:'Elegí dos auditorías del mismo cliente, negocio y canal, observadas en días distintos.'};
 const [first,last]=[a,b].sort((x,y)=>x.observedAt.localeCompare(y.observedAt));const x=first.data,y=last.data;
 const dates=`${first.observedAt} → ${last.observedAt}. `;
 if(x.kind==='web'&&y.kind==='web'){
  const basis=(r:typeof x)=>r.result.items.map(i=>i.key).sort().join('|');
  if(x.result.requestedUrl!==y.result.requestedUrl||basis(x)!==basis(y))return {comparable:false,text:'Cambió la URL o el conjunto de factores evaluados; no hay una base homogénea.'};
  const count=(r:typeof x)=>r.result.items.filter(i=>i.status==='error').length;
  return {comparable:true,text:dates+`Factores con error: ${count(x)} → ${count(y)}. Es una comparación de hallazgos; no verifica tareas resueltas ni efectos en posiciones o ventas.`};
 }
 if(x.kind==='networks'&&y.kind==='networks'&&x.network===y.network&&publicProfileUrl(x.network,x.snapshot.profileUrl)===publicProfileUrl(y.network,y.snapshot.profileUrl)&&x.snapshot.followers!==undefined&&y.snapshot.followers!==undefined)return {comparable:true,text:dates+`Recuento observado: ${x.snapshot.followers} → ${y.snapshot.followers}. Variación del recuento reportado: ${y.snapshot.followers-x.snapshot.followers}. ${x.network==='youtube'?'YouTube redondea estos valores. ':''}No equivale a alcance, vistas ni ventas.`};
 if(x.kind==='search'&&y.kind==='search'){
  const duration=(r:AuditRun)=>Date.parse(r.periodEnd)-Date.parse(r.periodStart);const queries=(r:typeof x)=>r.result.rows.map(r=>r.query).sort().join('|');
  if(x.siteUrl!==y.siteUrl||duration(first)!==duration(last)||first.periodEnd>=last.periodStart||queries(x)!==queries(y))return {comparable:false,text:'Search Console requiere misma propiedad, igual duración, períodos sin solapamiento y las mismas consultas recuperadas para esta comparación.'};
  const clicks=(r:typeof x)=>r.result.rows.reduce((sum,r)=>sum+r.clicks,0);return {comparable:true,text:dates+`Clics de las consultas recuperadas: ${clicks(x)} → ${clicks(y)}. La muestra no equivale al tráfico total ni acredita ventas.`};
 }
 return {comparable:false,text:'Estas fuentes no tienen métricas homogéneas para calcular una evolución. Podés abrir ambos informes o combinarlos conservando cada evidencia.'};
}
