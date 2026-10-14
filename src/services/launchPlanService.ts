import {supabase} from './authService';
import type {LaunchPlan} from '../../shared/launchPlan';
import {validateLaunchChecks} from '../../shared/launchPlan';

function db(){if(!supabase)throw new Error('El plan requiere Supabase configurado.');return supabase;}
function decode(row:any):LaunchPlan {
  if(!row || !row.payload || !row.payload.checks || typeof row.payload.checks!=='object' || Array.isArray(row.payload.checks))throw new Error('El plan guardado tiene un formato inválido.');
  validateLaunchChecks(row.payload.checks);
  return {workspaceId:row.workspace_id,checks:row.payload.checks,updatedAt:row.updated_at};
}
export const launchPlanService={
  async checkIntegrity(workspaceId:string):Promise<string>{
    const {data,error}=await db().rpc('check_business_workspace_integrity',{target_workspace:workspaceId});
    if(error)throw new Error(`No se pudo comprobar la correspondencia negocio/espacio: ${error.message}`);
    const expected=['seo_audits','tracked_keywords','search_console_snapshots','opportunities','action_tasks'];
    if(!Array.isArray(data) || data.length!==expected.length || expected.some(name=>!data.some(row=>row.relation_name===name && row.table_exists===true && row.protected_writes===true && row.inconsistent_rows!==null && /^\d+$/.test(String(row.inconsistent_rows)) && Number(row.inconsistent_rows)===0)))throw new Error('La comprobación encontró tablas sin protección o registros inconsistentes. No marques este control como completo; revisá Supabase.');
    return 'Supabase: cinco tablas con protección negocio/espacio y cero registros inconsistentes en este espacio. Este resultado no prueba el cambio de negocio en la app ni todos los permisos de acceso.';
  },
  async load(workspaceId:string):Promise<LaunchPlan>{
    const {data,error}=await db().from('launch_checklists').select('workspace_id,payload,updated_at').eq('workspace_id',workspaceId).maybeSingle();
    if(error)throw new Error(`No se pudo cargar el plan. Comprobá el script de Supabase de planificación. ${error.message}`);
    return data?decode(data):{workspaceId,checks:{}};
  },
  async save(plan:LaunchPlan):Promise<LaunchPlan>{
    validateLaunchChecks(plan.checks);
    const payload={checks:plan.checks};
    const query=plan.updatedAt?db().from('launch_checklists').update({payload}).eq('workspace_id',plan.workspaceId).eq('updated_at',plan.updatedAt):db().from('launch_checklists').insert({workspace_id:plan.workspaceId,payload});
    const {data,error}=await query.select('workspace_id,payload,updated_at').maybeSingle();
    if(error)throw new Error(`No se guardó el control: ${error.message}`);
    if(!data)throw new Error('El plan cambió en otra pestaña o no tenés permiso. Recargalo antes de guardar.');
    return decode(data);
  },
};
