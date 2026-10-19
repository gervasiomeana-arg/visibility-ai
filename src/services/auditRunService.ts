import {supabase} from './authService';
import {validateAuditRun,type AuditRun} from '../../shared/auditRun';
function db(){if(!supabase)throw new Error('El historial requiere Supabase configurado.');return supabase;}
function decode(row:any):AuditRun{return validateAuditRun({...row.payload,id:row.id,workspaceId:row.workspace_id,businessId:row.business_id,clientId:row.client_id,savedAt:row.created_at});}
const fields='id,workspace_id,business_id,client_id,payload,created_at';
export const auditRunService={
 async list(workspaceId:string,businessId:string,clientId:string){const {data,error}=await db().from('client_audit_runs').select(fields).eq('workspace_id',workspaceId).eq('business_id',businessId).eq('client_id',clientId).order('created_at',{ascending:false}).limit(100);if(error)throw new Error('No se pudo cargar el historial. Revisá conexión, permisos y migración client_audit_runs; no se confirma ausencia de registros.');return (data||[]).map(decode);},
 async save(input:AuditRun){const r=validateAuditRun(input);const {id,workspaceId,businessId,clientId,savedAt,...payload}=r;const {data,error}=await db().from('client_audit_runs').insert({id,workspace_id:workspaceId,business_id:businessId,client_id:clientId,channel:r.channel,payload}).select(fields).single();if(error||!data)throw new Error('No se confirmó el guardado en el historial. Reintentá conservando el resultado; no se guardó como éxito.');return decode(data);},
};
