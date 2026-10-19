import React, { useEffect, useRef, useState } from 'react';
import { Plus, Download, Users } from 'lucide-react';
import type { Business, Workspace } from '../types';
import { clientService } from '../services/clientService';
import { addClientPayment, amountToCents, clientDateTime, correctClientReportDelivery, invoiceBalance, invoiceForMonth, markClientReportSent, paypalLink, paypalPaymentRequest, validateClient, type ClientAccount, type ClientReport } from '../../shared/clientLedger';
import { ClientReportDelivery } from './ClientReportDelivery';

const currencies = ['ARS','USD','EUR','UYU','BRL','CLP','COP','MXN','GBP','CAD','AUD','PEN'];
const localTime = () => new Date(Date.now() - new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
const message = (error: unknown) => error instanceof Error ? error.message : 'No se pudo completar la operación.';
export function ClientsView({ workspace, businesses, selectedClientId, onSelectClient, onClientsChange, onCreateBusiness, onOpenAudit, onInteractionLockChange }: { workspace: Workspace | null; businesses: Business[]; selectedClientId?:string; onSelectClient?:(id:string)=>void; onClientsChange?:(clients:ClientAccount[])=>void; onCreateBusiness?:(client:ClientAccount,changedFields?:string[])=>Promise<string>; onOpenAudit?:()=>void; onInteractionLockChange?:(locked:boolean)=>void }) {
  const [clients,setClients] = useState<ClientAccount[]>([]);
  const [selected,setSelected] = useState('');
  const [draft,setDraft] = useState<ClientAccount | null>(null);
  const [fee,setFee] = useState('0');
  const [filter,setFilter] = useState('');
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [reportFeedback,setReportFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [period,setPeriod] = useState(localTime().slice(0,7));
  const [invoiceId,setInvoiceId] = useState('');
  const [paymentAmount,setPaymentAmount] = useState('');
  const [paidAt,setPaidAt] = useState(localTime());
  const [method,setMethod] = useState('');
  const [reportBusiness,setReportBusiness] = useState('');
  const [reportTitle,setReportTitle] = useState('');
  const [reportPeriod,setReportPeriod] = useState('');
  const [file,setFile] = useState<File | null>(null);
  const [fileKey,setFileKey] = useState(0);
  const [sentReportId,setSentReportId] = useState('');
  const [sentAt,setSentAt] = useState(localTime());
  const [channel,setChannel] = useState<'WhatsApp'|'Correo'|'Otro'>('WhatsApp');
  const initialBrief=useRef<ClientAccount['brief']>(undefined);
  const alive = useRef(true);
  const operationPending = useRef(false);
  const client = clients.find(item => item.id === selected);
  const ownBusinesses = businesses.filter(item => item.workspaceId === workspace?.id);
  const owner = workspace?.role === 'owner';
  const timeZone = workspace?.timezone || 'America/Argentina/Buenos_Aires';
  const today = new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const money = (cents: number, currency: string) => new Intl.NumberFormat('es-AR',{ style:'currency',currency }).format(cents/100);
  const dateTime = (value: string) => clientDateTime(value,timeZone);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; },[]);
  useEffect(() => {
    onInteractionLockChange?.(busy || loading);
    return () => onInteractionLockChange?.(false);
  },[busy,loading,onInteractionLockChange]);
  async function reload() {
    if (!workspace?.id || !owner) { setLoading(false); return; }
    setLoading(true); setError(''); setReportFeedback(null);
    try { const rows = await clientService.list(workspace.id); if (alive.current) {setClients(rows);onClientsChange?.(rows);} }
    catch (failure) { if (alive.current) setError(message(failure)); }
    finally { if (alive.current) setLoading(false); }
  }
  useEffect(() => { void reload(); },[workspace?.id,owner]);
  const choose = (item: ClientAccount) => { const associated = ownBusinesses.filter(business=>item.businessIds.includes(business.id)); setSelected(item.id); onSelectClient?.(item.id); setDraft(null); setInvoiceId(''); setPaymentAmount(''); setMethod(''); setReportBusiness(associated.length === 1 ? associated[0].id : ''); setReportTitle(''); setReportPeriod(''); setFile(null); setFileKey(key=>key+1); setSentReportId(''); setNotice(''); setError(''); setReportFeedback(null); };
  useEffect(()=>{if(selectedClientId===undefined||selectedClientId===selected)return;if(!selectedClientId){setSelected('');setDraft(null);return;}const item=clients.find(c=>c.id===selectedClientId);if(item)choose(item);},[selectedClientId,clients]);
  async function operation(action: () => Promise<ClientAccount>, success: string, target?: 'reports') {
    if (operationPending.current || loading || !owner) return;
    operationPending.current = true;
    setBusy(true); setError(''); setNotice('');
    if (target === 'reports') setReportFeedback(null);
    try {
      const saved = await action();
      if (!alive.current) return;
      setClients(rows => [saved,...rows.filter(row => row.id !== saved.id)]);
      onClientsChange?.([saved,...clients.filter(row=>row.id!==saved.id)]);onSelectClient?.(saved.id);
      setSelected(saved.id); setDraft(null); setPaymentAmount(''); setMethod(''); setInvoiceId(''); setSentReportId('');
      if (target === 'reports') setReportFeedback({ kind: 'success', text: success }); else setNotice(success);
    } catch (failure) { if (alive.current) { if (target === 'reports') setReportFeedback({ kind: 'error', text: message(failure) }); else setError(message(failure)); } }
    finally { operationPending.current = false; if (alive.current) setBusy(false); }
  }
  function newClient() {
    if (!workspace) return;
    initialBrief.current=undefined;setSelected(''); onSelectClient?.(''); setFee('0'); setError(''); setNotice(''); setReportFeedback(null);setInvoiceId('');setPaymentAmount('');setMethod('');setReportBusiness('');setReportTitle('');setReportPeriod('');setFile(null);setFileKey(k=>k+1);setSentReportId('');
    setDraft({id:crypto.randomUUID(),workspaceId:workspace.id,name:'',kind:'Empresa',country:workspace.countryCode || 'AR',email:'',whatsapp:'',businessIds:[],monthlyFeeCents:0,currency:workspace.currency || 'USD',dueDay:10,invoices:[],payments:[],reports:[]});
  }
  if (!workspace || !owner) return <section className="vai-panel rounded-2xl p-8"><h1 className="text-2xl font-bold">Clientes</h1><p className="mt-3">La gestión interna de clientes está disponible solo para el propietario del espacio de trabajo.</p></section>;
  return <section className="space-y-6 pb-20">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="vai-overline">Gestión interna</p><h1 className="text-3xl font-bold font-heading flex gap-2 items-center"><Users size={26}/>Clientes</h1><p className="text-sm text-slate-600 mt-2">Abonos, pagos e informes. Tus clientes no necesitan ingresar a Visibility.</p></div>
      <div className="flex gap-2"><button className="vai-button vai-button-secondary" disabled={busy || loading} onClick={() => void reload()}>Recargar</button><button className="vai-button vai-button-primary" disabled={busy || loading} onClick={newClient}><Plus size={16}/>Nuevo cliente</button></div>
    </div>
    {error && <p role="alert" className="rounded-xl bg-red-50 text-red-800 p-4 text-sm">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-emerald-50 text-emerald-800 p-4 text-sm">{notice}</p>}
    <div className="grid lg:grid-cols-[260px_1fr] gap-5">
      <aside className="vai-panel rounded-2xl p-4 self-start space-y-3"><label className="text-sm block">Buscar cliente<input className="vai-input w-full mt-1" value={filter} onChange={event=>setFilter(event.target.value)}/></label>
        {loading ? <p role="status">Cargando clientes…</p> : !clients.length ? <p className="text-sm text-slate-500">Todavía no hay clientes cargados.</p> : clients.filter(item=>`${item.name} ${item.country}`.toLowerCase().includes(filter.toLowerCase())).map(item=><button key={item.id} disabled={busy} onClick={()=>choose(item)} className={`w-full text-left rounded-xl p-3 border ${item.id===selected?'border-emerald-700 bg-emerald-50':'border-slate-200'}`}><strong className="block">{item.name}</strong><small>{item.kind} · {item.country}</small><small className="block">{money(item.monthlyFeeCents,item.currency)} / mes</small></button>)}
      </aside>
      <fieldset disabled={busy || loading} className="space-y-5 min-w-0">
        {draft ? <form className="vai-panel rounded-2xl p-6 space-y-4" onSubmit={event=>{event.preventDefault(); void operation(async()=>{let next={...draft,monthlyFeeCents:amountToCents(fee),paypalPaymentUrl:paypalLink(draft.paypalPaymentUrl)};validateClient(next,workspace.id,ownBusinesses.map(item=>item.id));if(next.businessIds.length<=1&&onCreateBusiness){const changed=['siteName','website','city','siteCountry'].filter(key=>(next.brief as any)?.[key] !== (initialBrief.current as any)?.[key]);const businessId=await onCreateBusiness(next,changed);next={...next,businessIds:[businessId]};if(alive.current)setDraft(next);}return clientService.save(next);},'Ficha guardada en Supabase.');}}>
          <h2 className="text-xl font-bold">{draft.updatedAt?'Editar ficha':'Nuevo cliente'}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <label>Nombre<input required maxLength={160} className="vai-input w-full" value={draft.name} onChange={event=>setDraft({...draft,name:event.target.value})}/></label>
            <label>Tipo<select className="vai-input w-full" value={draft.kind} onChange={event=>setDraft({...draft,kind:event.target.value as ClientAccount['kind']})}>{['Empresa','Agencia','Persona'].map(value=><option key={value}>{value}</option>)}</select></label>
            <label>País<input required maxLength={100} className="vai-input w-full" value={draft.country} onChange={event=>setDraft({...draft,country:event.target.value})}/></label>
            <label>Correo<input type="email" maxLength={200} className="vai-input w-full" value={draft.email} onChange={event=>setDraft({...draft,email:event.target.value})}/></label>
            <label>WhatsApp con código de país<input maxLength={40} className="vai-input w-full" placeholder="+54…" value={draft.whatsapp} onChange={event=>setDraft({...draft,whatsapp:event.target.value})}/></label>
            <label>Enlace de pago PayPal · opcional<input type="url" maxLength={1000} className="vai-input w-full" placeholder="Pegá el enlace creado en PayPal" value={draft.paypalPaymentUrl || ''} onChange={event=>setDraft({...draft,paypalPaymentUrl:event.target.value})}/></label>
            <label>Abono mensual · sin separador de miles<input required inputMode="decimal" className="vai-input w-full" value={fee} onChange={event=>setFee(event.target.value)}/></label>
            <label>Moneda<select className="vai-input w-full" value={draft.currency} onChange={event=>setDraft({...draft,currency:event.target.value})}>{currencies.map(value=><option key={value}>{value}</option>)}</select></label>
            <label>Día de vencimiento<input type="number" min={1} max={31} required className="vai-input w-full" value={draft.dueDay} onChange={event=>setDraft({...draft,dueDay:Number(event.target.value)})}/></label>
          </div>
          <fieldset className="border-t pt-4"><legend className="font-semibold mb-2">Ficha del servicio</legend><div className="grid sm:grid-cols-2 gap-4">{([
            ['contactName','Persona de contacto'],['username','Identificador interno / usuario (sin contraseña)'],['siteName','Nombre de la página / negocio'],['website','Página web · opcional'],['city','Ciudad del negocio'],['siteCountry','País del negocio · si está confirmado'],['planName','Plan contratado'],['frequency','Frecuencia de entrega (ej.: mensual)'],
          ] as const).map(([key,label])=><label key={key}>{label}<input type={key==='website'?'url':'text'} maxLength={key==='website'?2000:200} className="vai-input w-full" value={draft.brief?.[key]||''} onChange={e=>setDraft({...draft,brief:{...draft.brief,[key]:e.target.value}})}/></label>)}</div>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">{(['instagram','facebook','tiktok','youtube'] as const).map(network=><label key={network}>Perfil de {network}<input type="url" maxLength={2000} className="vai-input w-full" value={draft.brief?.profiles?.[network]||''} onChange={e=>setDraft({...draft,brief:{...draft.brief,profiles:{...draft.brief?.profiles,[network]:e.target.value}}})}/></label>)}</div>
          <div className="space-y-4 mt-4">{([['needs','Necesidades y objetivos'],['requiredInformation','Qué información requiere el cliente'],['notes','Observaciones internas']] as const).map(([key,label])=><label key={key} className="block">{label}<textarea rows={3} maxLength={4000} className="vai-input w-full" value={draft.brief?.[key]||''} onChange={e=>setDraft({...draft,brief:{...draft.brief,[key]:e.target.value}})}/></label>)}</div></fieldset>
          <fieldset><legend className="font-semibold mb-2">Negocios de este cliente</legend><div className="flex flex-wrap gap-4">{ownBusinesses.map(item=><label key={item.id} className="flex gap-2 items-center"><input type="checkbox" checked={draft.businessIds.includes(item.id)} onChange={event=>setDraft({...draft,businessIds:event.target.checked?[...draft.businessIds,item.id]:draft.businessIds.filter(id=>id!==item.id)})}/>{item.name}</label>)}</div></fieldset>
          <p className="text-xs text-slate-500">Cambiar la tarifa no modifica los abonos ya registrados. No se cobra automáticamente.</p>
          <div className="flex gap-3"><button disabled={busy} className="vai-button vai-button-primary">{busy?'Guardando…':'Guardar ficha'}</button><button type="button" disabled={busy} className="vai-button vai-button-secondary" onClick={()=>setDraft(null)}>Cancelar</button></div>
        </form> : client ? <>
          <div className="vai-panel rounded-2xl p-6 flex flex-wrap justify-between gap-3"><div><h2 className="text-2xl font-bold">{client.name}</h2><p>{client.kind} · {client.country}</p><p className="text-sm text-slate-600 break-all">{client.email || 'Sin correo'} · {client.whatsapp || 'Sin WhatsApp'}</p><p className="mt-2 font-semibold">{money(client.monthlyFeeCents,client.currency)} / mes · vence el día {client.dueDay}</p><p className="text-xs mt-2">Negocios: {ownBusinesses.filter(item=>client.businessIds.includes(item.id)).map(item=>item.name).join(', ') || 'Sin negocios asociados'}</p></div><button disabled={busy} className="vai-button vai-button-secondary self-start" onClick={()=>{const linked=ownBusinesses.find(b=>client.businessIds.length===1&&client.businessIds[0]===b.id);const edit={...client,brief:{siteName:linked?.name,website:linked?.url,city:linked?.city,siteCountry:linked?.country,...client.brief}};initialBrief.current=edit.brief;setDraft(edit);setFee((client.monthlyFeeCents/100).toFixed(2));}}>Editar ficha</button></div>
          <div className="vai-panel rounded-2xl p-6 space-y-3"><h3 className="font-bold">Servicio y necesidades</h3><p>{client.brief?.planName||'Plan sin especificar'} · {client.brief?.frequency||'Frecuencia pendiente'}</p><p className="whitespace-pre-wrap">{client.brief?.needs||'Necesidades pendientes de completar.'}</p><p className="whitespace-pre-wrap">Información requerida: {client.brief?.requiredInformation||'Pendiente de completar.'}</p>{onOpenAudit&&<button className="vai-button vai-button-primary" onClick={onOpenAudit}>Ir a la auditoría de página web</button>}</div>
          <details className="vai-panel rounded-2xl p-6 space-y-4"><summary className="text-lg font-bold cursor-pointer">Abonos mensuales</summary>
            <form className="flex flex-wrap gap-3 items-end" onSubmit={event=>{event.preventDefault();void operation(async()=>{const invoice=invoiceForMonth(client,period,crypto.randomUUID(),new Date().toISOString());return clientService.save({...client,invoices:[...client.invoices,invoice]});},'Abono mensual registrado. No se realizó ningún cobro.');}}><label>Mes<input required type="month" className="vai-input block" value={period} onChange={event=>setPeriod(event.target.value)}/></label><button disabled={busy} className="vai-button vai-button-primary">Registrar abono del mes</button></form>
            <p className="text-xs text-slate-500">Registro interno de cobro pendiente; no es una factura fiscal. Un registro por mes.</p>
            <div className="rounded-xl bg-slate-50 p-4 space-y-2"><h4 className="font-semibold">Solicitudes de pago por PayPal</h4><p className="text-xs text-slate-600">{client.paypalPaymentUrl?'Copiá la solicitud y pegala en WhatsApp. El enlace no ajusta automáticamente el importe ni la moneda; comprobá su configuración en PayPal.':'Agregá tu enlace de pago en Editar ficha. Podés usar el mismo enlace en varias fichas si corresponde a tu servicio.'}</p>
              {client.paypalPaymentUrl && client.invoices.filter(invoice=>invoiceBalance(client,invoice,today).remainingCents>0).map(invoice=><button type="button" key={invoice.id} className="vai-button vai-button-secondary mr-2" onClick={async()=>{setError('');setNotice('');try{await navigator.clipboard.writeText(paypalPaymentRequest(client,invoice.id,today));if(alive.current)setNotice('Solicitud copiada. Pegala en WhatsApp para enviarla; todavía no se registró ningún pago.');}catch(failure){if(alive.current)setError(`No se pudo copiar la solicitud: ${message(failure)}`);}}}>Copiar solicitud · {invoice.period}</button>)}
              <p className="text-xs text-slate-500">No es una suscripción automática. Confirmá el ingreso en PayPal y registralo como pago manual.</p>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr><th className="p-2">Mes / vencimiento</th><th className="p-2">Importe</th><th className="p-2">Saldo</th><th className="p-2">Estado</th></tr></thead><tbody>{[...client.invoices].sort((a,b)=>b.period.localeCompare(a.period)).map(invoice=>{const balance=invoiceBalance(client,invoice,today);return <tr key={invoice.id} className="border-t border-slate-200"><td className="p-2">{invoice.period}<small className="block">{invoice.dueOn}</small></td><td className="p-2">{money(invoice.amountCents,invoice.currency)}</td><td className="p-2">{money(balance.remainingCents,invoice.currency)}</td><td className="p-2">{balance.status}</td></tr>;})}</tbody></table></div>
            {!client.invoices.length && <p className="text-sm text-slate-500">Registrá el primer mes para controlar su pago.</p>}
          </details>
          <details className="vai-panel rounded-2xl p-6 space-y-4"><summary className="text-lg font-bold cursor-pointer">Registrar pago manual</summary>
            <form className="grid sm:grid-cols-2 gap-4" onSubmit={event=>{event.preventDefault();void operation(async()=>{const next=addClientPayment(client,{id:crypto.randomUUID(),invoiceId,amountCents:amountToCents(paymentAmount),paidAt:new Date(paidAt).toISOString(),method,recordedAt:new Date().toISOString()},today);return clientService.save(next);},'Pago registrado manualmente en Supabase.');}}>
              <label>Abono<select required className="vai-input w-full" value={invoiceId} onChange={event=>setInvoiceId(event.target.value)}><option value="">Elegí el mes</option>{client.invoices.filter(invoice=>invoiceBalance(client,invoice,today).remainingCents>0).map(invoice=><option key={invoice.id} value={invoice.id}>{invoice.period} · saldo {money(invoiceBalance(client,invoice,today).remainingCents,invoice.currency)}</option>)}</select></label>
              <label>Importe en la moneda del abono<input required inputMode="decimal" className="vai-input w-full" value={paymentAmount} onChange={event=>setPaymentAmount(event.target.value)}/></label>
              <label>Fecha y hora del pago · hora de tu navegador<input required type="datetime-local" className="vai-input w-full" value={paidAt} onChange={event=>setPaidAt(event.target.value)}/></label>
              <label>Medio de pago<input required maxLength={120} className="vai-input w-full" placeholder="Transferencia, efectivo…" value={method} onChange={event=>setMethod(event.target.value)}/></label>
              <button disabled={busy || !client.invoices.length} className="vai-button vai-button-primary justify-self-start">Guardar pago manual</button>
            </form>
            <p className="text-xs text-slate-500">Visibility no verifica movimientos bancarios. Horas del historial: {timeZone}.</p>
            {[...client.payments].reverse().map(payment=>{const invoice=client.invoices.find(item=>item.id===payment.invoiceId);return <p key={payment.id} className="text-sm border-t pt-3">{invoice?.period} · {money(payment.amountCents,invoice?.currency || client.currency)} · {payment.method}<small className="block">Pago: {dateTime(payment.paidAt)} · Registrado: {dateTime(payment.recordedAt)}</small></p>;})}
          </details>
          <details className="vai-panel rounded-2xl p-6 space-y-4"><summary className="text-lg font-bold cursor-pointer">Informes anteriores y envíos</summary>
            <p className="text-sm text-slate-600">Exportá el informe desde Visibility y cargalo aquí. Se guarda privado; luego descargalo y envialo por WhatsApp.</p>
            <p className="text-xs text-slate-500">Completá negocio, título y período, seleccioná el PDF y pulsá Guardar PDF. Esperá la confirmación debajo del formulario antes de recargar.</p>
            <form className="grid sm:grid-cols-2 gap-4" onInvalidCapture={()=>setReportFeedback({kind:'error',text:'Falta completar un campo obligatorio. Revisá negocio, título, período y archivo PDF; todavía no se guardó el informe.'})} onSubmit={event=>{event.preventDefault();void operation(async()=>{const business=ownBusinesses.find(item=>item.id===reportBusiness && client.businessIds.includes(item.id));if(!business || !file || !reportTitle.trim() || !reportPeriod.trim())throw new Error('Elegí un negocio asociado, título, período y PDF.');const report:ClientReport={id:crypto.randomUUID(),businessId:business.id,businessName:business.name,title:reportTitle.trim(),period:reportPeriod.trim(),fileName:file.name,filePath:'',createdAt:new Date().toISOString()};const saved=await clientService.saveReport(client,report,file);if(alive.current){setFile(null);setFileKey(key=>key+1);setReportTitle('');}return saved;},'Informe guardado y comprobado mediante una nueva lectura de Supabase. Ya aparece en esta ficha; el envío sigue pendiente.','reports');}}>
              <label>Negocio<select required className="vai-input w-full" value={reportBusiness} onChange={event=>setReportBusiness(event.target.value)}><option value="">Elegí el negocio</option>{ownBusinesses.filter(item=>client.businessIds.includes(item.id)).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label>Título<input required maxLength={160} className="vai-input w-full" value={reportTitle} onChange={event=>setReportTitle(event.target.value)}/></label>
              <label>Período del informe<input required maxLength={100} placeholder="Septiembre 2026 / diagnóstico inicial" className="vai-input w-full" value={reportPeriod} onChange={event=>setReportPeriod(event.target.value)}/></label>
              <label>Archivo PDF · hasta 20 MB<input key={fileKey} required type="file" accept=".pdf,application/pdf" className="block w-full text-sm mt-2" onChange={event=>setFile(event.target.files?.[0] || null)}/></label>
              <button disabled={busy} className="vai-button vai-button-primary justify-self-start">{busy ? 'Procesando…' : 'Guardar PDF'}</button>
            </form>
            {reportFeedback && <p role={reportFeedback.kind === 'error' ? 'alert' : 'status'} className={`rounded-xl p-3 text-sm ${reportFeedback.kind === 'error' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}>{reportFeedback.text}</p>}
            {!client.reports.length && <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">No hay informes guardados en esta ficha. Seleccionar un archivo no lo guarda: debe aparecer la confirmación y el informe en esta lista.</p>}
            {[...client.reports].reverse().map(report=><article key={report.id} className="border-t pt-4 space-y-1"><strong>{report.title}</strong><p className="text-sm">{report.businessName} · {report.period}</p><p className="text-xs break-all">{report.fileName} · Cargado: {dateTime(report.createdAt)}</p><ClientReportDelivery report={report} busy={busy} dateTime={dateTime} onCorrect={reason=>void operation(async()=>clientService.save(correctClientReportDelivery(client,report.id,reason,new Date().toISOString())),'Corrección guardada. El informe vuelve a pendiente; se conservaron el PDF y el registro anterior.','reports')}/><p className="text-xs text-slate-500">{report.fileSha256?'Huella del archivo original guardada; se comprueba al descargar.':'Informe anterior sin huella guardada; no se puede comprobar igualdad con el original.'}</p><button disabled={busy} className="vai-button vai-button-secondary mt-2" onClick={async()=>{if(operationPending.current || loading)return;operationPending.current=true;setError('');setBusy(true);try{const blob=await clientService.download(client,report);if(!alive.current)return;const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=report.fileName;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(failure){if(alive.current)setError(message(failure));}finally{operationPending.current=false;if(alive.current)setBusy(false);}}}><Download size={15}/>Descargar PDF</button></article>)}
            <h4 className="font-semibold pt-4">Registrar envío realizado</h4>
            <p className="text-sm text-slate-600">Primero descargá el PDF y envialo desde WhatsApp o correo. Después registrá aquí la fecha y el canal: Visibility no envía el archivo.</p>
            <form className="grid sm:grid-cols-2 gap-4" onSubmit={event=>{event.preventDefault();void operation(async()=>{const next=markClientReportSent(client,sentReportId,new Date(sentAt).toISOString(),channel,new Date().toISOString());return clientService.save(next);},'Envío registrado manualmente. Visibility no confirma entrega ni lectura.');}}>
              <label>Informe<select required className="vai-input w-full" value={sentReportId} onChange={event=>setSentReportId(event.target.value)}><option value="">Elegí un informe pendiente</option>{client.reports.filter(item=>!item.sentAt).map(item=><option key={item.id} value={item.id}>{item.title} · {item.period}</option>)}</select></label>
              <label>Canal<select className="vai-input w-full" value={channel} onChange={event=>setChannel(event.target.value as typeof channel)}>{['WhatsApp','Correo','Otro'].map(value=><option key={value}>{value}</option>)}</select></label>
              <label>Fecha y hora del envío · hora de tu navegador<input required type="datetime-local" className="vai-input w-full" value={sentAt} onChange={event=>setSentAt(event.target.value)}/></label>
              <button disabled={busy || !client.reports.some(item=>!item.sentAt)} className="vai-button vai-button-primary self-end justify-self-start">Registrar envío manual</button>
            </form><p className="text-xs text-slate-500">Este botón no envía mensajes. Registralo después de enviar el PDF; no confirma recepción ni lectura.</p>
          </details>
        </> : <div className="vai-panel rounded-2xl p-8 text-slate-600">Seleccioná un cliente o creá una ficha para comenzar.</div>}
      </fieldset>
    </div>
  </section>;
}
