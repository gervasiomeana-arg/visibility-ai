import{visibilityOperatorId}from'./operatorAccess';
export const backupTables=['profiles','workspaces','workspace_members','businesses','client_accounts','seo_audits','search_console_snapshots','opportunities','action_tasks','tracked_keywords','usage_events','visibility_schema_meta','launch_checklists','business_social_accounts','business_presence_observations','client_audit_runs']as const;
export const backupMaxBytes=64*1024*1024;
export interface BackupFile{path:string;size:number;sha256:string;base64:string;}
export interface OperatorBackup{format:'visibility-private-backup';version:1;createdAt:string;operatorId:string;excluded:string[];tables:Record<string,Record<string,unknown>[]>;files:BackupFile[];sha256:string;}
export function canonical(value:unknown):string{if(Array.isArray(value))return'['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical((value as Record<string,unknown>)[k])).join(',')+'}';return JSON.stringify(value);}
export async function checksum(value:Uint8Array|string){const bytes=typeof value==='string'?new TextEncoder().encode(value):value;return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as BufferSource)),b=>b.toString(16).padStart(2,'0')).join('');}
export function safeBackupPath(path:unknown):path is string{return typeof path==='string'&&path.length<=1024&&/^[a-f0-9-]{36}\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.pdf$/i.test(path);}
export async function validateOperatorBackup(input:unknown):Promise<OperatorBackup>{
 const b=input as OperatorBackup;
 if(!b||b.format!=='visibility-private-backup'||b.version!==1||b.operatorId!==visibilityOperatorId||!Number.isFinite(Date.parse(b.createdAt))||!Array.isArray(b.excluded)||!b.tables||typeof b.tables!=='object'||Array.isArray(b.tables)||!Array.isArray(b.files)||b.files.length>5000)throw Error('Formato de respaldo no válido.');
 if(Object.keys(b.tables).length!==backupTables.length||backupTables.some(t=>!Array.isArray(b.tables[t])||b.tables[t].length>100000||b.tables[t].some(r=>!r||typeof r!=='object'||Array.isArray(r))))throw Error('Faltan tablas o hay registros no válidos.');
 const {sha256,...payload}=b;if(sha256!==await checksum(canonical(payload)))throw Error('La copia está dañada o fue modificada. No se usará para recuperar datos.');
 const workspaces=new Set(b.tables.workspaces.map(r=>r.id));if(!workspaces.size||b.tables.workspaces.some(r=>r.owner_user_id!==visibilityOperatorId)||b.tables.profiles.some(r=>r.id!==visibilityOperatorId)||b.tables.workspace_members.some(r=>r.user_id!==visibilityOperatorId))throw Error('El respaldo no pertenece al operador privado.');
 for(const table of backupTables)for(const row of b.tables[table])if('workspace_id'in row&&!workspaces.has(row.workspace_id))throw Error('Hay registros de un espacio ajeno.');
 const paths=new Set<string>();let total=0;
 for(const file of b.files){if(!safeBackupPath(file.path)||!workspaces.has(file.path.split('/')[0])||paths.has(file.path)||typeof file.base64!=='string'||file.base64.length>28*1024*1024||!Number.isSafeInteger(file.size)||file.size<=0||file.size>20*1024*1024)throw Error('Archivo PDF no válido o fuera del espacio privado.');paths.add(file.path);
  let bytes:Uint8Array;try{bytes=Uint8Array.from(atob(file.base64),c=>c.charCodeAt(0));}catch{throw Error('PDF dañado.');}total+=bytes.length;if(total>48*1024*1024||bytes.length!==file.size||new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-'||file.sha256!==await checksum(bytes))throw Error('No coincide la integridad de un PDF.');
 }
 for(const client of b.tables.client_accounts){const reports=(client.payload as {reports?:{filePath?:string}[]})?.reports;if(reports!==undefined&&!Array.isArray(reports))throw Error('Registro de informes no válido.');for(const report of reports||[])if(!report.filePath||!report.filePath.startsWith(`${client.workspace_id}/${client.id}/`)||!paths.has(report.filePath))throw Error('Falta un PDF vinculado a una ficha. No se confirmó un respaldo completo.');}
 return b;
}
