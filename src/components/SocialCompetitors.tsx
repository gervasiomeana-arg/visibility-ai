import React, { useState } from 'react';
import { publicProfileUrl, type PublicNetwork, type SocialAccount } from '../../shared/socialMetrics';
import { socialMetricsService } from '../services/socialMetricsService';
import type { CompetitorRole } from './SocialPublicAnalysis';

export function SocialCompetitors({account, network, start, end, disabled, onBusy, onSaved}: {
  account:SocialAccount; network:PublicNetwork; start:string; end:string; disabled:boolean;
  onBusy:(busy:boolean)=>void; onSaved:(account:SocialAccount)=>void;
}) {
  const roles:CompetitorRole[]=['competitor-1','competitor-2'];
  const [fields,setFields]=useState(()=>roles.map(role=>{
    const p=account.publicProfiles?.find(p=>p.role===role);
    return {role,name:p?.name||'',url:p?.profileUrl||''};
  }));
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  async function collect() {
    if(disabled||busy)return;
    setBusy(true);onBusy(true);setMessage('');setError('');
    let saved=account;
    const notes:string[]=[];
    try{
      const entries=fields.filter(f=>f.url.trim()).map(f=>({...f,name:f.name.trim(),url:publicProfileUrl(network,f.url.trim())}));
      if(!entries.length)throw new Error('Indicá al menos un perfil confirmado de un competidor.');
      if(entries.some(f=>!f.name||f.name.length>160))throw new Error('Indicá un nombre de hasta 160 caracteres para cada competidor.');
      const seen=new Set([publicProfileUrl(network,account.profileUrl)]);
      for(const f of entries){if(seen.has(f.url))throw new Error('El negocio y los dos competidores deben tener perfiles distintos.');seen.add(f.url);}
      // Sequential collection + optimistic save: a failed provider never overwrites previous observations.
      for(const f of entries){
        const result=await socialMetricsService.collectPublic(network,f.url,start,end);
        if(result.status!=='measured'||!result.snapshot){notes.push(`${f.name}: ${result.message}`);continue;}
        const previous=saved.publicProfiles?.find(p=>p.role===f.role);
        const competitor={role:f.role,name:f.name,profileUrl:f.url,confirmed:true,snapshots:[...(previous?.snapshots||[]),result.snapshot].slice(-120)};
        saved=await socialMetricsService.save({...saved,publicProfiles:[...(saved.publicProfiles||[]).filter(p=>p.role!==f.role),competitor]});
        onSaved(saved);notes.push(`${f.name}: medición guardada con fuente y fecha.`);
      }
      setMessage(notes.join(' '));
    }catch(e){setError(e instanceof Error?e.message:'No se pudo confirmar la consulta y el guardado.');}
    finally{setBusy(false);onBusy(false);}
  }
  return <details className="vai-panel rounded-2xl p-5"><summary className="cursor-pointer font-medium">Comparar con dos competidores · opcional</summary>
    <p className="text-xs text-slate-500 mt-3">Elegí perfiles reales de la misma red y confirmá que pertenecen a los competidores. Se usa el período seleccionado arriba. Dejar un campo vacío conserva lo ya guardado.</p>
    <div className="grid md:grid-cols-2 gap-4 mt-4">{fields.map((f,i)=><div key={f.role} className="border p-4 rounded-xl space-y-3"><label className="block text-sm">Nombre del competidor {i+1}<input className="block border rounded-lg p-3 w-full mt-2" maxLength={160} disabled={disabled||busy} value={f.name} onChange={e=>setFields(rows=>rows.map((r,j)=>i===j?{...r,name:e.target.value}:r))}/></label><label className="block text-sm">Perfil del competidor {i+1}<input type="url" className="block border rounded-lg p-3 w-full mt-2" disabled={disabled||busy} value={f.url} placeholder={`https://www.${network}.com/${network==='tiktok'?'@':''}perfil/`} onChange={e=>setFields(rows=>rows.map((r,j)=>i===j?{...r,url:e.target.value}:r))}/></label></div>)}</div>
    <button className="rounded-lg border px-5 py-3 mt-4 disabled:opacity-50" disabled={disabled||busy} onClick={collect}>{busy?'Consultando competidores…':'Consultar y comparar'}</button>
    {message&&<p role="status" className="text-sm mt-3">{message}</p>}{error&&<p role="alert" className="text-sm mt-3 text-red-800">{error}</p>}
  </details>;
}
