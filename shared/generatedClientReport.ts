import type { ClientAccount, ClientReport } from './clientLedger';
import { pdfFingerprint } from './clientReports';
import type { ReportPdfBlock } from './reportPdf';

export interface PreparedClientReport { file: File; contentSha256: string }
export async function reportContentFingerprint(blocks: ReportPdfBlock[]): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify({version:1,blocks}));
  const digest = await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(digest),byte => byte.toString(16).padStart(2,'0')).join('');
}

interface GeneratedReportRequest {
  workspaceId: string;
  clientId: string;
  business: { id: string; workspaceId?: string; name: string };
  title: string;
  period: string;
}
export interface GeneratedReportStore {
  list(workspaceId: string): Promise<ClientAccount[]>;
  saveReport(client: ClientAccount, report: ClientReport, file: File): Promise<ClientAccount>;
}

// Re-read the client immediately before generating/uploading the document. A
// selection left open in the UI must not overwrite newer payments or reports.
export async function saveGeneratedClientReport(
  request: GeneratedReportRequest,
  prepare: () => Promise<PreparedClientReport>,
  isCurrent: () => boolean,
  store: GeneratedReportStore,
): Promise<ClientAccount> {
  const { workspaceId, business, clientId } = request;
  if (!workspaceId || business.workspaceId !== workspaceId) throw new Error('El negocio no pertenece a este espacio de trabajo.');
  if (!request.title.trim() || request.title.trim().length > 160 || !request.period.trim() || request.period.trim().length > 100) throw new Error('Completá título y período del informe.');
  const clients = await store.list(workspaceId);
  const client = clients.find(row => row.id === clientId && row.workspaceId === workspaceId && row.businessIds.includes(business.id));
  if (!client) throw new Error('Elegí un cliente asociado a este negocio. Si cambiaste la ficha, recargá la lista.');
  if (!isCurrent()) throw new Error('El informe cambió. Revisá el negocio y sus mediciones antes de guardar.');
  const {file,contentSha256} = await prepare();
  if (!/^[a-f0-9]{64}$/.test(contentSha256)) throw new Error('No se pudo comprobar el contenido del informe.');
  const fingerprint = await pdfFingerprint(file);
  if (!isCurrent()) throw new Error('El informe cambió durante la preparación. No se cargó el PDF.');
  if (client.reports.some(report => report.businessId === business.id && report.title === request.title.trim() && report.period === request.period.trim() && (report.contentSha256 === contentSha256 || report.fileSha256 === fingerprint))) throw new Error('Este informe ya está guardado con el mismo contenido, título y período. Revisalo en Clientes antes de cargar otra copia.');
  const report: ClientReport = {
    id: crypto.randomUUID(), businessId: business.id, businessName: business.name,
    title: request.title.trim(), period: request.period.trim(), fileName: file.name,
    filePath: '', contentSha256, createdAt: new Date().toISOString(),
  };
  return store.saveReport(client, report, file);
}
