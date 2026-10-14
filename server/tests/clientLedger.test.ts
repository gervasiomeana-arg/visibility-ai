import test from 'node:test';
import assert from 'node:assert/strict';
import { addClientPayment, amountToCents, correctClientReportDelivery, invoiceBalance, invoiceForMonth, markClientReportSent, reportPath, validateClient, type ClientAccount, type ClientReport } from '../../shared/clientLedger';
const client: ClientAccount = { id:'client',workspaceId:'workspace',name:'Agencia de prueba',kind:'Agencia',country:'Uruguay',email:'',whatsapp:'',businessIds:['hotel'],monthlyFeeCents:10000,currency:'USD',dueDay:31,invoices:[],payments:[],reports:[] };
const now = '2026-10-13T21:00:00Z';
test('amounts use integer cents and reject ambiguous, negative or excessive decimal values',()=>{
  assert.equal(amountToCents('100,25'),10025); assert.equal(amountToCents('0.1'),10);
  for(const input of ['1,000.50','-1','1.001','Infinity','1e3',''])assert.throws(()=>amountToCents(input));
});
test('monthly charges clamp the due day and preserve original rate and currency',()=>{
  const invoice=invoiceForMonth(client,'2026-02','invoice',now);
  assert.equal(invoice.dueOn,'2026-02-28');
  const next={...client,monthlyFeeCents:20000,currency:'UYU',invoices:[invoice]};
  assert.equal(next.invoices[0].amountCents,10000);assert.equal(next.invoices[0].currency,'USD');
  assert.throws(()=>invoiceForMonth(next,'2026-02','duplicate',now));
  assert.throws(()=>invoiceForMonth(client,'2026-13','invalid',now));
});
test('partial payment, overdue and full payment states derive from recorded amounts only',()=>{
  const invoice=invoiceForMonth(client,'2026-09','invoice',now);
  const own={...client,invoices:[invoice]};
  assert.equal(invoiceBalance(own,invoice,'2026-09-20').status,'Pendiente');
  const paid=addClientPayment(own,{id:'p',invoiceId:'invoice',amountCents:3000,paidAt:'2026-09-20T12:00:00Z',recordedAt:now,method:'Transferencia'},'2026-09-20');
  assert.equal(invoiceBalance(paid,invoice,'2026-09-20').status,'Pago parcial');
  assert.equal(invoiceBalance(paid,invoice,'2026-10-01').status,'Vencido');
  const full=addClientPayment(paid,{id:'p2',invoiceId:'invoice',amountCents:7000,paidAt:'2026-10-01T12:00:00Z',recordedAt:now,method:'Transferencia'},'2026-10-13');
  assert.equal(invoiceBalance(full,invoice,'2026-10-13').status,'Pagado');
  assert.equal(invoiceBalance(full,invoice,'2026-10-13').remainingCents,0);
});
test('payments cannot overpay, duplicate, belong to another client or use future dates',()=>{
  const own={...client,invoices:[invoiceForMonth(client,'2026-10','invoice',now)]};
  const payment={id:'p',invoiceId:'invoice',amountCents:100,paidAt:now,recordedAt:now,method:'Efectivo'};
  for(const change of [{amountCents:0},{amountCents:10001},{invoiceId:'foreign'},{paidAt:'2026-12-01'},{recordedAt:'invalid-date'}])assert.throws(()=>addClientPayment(own,{...payment,...change},'2026-10-13'));
  assert.throws(()=>addClientPayment({...own,payments:[payment]},payment,'2026-10-13'));
});
test('client validation rejects foreign workspaces or businesses',()=>{
  validateClient(client,'workspace',['hotel']);
  assert.throws(()=>validateClient(client,'other',['hotel']));assert.throws(()=>validateClient(client,'workspace',['other']));
  assert.throws(()=>validateClient({...client,currency:'???'},'workspace',['hotel']));
});
test('PDF path binds workspace, client and document without accepting traversal',()=>{
  const w='11111111-1111-4111-8111-111111111111', c='22222222-2222-4222-8222-222222222222', r='33333333-3333-4333-8333-333333333333';
  assert.equal(reportPath(w,c,r),`${w}/${c}/${r}.pdf`);
  assert.throws(()=>reportPath(w,'../other',r));
});
test('manual sending records actual declared time separately from entry time and cannot alter another client report',()=>{
  const report={id:'r',title:'Diagnóstico',createdAt:now} as ClientReport;
  const own={...client,reports:[report]};
  const result=markClientReportSent(own,'r','2026-10-13T18:00:00Z','WhatsApp',now);
  assert.equal(result.reports[0].sentAt,'2026-10-13T18:00:00Z');assert.equal(result.reports[0].sentRecordedAt,now);
  assert.throws(()=>markClientReportSent(result,'r',now,'WhatsApp',now));
  assert.throws(()=>markClientReportSent(own,'foreign',now,'WhatsApp',now));
  assert.throws(()=>markClientReportSent(own,'r','2026-11-01','WhatsApp',now));
  assert.throws(()=>markClientReportSent(own,'r',now,'WhatsApp','invalid-date'));
  assert.equal(own.reports[0].sentAt,undefined);
});

test('a mistaken delivery can return to pending without changing the PDF, other reports or payments', () => {
  const report = { id: 'r', title: 'Diagnóstico', filePath: 'original.pdf', fileName: 'original.pdf', fileSizeBytes: 100, fileSha256: 'original-hash', createdAt: now } as ClientReport;
  const other = { ...report, id: 'other' };
  const sent = markClientReportSent({ ...client, reports: [report, other] }, 'r', '2026-10-13T18:00:00Z', 'WhatsApp', now);
  const corrected = correctClientReportDelivery(sent, 'r', 'Marcado por error durante una prueba.', '2026-10-13T22:00:00Z');
  const pending = corrected.reports[0];
  assert.equal(pending.sentAt,undefined); assert.equal(pending.channel,undefined); assert.equal(pending.sentRecordedAt,undefined);
  for (const key of ['filePath','fileName','fileSizeBytes','fileSha256','createdAt'] as const) assert.equal(pending[key],report[key]);
  assert.equal(corrected.reports[1],other); assert.equal(corrected.payments,sent.payments); assert.equal(corrected.invoices,sent.invoices);
  assert.deepEqual(pending.deliveryCorrections,[{ previousSentAt: '2026-10-13T18:00:00Z', previousRecordedAt: now, previousChannel: 'WhatsApp', correctedAt: '2026-10-13T22:00:00Z', reason: 'Marcado por error durante una prueba.' }]);
  assert.ok(sent.reports[0].sentAt); assert.equal(sent.reports[0].deliveryCorrections,undefined);
  assert.equal(JSON.parse(JSON.stringify(corrected)).reports[0].deliveryCorrections.length,1);
});

test('corrections require a recorded report in the selected client and an explanation, preserving history on resend', () => {
  const report = { id: 'r', title: 'Diagnóstico', createdAt: now } as ClientReport;
  const own = { ...client, reports: [report] };
  const sent = markClientReportSent(own, 'r', now, 'WhatsApp', now);
  for (const reason of ['', 'muy corto', 'x'.repeat(501)]) assert.throws(() => correctClientReportDelivery(sent, 'r', reason, now));
  assert.throws(() => correctClientReportDelivery(sent, 'foreign', 'Marcado por error de prueba.', now));
  assert.throws(() => correctClientReportDelivery(own, 'r', 'Marcado por error de prueba.', now));
  assert.throws(() => correctClientReportDelivery(sent, 'r', 'Marcado por error de prueba.', 'invalid'));
  const first = correctClientReportDelivery(sent, 'r', 'Marcado por error de prueba.', now);
  const resent = markClientReportSent(first, 'r', now, 'Correo', now);
  const second = correctClientReportDelivery(resent, 'r', 'Segundo registro equivocado.', now);
  assert.equal(second.reports[0].deliveryCorrections!.length,2);
  assert.equal(second.reports[0].deliveryCorrections![0].previousChannel,'WhatsApp');
  assert.equal(second.reports[0].deliveryCorrections![1].previousChannel,'Correo');
});
