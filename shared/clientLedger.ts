export interface ClientInvoice { id: string; period: string; dueOn: string; amountCents: number; currency: string; createdAt: string }
export interface ClientPayment { id: string; invoiceId: string; amountCents: number; paidAt: string; method: string; recordedAt: string }
export interface ClientReport { id: string; businessId: string; businessName: string; title: string; period: string; fileName: string; filePath: string; createdAt: string; sentAt?: string; sentRecordedAt?: string; channel?: 'WhatsApp' | 'Correo' | 'Otro' }
export interface ClientAccount {
  id: string; workspaceId: string; name: string; kind: 'Empresa' | 'Agencia' | 'Persona'; country: string;
  email: string; whatsapp: string; businessIds: string[]; monthlyFeeCents: number; currency: string; dueDay: number;
  invoices: ClientInvoice[]; payments: ClientPayment[]; reports: ClientReport[]; updatedAt?: string;
}
export function amountToCents(value: string): number {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim())) throw new Error('Ingresá un importe sin separador de miles y con hasta dos decimales.');
  const [whole, decimals = ''] = value.trim().replace(',', '.').split('.');
  const cents = Number(whole) * 100 + Number(decimals.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents > 1e12) throw new Error('El importe está fuera del rango admitido.');
  return cents;
}
export function validCurrency(value: string): boolean {
  return /^[A-Z]{3}$/.test(value) && ['ARS','USD','EUR','UYU','BRL','CLP','COP','MXN','GBP','CAD','AUD','PEN'].includes(value);
}
export function invoiceForMonth(client: ClientAccount, period: string, id: string, now: string): ClientInvoice {
  if (!/^\d{4}-\d{2}$/.test(period) || Number(period.slice(5)) < 1 || Number(period.slice(5)) > 12) throw new Error('Elegí un mes válido.');
  if (client.invoices.some(invoice => invoice.period === period)) throw new Error('Este mes ya tiene un abono registrado.');
  if (!Number.isSafeInteger(client.monthlyFeeCents) || client.monthlyFeeCents <= 0 || !validCurrency(client.currency)) throw new Error('Definí el importe y moneda del abono primero.');
  if (!Number.isInteger(client.dueDay) || client.dueDay < 1 || client.dueDay > 31) throw new Error('El día de vencimiento debe estar entre 1 y 31.');
  const [year, month] = period.split('-').map(Number);
  const day = Math.min(client.dueDay, new Date(Date.UTC(year, month, 0)).getUTCDate());
  return { id, period, dueOn: `${period}-${String(day).padStart(2,'0')}`, amountCents: client.monthlyFeeCents, currency: client.currency, createdAt: now };
}
export function invoiceBalance(client: ClientAccount, invoice: ClientInvoice, today: string) {
  const paidCents = client.payments.filter(payment => payment.invoiceId === invoice.id).reduce((sum, payment) => sum + payment.amountCents, 0);
  const remainingCents = Math.max(0, invoice.amountCents - paidCents);
  return { paidCents, remainingCents, status: remainingCents === 0 ? 'Pagado' : invoice.dueOn < today ? 'Vencido' : paidCents > 0 ? 'Pago parcial' : 'Pendiente' };
}
export function addClientPayment(client: ClientAccount, payment: ClientPayment, today: string): ClientAccount {
  const invoice = client.invoices.find(item => item.id === payment.invoiceId);
  if (!invoice) throw new Error('Elegí un abono de este cliente.');
  if (client.payments.some(item => item.id === payment.id)) throw new Error('El pago ya está registrado.');
  if (!Number.isSafeInteger(payment.amountCents) || payment.amountCents <= 0 || payment.amountCents > invoiceBalance(client, invoice, today).remainingCents) throw new Error('El pago debe ser mayor a cero y no superar el saldo.');
  if (!payment.method.trim() || !Number.isFinite(Date.parse(payment.paidAt)) || Date.parse(payment.paidAt) > Date.parse(payment.recordedAt)) throw new Error('Ingresá el medio de pago y una fecha válida, no futura.');
  return { ...client, payments: [...client.payments, payment] };
}
export function reportPath(workspaceId: string, clientId: string, reportId: string): string {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (![workspaceId,clientId,reportId].every(id => uuid.test(id))) throw new Error('Identificador de archivo inválido.');
  return `${workspaceId}/${clientId}/${reportId}.pdf`;
}
export function markClientReportSent(client: ClientAccount, reportId: string, sentAt: string, channel: 'WhatsApp' | 'Correo' | 'Otro', recordedAt: string): ClientAccount {
  const report = client.reports.find(item => item.id === reportId);
  if (!report || report.sentAt) throw new Error('Elegí un informe pendiente de este cliente.');
  if (!Number.isFinite(Date.parse(sentAt)) || Date.parse(sentAt) > Date.parse(recordedAt) || !['WhatsApp','Correo','Otro'].includes(channel)) throw new Error('Ingresá una fecha de envío válida, no futura, y un canal.');
  return { ...client, reports: client.reports.map(item => item.id === reportId ? { ...item, sentAt, channel, sentRecordedAt: recordedAt } : item) };
}
export function validateClient(client: ClientAccount, workspaceId: string, businessIds: string[]) {
  if (!workspaceId || client.workspaceId !== workspaceId) throw new Error('El cliente no pertenece a este espacio de trabajo.');
  if (!client.name.trim() || client.name.length > 160 || !client.country.trim()) throw new Error('Completá el nombre y país del cliente.');
  if (!['Empresa','Agencia','Persona'].includes(client.kind) || !validCurrency(client.currency)) throw new Error('Tipo de cliente o moneda inválidos.');
  if (!Number.isSafeInteger(client.monthlyFeeCents) || client.monthlyFeeCents < 0 || !Number.isInteger(client.dueDay) || client.dueDay < 1 || client.dueDay > 31) throw new Error('Revisá el abono y día de vencimiento.');
  if (client.businessIds.some(id => !businessIds.includes(id))) throw new Error('Uno de los negocios no pertenece a este espacio.');
}
