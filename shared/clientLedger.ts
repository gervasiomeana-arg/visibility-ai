import {publicProfileUrl,type PublicNetwork} from './socialMetrics';
export interface ClientInvoice { id: string; period: string; dueOn: string; amountCents: number; currency: string; createdAt: string }
export interface ClientPayment { id: string; invoiceId: string; amountCents: number; paidAt: string; method: string; recordedAt: string }
export interface ClientDeliveryCorrection { previousSentAt: string; previousRecordedAt?: string; previousChannel?: 'WhatsApp' | 'Correo' | 'Otro'; correctedAt: string; reason: string }
export interface ClientReport { id: string; businessId: string; businessName: string; title: string; period: string; fileName: string; filePath: string; createdAt: string; fileSizeBytes?: number; fileSha256?: string; contentSha256?: string; sentAt?: string; sentRecordedAt?: string; channel?: 'WhatsApp' | 'Correo' | 'Otro'; deliveryCorrections?: ClientDeliveryCorrection[] }
export interface ClientAccount {
  id: string; workspaceId: string; name: string; kind: 'Empresa' | 'Agencia' | 'Persona'; country: string;
  email: string; whatsapp: string; businessIds: string[]; monthlyFeeCents: number; currency: string; dueDay: number;
  invoices: ClientInvoice[]; payments: ClientPayment[]; reports: ClientReport[]; updatedAt?: string;
  paypalPaymentUrl?: string;
  brief?: { contactName?:string; username?:string; siteName?:string; website?:string; city?:string; siteCountry?:string; planName?:string; needs?:string; requiredInformation?:string; frequency?:string; notes?:string; profiles?:Partial<Record<'instagram'|'facebook'|'tiktok'|'youtube',string>> };
}
export function paypalLink(value?: string): string {
  if (!value?.trim()) return '';
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error('Pegá un enlace de PayPal válido, comenzando con https://.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !['paypal.com','www.paypal.com','paypal.me','www.paypal.me'].includes(url.hostname) || url.pathname === '/') throw new Error('Usá un enlace HTTPS de paypal.com o paypal.me, generado en tu cuenta.');
  return url.toString();
}
export function clientDateTime(value: string, timeZone: string): string {
  if (!Number.isFinite(Date.parse(value))) return 'Sin fecha válida';
  return new Intl.DateTimeFormat('es-AR',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(value));
}
export function paypalPaymentRequest(client: ClientAccount, invoiceId: string, today: string): string {
  const invoice = client.invoices.find(item => item.id === invoiceId);
  if (!invoice) throw new Error('El abono no pertenece a este cliente.');
  const url = paypalLink(client.paypalPaymentUrl);
  if (!url) throw new Error('Agregá tu enlace PayPal en Editar ficha.');
  const balance = invoiceBalance(client,invoice,today);
  if (!balance.remainingCents) throw new Error('Este abono ya está pagado.');
  const amount = new Intl.NumberFormat('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(balance.remainingCents/100);
  return `Hola, ${client.name}. Te comparto la solicitud de pago del servicio Visibility correspondiente a ${invoice.period}.\nSaldo pendiente: ${amount} ${invoice.currency}.\nVencimiento: ${invoice.dueOn}.\nEnlace PayPal: ${url}\nAntes de confirmar, revisá que el destinatario, importe y moneda en PayPal coincidan con lo acordado. Gracias.`;
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
  if (!payment.method.trim() || !Number.isFinite(Date.parse(payment.paidAt)) || !Number.isFinite(Date.parse(payment.recordedAt)) || Date.parse(payment.paidAt) > Date.parse(payment.recordedAt)) throw new Error('Ingresá el medio de pago y una fecha válida, no futura.');
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
  if (!Number.isFinite(Date.parse(sentAt)) || !Number.isFinite(Date.parse(recordedAt)) || Date.parse(sentAt) > Date.parse(recordedAt) || !['WhatsApp','Correo','Otro'].includes(channel)) throw new Error('Ingresá una fecha de envío válida, no futura, y un canal.');
  return { ...client, reports: client.reports.map(item => item.id === reportId ? { ...item, sentAt, channel, sentRecordedAt: recordedAt } : item) };
}
export function correctClientReportDelivery(client: ClientAccount, reportId: string, reason: string, correctedAt: string): ClientAccount {
  const report = client.reports.find(item => item.id === reportId);
  if (!report?.sentAt) throw new Error('Elegí un informe con envío registrado de este cliente.');
  if (typeof reason !== 'string' || reason.trim().length < 12 || reason.trim().length > 500 || !Number.isFinite(Date.parse(correctedAt))) {
    throw new Error('Explicá el motivo de la corrección con 12 a 500 caracteres y una fecha válida.');
  }
  const { sentAt, sentRecordedAt, channel, ...pending } = report;
  const corrected: ClientReport = { ...pending, deliveryCorrections: [
    ...(report.deliveryCorrections || []),
    { previousSentAt: sentAt, previousRecordedAt: sentRecordedAt, previousChannel: channel, correctedAt, reason: reason.trim() },
  ] };
  return { ...client, reports: client.reports.map(item => item.id === reportId ? corrected : item) };
}
export function validateClient(client: ClientAccount, workspaceId: string, businessIds: string[]) {
  paypalLink(client.paypalPaymentUrl);
  if(client.brief){
    for(const [key,value] of Object.entries(client.brief))if(key!=='profiles'&&(typeof value!=='string'||value.length>(['needs','requiredInformation','notes'].includes(key)?4000:2000)))throw new Error('Revisá los datos y extensión de la ficha.');
    if(client.brief.website){const u=new URL(client.brief.website);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||!u.hostname.includes('.'))throw new Error('La página debe ser una dirección web pública sin credenciales.');}
    for(const [network,url] of Object.entries(client.brief.profiles||{}))if(url)publicProfileUrl(network as PublicNetwork,url);
  }
  if (!workspaceId || client.workspaceId !== workspaceId) throw new Error('El cliente no pertenece a este espacio de trabajo.');
  if (!client.name.trim() || client.name.length > 160 || !client.country.trim()) throw new Error('Completá el nombre y país del cliente.');
  if (!['Empresa','Agencia','Persona'].includes(client.kind) || !validCurrency(client.currency)) throw new Error('Tipo de cliente o moneda inválidos.');
  if (!Number.isSafeInteger(client.monthlyFeeCents) || client.monthlyFeeCents < 0 || !Number.isInteger(client.dueDay) || client.dueDay < 1 || client.dueDay > 31) throw new Error('Revisá el abono y día de vencimiento.');
  if (client.businessIds.some(id => !businessIds.includes(id))) throw new Error('Uno de los negocios no pertenece a este espacio.');
}
