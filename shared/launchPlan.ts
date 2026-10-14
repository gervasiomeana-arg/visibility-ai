export const launchControls = [
  {id:'pdf',day:1,title:'Revisar un PDF real',criteria:'Abrir el PDF exportado y contrastar datos, fuentes, fechas y páginas con el negocio seleccionado.',tab:'monthly-report'},
  {id:'client_pdf',day:1,title:'Guardar y recuperar el PDF en Clientes',criteria:'Cargar el PDF, recargar la app, descargarlo y comprobar que abre y corresponde al cliente.',tab:'clients'},
  {id:'client_history',day:1,title:'Comprobar pagos y registro de envío',criteria:'Comprobar un pago de prueba y un envío manual del PDF, con fecha y hora; recargar y verificar persistencia.',tab:'clients'},
  {id:'gsc',day:2,title:'Importar consultas reales de Google',criteria:'Usar una propiedad autorizada del negocio con consultas no vacías; verificar período, cifras y conservación tras recargar.',tab:'keywords'},
  {id:'isolation',day:2,title:'Verificar separación de datos en Supabase',criteria:'Aplicar la protección negocio/espacio, comprobar registros existentes y probar cambio de negocio sin mezclar datos.',tab:'admin'},
  {id:'pilot',day:3,title:'Completar un piloto de principio a fin',criteria:'Auditar un negocio real, revisar prioridades, exportar su informe, guardarlo en Clientes y registrar la entrega de prueba.',tab:'monthly-report'},
  {id:'final_review',day:3,title:'Revisión final y decisión de salida',criteria:'Repetir el recorrido con otro negocio; revisar límites del servicio, pendientes y calidad del informe antes de ofrecerlo.',tab:'dashboard'},
] as const;
export type LaunchControlId = typeof launchControls[number]['id'];
export interface LaunchCheck { done:boolean; evidence:string; recordedAt:string }
export interface LaunchPlan {workspaceId:string;checks:Partial<Record<LaunchControlId,LaunchCheck>>;updatedAt?:string}

export function validateLaunchChecks(checks:unknown):asserts checks is LaunchPlan['checks']{
  if(!checks || typeof checks!=='object' || Array.isArray(checks))throw new Error('El plan guardado tiene un formato inválido.');
  for(const [id,value] of Object.entries(checks)){
    if(!launchControls.some(control=>control.id===id) || !value || typeof value.done!=='boolean' || typeof value.evidence!=='string' || value.evidence.length>2000 || typeof value.recordedAt!=='string' || !Number.isFinite(Date.parse(value.recordedAt)) || (value.done && value.evidence.trim().length<12))throw new Error('Un control guardado no tiene evidencia válida.');
  }
}

export function recordLaunchCheck(plan:LaunchPlan,id:LaunchControlId,done:boolean,evidence:string,recordedAt:string):LaunchPlan {
  if(!launchControls.some(control=>control.id===id))throw new Error('Control desconocido.');
  if(!Number.isFinite(Date.parse(recordedAt)))throw new Error('Fecha de registro inválida.');
  const note=evidence.trim();
  if(done && note.length<12)throw new Error('Describí qué comprobaste y con qué negocio o archivo antes de completar el control.');
  if(note.length>2000)throw new Error('La evidencia debe tener hasta 2000 caracteres.');
  return {...plan,checks:{...plan.checks,[id]:{done,evidence:note,recordedAt}}};
}
export function launchProgress(plan:LaunchPlan) {
  const completed=launchControls.filter(control=>plan.checks[control.id]?.done && plan.checks[control.id]!.evidence.trim().length>=12 && Number.isFinite(Date.parse(plan.checks[control.id]!.recordedAt))).length;
  return {completed,total:launchControls.length};
}
