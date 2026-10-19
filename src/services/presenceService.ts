import { supabase, authService } from './authService';
import { apiFetchJson } from './apiClient';
import { scopedPresence, validatePresenceObservation, type PresenceObservation } from '../../shared/presenceAnalysis';
function db(){if(!supabase)throw new Error('La sección necesita Supabase configurado.');return supabase;}
const failure='No se confirmó la operación de Buscadores e IA. Revisá la sesión y que esté aplicada la migración youtube_presence. No se usan datos de ejemplo.';
export const presenceService={
 async list(workspaceId:string,businessId:string){
  const {data,error}=await db().from('business_presence_observations').select('id,workspace_id,business_id,payload').eq('workspace_id',workspaceId).eq('business_id',businessId).order('observed_at',{ascending:false}).limit(120);
  if(error)throw new Error(failure);
  return scopedPresence((data||[]).map(r=>({...r.payload,id:r.id,workspaceId:r.workspace_id,businessId:r.business_id})),workspaceId,businessId);
 },
 async save(input:PresenceObservation){
  const value=validatePresenceObservation(input),{id,workspaceId,businessId,...payload}=value;
  const {data,error}=await db().from('business_presence_observations').insert({id,workspace_id:workspaceId,business_id:businessId,observed_at:value.observedAt,payload}).select('id').single();
  if(error||data?.id!==id)throw new Error(failure);
  return value;
 },
 async research(body:{workspaceId:string;businessId:string;name:string;website:string;market:string;query:string;language:string;device:string}){
  const result=await apiFetchJson<PresenceObservation>('/api/presence/research',{method:'POST',headers:await authService.getAuthorizationHeaders({'content-type':'application/json'}),body:JSON.stringify(body),signal:AbortSignal.timeout(65000)});
  validatePresenceObservation(result);
  if(result.workspaceId!==body.workspaceId||result.businessId!==body.businessId||result.query!==body.query.trim()||result.method!=='gemini-api')throw new Error('La investigación no corresponde al cliente o consulta solicitados.');
  return result;
 }
};
