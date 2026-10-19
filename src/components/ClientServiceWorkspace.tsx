import React,{useState} from 'react';
import type {Business} from '../types';
import {amountToCents,type ClientAccount} from '../../shared/clientLedger';
import {type AuditRun,type ServiceWork} from '../../shared/auditRun';
import {buildImprovementPlan,buildMonthlyFollowup,buildImplementation,serviceNames} from '../../shared/serviceDeliveries';
import {AuditRunReport} from './AuditRunReport';
interface Props {workspaceId:string;business:Business;client:ClientAccount;history:AuditRun[];historyLoading:boolean;historyError:string;onSaved:(r:AuditRun)=>void;onClientUpdated:(c:ClientAccount)=>void;onOpenAudit:()=>void;}
const emptyWork=(currency:string):ServiceWork=>({title:'',scope:'',status:'proposal',amountCents:0,currency,approval:'',note:''});
export function ClientServiceWorkspace(props:Props){return <ServiceForm key={`${props.workspaceId}:${props.client.id}:${props.business.id}`} {...props}/>;}
function ServiceForm({workspaceId,business,client,history,historyLoading,historyError,onSaved,onClientUpdated,onOpenAudit}:Props){
 const [kind,setKind]=useState<keyof typeof serviceNames|null>(null),[questions,setQuestions]=useState(''),[month,setMonth]=useState(new Date().toISOString().slice(0,7)),[work,setWork]=useState<ServiceWork>(emptyWork(client.currency)),[amount,setAmount]=useState('0'),[draft,setDraft]=useState<AuditRun|null>(null),[error,setError]=useState('');
 const change=(values:Partial<ServiceWork>)=>{setWork(w=>({...w,...values}));setDraft(null);setError('');};
 const previous=history.filter(r=>r.savedAt&&r.data.kind==='service'&&r.data.service==='implementation');
 function prepare(){try{if(historyLoading||historyError)throw new Error('Esperá a que el historial se cargue correctamente antes de preparar el documento.');const c={workspaceId,business,client,history};setError('');setDraft(kind==='plan'?buildImprovementPlan(c,questions):kind==='monthly'?buildMonthlyFollowup(c,month):buildImplementation(c,{...work,amountCents:amountToCents(amount)}));}catch(e){setDraft(null);setError(e instanceof Error?e.message:'No se pudo preparar el documento.');}}
 return <section className="space-y-5" aria-label="Servicios del cliente">
 <div className="no-print vai-panel rounded-2xl p-5 sm:p-7 space-y-4"><header><h2 className="text-2xl font-heading font-bold">Servicios de {business.name}</h2><p className="text-sm text-slate-500 mt-2">Prepará el entregable, revisalo y después elegí si lo guardás, imprimís o preparás para WhatsApp. Los documentos guardados aparecen en Historial.</p></header>
 <div className="flex flex-wrap gap-3"><button className="vai-button vai-button-secondary" onClick={onOpenAudit}>1. Diagnóstico inicial</button>{Object.entries(serviceNames).map(([id,label],i)=><button key={id} aria-pressed={kind===id} className={`vai-button ${kind===id?'vai-button-primary':'vai-button-secondary'}`} onClick={()=>{setKind(id as keyof typeof serviceNames);setDraft(null);setError('');}}>{i+2}. {label}</button>)}</div>
 <p className="text-xs text-slate-500">El diagnóstico se prepara en Web, Redes, Buscadores e IA. Podés reunir las mediciones guardadas desde Historial → Preparar informe combinado. Solo se incluyen canales con evidencia disponible.</p>
 {kind==='plan'&&<label className="block text-sm font-semibold">Preguntas reales de clientes, una por línea (opcional)<textarea className="vai-input block w-full mt-2" rows={4} maxLength={3010} value={questions} onChange={e=>{setQuestions(e.target.value);setDraft(null);}}/><span className="block text-xs font-normal text-slate-500 mt-2">Hasta diez preguntas. Se generan prioridades de los hallazgos guardados y esquemas de contenido para estas preguntas; la redacción y los datos comerciales requieren revisión.</span></label>}
 {kind==='monthly'&&<label className="block text-sm font-semibold">Mes a revisar<input className="vai-input block mt-2" type="month" max={new Date().toISOString().slice(0,7)} value={month} onChange={e=>{setMonth(e.target.value);setDraft(null);}}/><span className="block text-xs font-normal text-slate-500 mt-2">Usa observaciones guardadas de ese mes y compara con el anterior cuando las fuentes son compatibles. No ejecuta consultas nuevas ni reconstruye meses sin datos.</span></label>}
 {kind==='implementation'&&<div className="grid sm:grid-cols-2 gap-4 text-sm">
 <label className="sm:col-span-2">Trabajo anterior (opcional)<select className="vai-input block w-full mt-2" value={work.previousId||''} onChange={e=>{const r=previous.find(r=>r.id===e.target.value);if(r?.data.kind==='service'&&r.data.work){setWork({...r.data.work,previousId:r.id});setAmount((r.data.work.amountCents/100).toFixed(2));}else{setWork(emptyWork(client.currency));setAmount('0');}setDraft(null);setError('');}}><option value="">Nuevo trabajo</option>{previous.map(r=><option key={r.id} value={r.id}>{r.data.kind==='service'?r.data.work?.title:''} · {r.observedAt.slice(0,10)}</option>)}</select></label>
 <label>Título<input className="vai-input block w-full mt-2" maxLength={200} value={work.title} onChange={e=>change({title:e.target.value})}/></label>
 <label>Estado declarado<select className="vai-input block w-full mt-2" value={work.status} onChange={e=>change({status:e.target.value as ServiceWork['status']})}><option value="proposal">Propuesta</option><option value="approved">Aprobación declarada</option><option value="in_progress">En curso</option><option value="implemented">Implementación declarada</option></select></label>
 <label className="sm:col-span-2">Alcance acordado o propuesto<textarea className="vai-input block w-full mt-2" rows={3} maxLength={5000} value={work.scope} onChange={e=>change({scope:e.target.value})}/></label>
 <label>Presupuesto, sin separador de miles<input className="vai-input block w-full mt-2" inputMode="decimal" value={amount} onChange={e=>{setAmount(e.target.value);setDraft(null);}}/></label>
 <label>Moneda<select className="vai-input block w-full mt-2" value={work.currency} onChange={e=>change({currency:e.target.value})}>{['ARS','USD','EUR','UYU','BRL','CLP','COP','MXN','GBP','CAD','AUD','PEN'].map(c=><option key={c}>{c}</option>)}</select></label>
 <label>Fecha objetivo (opcional)<input className="vai-input block w-full mt-2" type="date" value={work.dueOn||''} onChange={e=>change({dueOn:e.target.value||undefined})}/></label>
 <label>Aprobación: quién, cuándo y por qué canal<input className="vai-input block w-full mt-2" maxLength={2000} value={work.approval} onChange={e=>change({approval:e.target.value})}/></label>
 <label className="sm:col-span-2">Avance y evidencia<textarea className="vai-input block w-full mt-2" rows={3} maxLength={5000} value={work.note} onChange={e=>change({note:e.target.value})}/></label>
 <label className="sm:col-span-2">Enlace de evidencia (opcional)<input className="vai-input block w-full mt-2" type="url" maxLength={2000} value={work.evidenceUrl||''} onChange={e=>change({evidenceUrl:e.target.value||undefined})}/></label>
 <p className="sm:col-span-2 text-xs text-slate-500">Registra alcance, presupuesto y declaraciones del operador. No cobra ni modifica la web del cliente. Una nueva auditoría permite comprobar el resultado. Al guardar un avance se conserva el registro anterior.</p>
 </div>}
 {historyError&&<p role="alert" className="text-red-800">El historial no se pudo cargar. Actualizá la página antes de preparar un servicio.</p>}
 {kind&&<button className="vai-button vai-button-primary" disabled={historyLoading||!!historyError} onClick={prepare}>{historyLoading?'Cargando fuentes…':'Preparar para revisar'}</button>}
 {error&&<p role="alert" className="text-red-800">{error}</p>}
 </div>
 {draft&&<AuditRunReport key={draft.id} run={draft} business={business} client={client} onSaved={r=>{setDraft(r);onSaved(r);}} onClientUpdated={onClientUpdated}/>}
 </section>;
}
