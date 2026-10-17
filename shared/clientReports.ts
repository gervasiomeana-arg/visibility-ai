import { reportPath, type ClientAccount, type ClientReport } from './clientLedger';

const limit = 20 * 1024 * 1024;
export interface ReportFile extends Blob { readonly name: string }
interface ReportStore {
  upload(path: string, file: ReportFile): Promise<void>;
  save(client: ClientAccount): Promise<ClientAccount>;
  read(workspaceId: string, clientId: string): Promise<ClientAccount | null>;
}

export async function pdfFingerprint(file: Blob): Promise<string> {
  if (!file.size || file.size > limit || await file.slice(0, 5).text() !== '%PDF-') throw new Error('Elegí un archivo PDF válido de hasta 20 MB.');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function saveClientReport(client: ClientAccount, report: ClientReport, file: ReportFile, store: ReportStore): Promise<ClientAccount> {
  if (!client.updatedAt) throw new Error('Guardá la ficha del cliente antes de cargar informes.');
  const path = reportPath(client.workspaceId, client.id, report.id);
  if (client.reports.some(item => item.id === report.id)) throw new Error('El informe ya está registrado.');
  if (!client.businessIds.includes(report.businessId)) throw new Error('El negocio no está asociado a este cliente.');
  if (!report.title.trim() || report.title.length > 160 || !report.period.trim() || report.period.length > 100 || !report.businessName.trim() || !Number.isFinite(Date.parse(report.createdAt)) || report.sentAt || report.sentRecordedAt || report.channel) throw new Error('Revisá los datos del informe. El envío se registra después, por separado.');
  if (report.contentSha256 !== undefined && !/^[a-f0-9]{64}$/.test(report.contentSha256)) throw new Error('La huella de contenido del informe es inválida.');
  const savedReport: ClientReport = { ...report, fileName: file.name, filePath: path, fileSizeBytes: file.size, fileSha256: await pdfFingerprint(file) };
  await store.upload(path, file);
  let failure: unknown;
  try {
    await store.save({ ...client, reports: [...client.reports, savedReport] });
  } catch (error) { failure = error; }
  // Always read the persisted row, even after a successful write response. A
  // success-looking acknowledgement alone does not prove the report will reload.
  // Never remove the uploaded PDF after an ambiguous database/network outcome.
  try {
    const current = await store.read(client.workspaceId, client.id);
    const registered = current?.reports.find(item => item.id === report.id);
    if (current?.workspaceId === client.workspaceId && current.id === client.id && registered &&
      (['filePath','fileSha256','contentSha256','fileSizeBytes','fileName','businessId','businessName','title','period','createdAt'] as const).every(key => registered[key] === savedReport[key])) return current;
  } catch (error) { if (!failure) failure = error; }
  const detail = failure instanceof Error ? failure.message : 'La lectura de Supabase no devolvió el informe esperado.';
  throw new Error(`El PDF se cargó, pero no se pudo confirmar el registro del informe. El archivo se conserva para evitar perderlo. Recargá Clientes antes de volver a cargarlo. ${detail}`);
}

export async function verifyClientReportDownload(client: ClientAccount, report: ClientReport, file: Blob): Promise<void> {
  const registered = client.reports.find(item => item.id === report.id);
  if (!registered || report.filePath !== registered.filePath || report.filePath !== reportPath(client.workspaceId, client.id, report.id)) throw new Error('El archivo no pertenece a este cliente.');
  const digest = await pdfFingerprint(file);
  if ((registered.fileSizeBytes !== undefined && registered.fileSizeBytes !== file.size) ||
    (registered.fileSha256 !== undefined && registered.fileSha256 !== digest)) throw new Error('El PDF descargado no coincide con el archivo registrado. No lo envíes; revisá el informe.');
}
