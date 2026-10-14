import React,{useEffect,useRef,useState} from 'react';
import {Check,ChevronDown,ChevronUp,ClipboardList} from 'lucide-react';
import {launchControls,launchProgress,recordLaunchCheck,type LaunchControlId,type LaunchPlan} from '../../shared/launchPlan';
import {measurementTime} from '../../shared/measurementTime';
import type {ActiveTab,Workspace} from '../types';

export function LaunchChecklist({workspace,onNavigate}:{workspace:Workspace;onNavigate:(tab:ActiveTab)=>void}){
  const [plan,setPlan]=useState<LaunchPlan>({workspaceId:workspace.id,checks:{}});
  const [expanded,setExpanded]=useState(true);
  const [editing,setEditing]=useState<LaunchControlId|null>(null);
  const [evidence,setEvidence]=useState('');
  const [busy,setBusy]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const [error,setError]=useState('');
  const [integrityResult,setIntegrityResult]=useState('');
  const alive=useRef(true),pending=useRef(false);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  async function reload(){
    if(pending.current)return;pending.current=true;setBusy(true);setError('');
    try{const result=await (await import('../services/launchPlanService')).launchPlanService.load(workspace.id);if(alive.current){setPlan(result);setLoaded(true);setEditing(null);}}
    catch(failure){if(alive.current){setLoaded(false);setError(failure instanceof Error?failure.message:'No se pudo cargar el plan.');}}
    finally{pending.current=false;if(alive.current)setBusy(false);}
  }
  useEffect(()=>{void reload();},[workspace.id]);
  async function save(id:LaunchControlId,done:boolean){
    if(pending.current || !loaded)return;pending.current=true;setBusy(true);setError('');
    try{
      const service=(await import('../services/launchPlanService')).launchPlanService;
      let next=recordLaunchCheck(plan,id,done,evidence,new Date().toISOString());
      if(id==='isolation' && done){
        const integrity=await service.checkIntegrity(workspace.id);
        next=recordLaunchCheck(plan,id,done,`${evidence.trim()}\nComprobación de Supabase: ${integrity}`,new Date().toISOString());
      }
      const result=await service.save(next);if(alive.current){setPlan(result);setEditing(null);}
    }
    catch(failure){if(alive.current)setError(failure instanceof Error?failure.message:'No se pudo guardar el control.');}
    finally{pending.current=false;if(alive.current)setBusy(false);}
  }
  async function checkIntegrity(){
    if(pending.current || !loaded)return;pending.current=true;setBusy(true);setError('');
    try{const result=await (await import('../services/launchPlanService')).launchPlanService.checkIntegrity(workspace.id);if(alive.current)setIntegrityResult(result+' Comprobado: '+measurementTime(new Date().toISOString(),workspace.timezone));}
    catch(failure){if(alive.current)setError(failure instanceof Error?failure.message:'No se pudo comprobar Supabase.');}
    finally{pending.current=false;if(alive.current)setBusy(false);}
  }
  const progress=launchProgress(plan);
  return <aside aria-label="Plan de controles para comenzar a ofrecer Visibility" className="no-print fixed bottom-20 sm:bottom-5 left-4 z-40 w-[calc(100vw-2rem)] sm:w-[350px] rounded-2xl border border-slate-200 bg-white shadow-xl">
    <button className="w-full flex items-center justify-between gap-3 p-3 text-left" onClick={()=>setExpanded(value=>!value)} aria-expanded={expanded}><span className="flex gap-2 items-center"><ClipboardList size={18}/><strong className="text-sm">Plan de salida · {progress.completed}/{progress.total}</strong></span>{expanded?<ChevronDown size={16}/>:<ChevronUp size={16}/>}</button>
    {expanded && <div className="px-3 pb-3 max-h-[58vh] overflow-y-auto space-y-3 text-xs">
      <p className="text-slate-600">Tres jornadas estimadas. Son controles reales, separados de los tests de código. Se tachan después de guardar qué se comprobó.</p>
      {error && <p role="alert" className="bg-red-50 text-red-800 rounded-lg p-2">{error}</p>}
      {!loaded && <p className="text-amber-800">{busy?'Cargando plan…':'Sin sincronizar. La lista se muestra, pero no se pueden guardar cambios todavía.'}</p>}
      {[1,2,3].map(day=><section key={day} className="space-y-2"><h2 className="font-bold text-slate-800">Jornada {day}</h2>{launchControls.filter(control=>control.day===day).map(control=>{
        const check=plan.checks[control.id],done=!!check?.done && check.evidence?.trim().length>=12;
        return <div key={control.id} className="border border-slate-200 rounded-lg p-2 space-y-2">
          <button disabled={busy || !loaded} onClick={()=>{setEditing(control.id);setEvidence(check?.evidence || '');setIntegrityResult('');}} className="flex gap-2 w-full text-left"><span className={`shrink-0 w-4 h-4 border rounded flex items-center justify-center ${done?'bg-emerald-700 text-white border-emerald-700':'border-slate-400'}`}>{done && <Check size={12}/>}</span><span className={done?'line-through text-slate-500':'font-semibold'}>{control.title}</span></button>
          {done && <p className="text-slate-500">Registro manual · {measurementTime(check!.recordedAt,workspace.timezone)}</p>}
          {editing===control.id && <div className="space-y-2"><p>{control.criteria}</p>{control.id==='isolation' && <button disabled={busy} onClick={()=>void checkIntegrity()} className="underline">Comprobar correspondencia en Supabase</button>}{control.id==='isolation' && integrityResult && <p role="status" className="text-emerald-800">{integrityResult} Completá tu nota con el resultado del cambio entre negocios.</p>}<label className="block">Qué comprobaste<textarea maxLength={2000} className="vai-input w-full mt-1 text-xs" rows={3} value={evidence} disabled={busy} onChange={event=>setEvidence(event.target.value)} placeholder="Negocio, archivo, resultado y fecha de la prueba"/></label><div className="flex flex-wrap gap-2"><button disabled={busy} onClick={()=>void save(control.id,true)} className="vai-button vai-button-primary text-xs">Completar</button>{check?.done && <button disabled={busy} onClick={()=>void save(control.id,false)} className="vai-button vai-button-secondary text-xs">Reabrir</button>}<button disabled={busy} onClick={()=>setEditing(null)} className="underline">Cerrar</button><button disabled={busy} onClick={()=>onNavigate(control.tab as ActiveTab)} className="underline">Ir al paso</button></div></div>}
        </div>;
      })}</section>)}
      <button disabled={busy} onClick={()=>void reload()} className="underline">Recargar plan</button>
      <p className="text-slate-500">{progress.completed===progress.total?'Controles registrados como completos. Revisá sus evidencias antes de decidir la salida comercial.':'Los controles pendientes todavía no están aprobados.'} Marcar un control no confirma automáticamente una prueba ni envía mensajes.</p>
    </div>}
  </aside>;
}
