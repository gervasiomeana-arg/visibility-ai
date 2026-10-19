import React,{useEffect,useRef,useState} from 'react';
import type {Business} from '../types';
import {auditRunBlocks,validateAuditRun,auditChannelNames,type AuditRun} from '../../shared/auditRun';
import {auditRunService} from '../services/auditRunService';
import {prepareReportPdf} from '../services/reportPdfService';
import {saveGeneratedClientReport,reportContentFingerprint} from '../../shared/generatedClientReport';
import {reportPdfName} from '../../shared/reportPdfName';
import {clientService} from '../services/clientService';
import {markClientReportSent,type ClientAccount,type ClientReport} from '../../shared/clientLedger';
import {PresenceEvidence} from './PresenceEvidence';
interface Props{run:AuditRun;business:Business;client:ClientAccount;onSaved:(run:AuditRun)=>void;onClientUpdated:(client:ClientAccount)=>void;}
export function AuditRunReport({run,business,client,onSaved,onClientUpdated}:Props){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[delivery,setDelivery]=useState(false),[savedReport,setSavedReport]=useState<ClientReport|null>(null),[downloaded,setDownloaded]=useState(false);
 const live=useRef(true),lock=useRef(false);useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 const blocks=auditRunBlocks(run);
 async function operate(action:()=>Promise<void>){if(lock.current)return;lock.current=true;setBusy(true);setError('');setMessage('');try{await action();}catch(e){if(live.current)setError(e instanceof Error?e.message:'No se confirmó la operación.');}finally{lock.current=false;if(live.current)setBusy(false);}}
 async function prepare(){validateAuditRun(run);const blob=await prepareReportPdf(blocks);const file=new File([blob],reportPdfName(`${business.name}-${auditChannelNames[run.channel]}`,run.observedAt.slice(0,10)),{type:'application/pdf'});return {file,contentSha256:await reportContentFingerprint(blocks)};}
 async function download(){const {file}=await prepare();if(!live.current)return;const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);setDownloaded(true);setMessage('PDF preparado. Revisá las descargas de tu navegador para confirmar que recibiste el archivo. No se registró un envío.');}
 const phone=client.whatsapp.replace(/\D/g,'').replace(/^00/,'');const whatsapp=/^\s*(?:\+|00)/.test(client.whatsapp)&&phone.length>=8&&phone.length<=15?`https://wa.me/${phone}?text=${encodeURIComponent(`Hola, ${client.name}. Te comparto el informe de Visibility sobre ${business.name}. El PDF se adjunta por separado.`)}`:'';
 return <section className="space-y-5">
 <div className="no-print vai-panel rounded-2xl p-5 flex flex-wrap items-center gap-3"><p className="text-sm w-full font-semibold">Revisá el informe. Después elegí si lo guardás o preparás la entrega.</p>
 <button disabled={busy||!!run.savedAt} className="vai-button vai-button-primary" onClick={()=>void operate(async()=>{const saved=await auditRunService.save(run);if(live.current){onSaved(saved);setMessage('Documento guardado en el historial de este cliente.');}})}>{run.savedAt?'Guardado en historial':'Guardar en historial'}</button>
 <button disabled={busy} className="vai-button vai-button-secondary" onClick={()=>void operate(download)}>Descargar PDF</button><button disabled={busy} className="vai-button vai-button-secondary" onClick={()=>window.print()}>Imprimir</button><button disabled={busy} className="vai-button vai-button-secondary" onClick={()=>setDelivery(!delivery)}>Preparar envío</button>
 {error&&<p role="alert" className="w-full text-red-800">{error}</p>}{message&&<p role="status" className="w-full text-emerald-800">{message}</p>}
 {delivery&&<div className="w-full border-t pt-4 space-y-3 text-sm"><p>Descargá el PDF, abrí WhatsApp y adjuntalo. Abrir WhatsApp no envía el archivo ni confirma recepción.</p><button disabled={busy} className="vai-button vai-button-secondary" onClick={()=>void operate(download)}>{downloaded?'Volver a descargar PDF':'1. Descargar PDF'}</button>{whatsapp?<a className="vai-button vai-button-secondary ml-2" href={whatsapp} target="_blank" rel="noopener noreferrer">2. Abrir WhatsApp del cliente</a>:<p>Completá WhatsApp con código de país en la ficha para preparar ese canal.</p>}
 <button disabled={busy||!!savedReport} className="vai-button vai-button-secondary block" onClick={()=>void operate(async()=>{const updated=await saveGeneratedClientReport({workspaceId:run.workspaceId,clientId:client.id,business,title:`${auditChannelNames[run.channel]} · ${run.observedAt.slice(0,10)}`,period:`${run.periodStart} a ${run.periodEnd}`},prepare,()=>live.current,clientService);if(live.current){onClientUpdated(updated);setSavedReport(updated.reports.at(-1)!);setMessage('Copia privada guardada en la ficha. El envío sigue pendiente.');}})}>Guardar copia PDF en la ficha</button>
 {savedReport&&!savedReport.sentAt&&<button disabled={busy} className="vai-button vai-button-primary" onClick={()=>void operate(async()=>{const fresh=(await clientService.list(run.workspaceId)).find(c=>c.id===client.id&&c.businessIds.includes(run.businessId));if(!fresh)throw new Error('No se confirmó la ficha actual del cliente.');const now=new Date().toISOString();const updated=await clientService.save(markClientReportSent(fresh,savedReport.id,now,'WhatsApp',now));if(live.current){onClientUpdated(updated);setSavedReport(updated.reports.find(r=>r.id===savedReport.id)!);setMessage('Envío registrado por declaración del operador. No acredita recepción ni lectura.');}})}>Ya envié el PDF: registrar fecha y hora</button>}
 </div>}
 </div>
 <article className="vai-report-document vai-panel rounded-2xl p-6 sm:p-8 space-y-4" aria-label="Informe de auditoría">{blocks.map((b,i)=>b.kind==='title'?<h1 key={i} className="text-3xl font-heading font-bold">{b.text}</h1>:b.kind==='heading'?<h2 key={i} className="text-xl font-semibold pt-3">{b.text}</h2>:<p key={i} className={`${b.kind==='small'?'text-xs text-slate-500':'text-sm text-slate-700'} whitespace-pre-wrap break-words`}>{b.text}</p>)}
 {run.data.kind==='presence'&&run.data.observation.suggestionsHtml&&<div className="no-print"><details><summary className="cursor-pointer">Fuentes y referencias de la respuesta</summary><PresenceEvidence rows={[run.data.observation]}/></details></div>}
 </article></section>;
}
