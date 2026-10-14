import { supabase } from './authService';
import { reportPath, type ClientAccount, type ClientReport } from '../../shared/clientLedger';

function db() { if (!supabase) throw new Error('Clientes requiere Supabase configurado.'); return supabase; }
const bucket = 'visibility-client-reports';
function decode(row: any): ClientAccount { return { ...row.payload, id: row.id, workspaceId: row.workspace_id, updatedAt: row.updated_at }; }
export const clientService = {
  async list(workspaceId: string): Promise<ClientAccount[]> {
    const { data, error } = await db().from('client_accounts').select('id,workspace_id,payload,updated_at').eq('workspace_id',workspaceId).order('created_at',{ ascending: false });
    if (error) throw new Error(`No se pudieron cargar clientes: ${error.message}. Comprobá la migración de Clientes en Supabase.`);
    return (data || []).map(decode);
  },
  async save(client: ClientAccount): Promise<ClientAccount> {
    const { updatedAt, ...payload } = client;
    const query = updatedAt
      ? db().from('client_accounts').update({ payload }).eq('workspace_id',client.workspaceId).eq('id',client.id).eq('updated_at',updatedAt)
      : db().from('client_accounts').insert({ id: client.id, workspace_id: client.workspaceId, payload });
    const { data, error } = await query.select('id,workspace_id,payload,updated_at').maybeSingle();
    if (error) throw new Error(`No se guardó el cliente: ${error.message}`);
    if (!data) throw new Error('El registro cambió en otra pestaña o no tenés permiso. Recargá Clientes antes de guardar.');
    return decode(data);
  },
  async upload(workspaceId: string, clientId: string, reportId: string, file: File): Promise<string> {
    if (file.size === 0 || file.size > 20 * 1024 * 1024 || await file.slice(0,5).text() !== '%PDF-') throw new Error('Elegí un archivo PDF válido de hasta 20 MB.');
    const path = reportPath(workspaceId,clientId,reportId);
    const { error } = await db().storage.from(bucket).upload(path,file,{ contentType: 'application/pdf', upsert: false });
    if (error) throw new Error(`No se guardó el PDF: ${error.message}`);
    return path;
  },
  async saveReport(client: ClientAccount, report: ClientReport, file: File): Promise<ClientAccount> {
    if (!client.updatedAt) throw new Error('Guardá la ficha del cliente antes de cargar informes.');
    const path = await this.upload(client.workspaceId,client.id,report.id,file);
    try { return await this.save({ ...client, reports: [...client.reports, { ...report, filePath: path }] }); }
    catch (error) {
      // This removes only the new, unregistered upload; existing client PDFs are never touched.
      await db().storage.from(bucket).remove([path]);
      throw error;
    }
  },
  async download(client: ClientAccount, report: ClientReport): Promise<Blob> {
    if (report.filePath !== reportPath(client.workspaceId,client.id,report.id)) throw new Error('El archivo no pertenece a este cliente.');
    const { data, error } = await db().storage.from(bucket).download(report.filePath);
    if (error || !data) throw new Error(`No se pudo descargar el informe: ${error?.message || 'archivo no disponible'}`);
    return data;
  },
};
