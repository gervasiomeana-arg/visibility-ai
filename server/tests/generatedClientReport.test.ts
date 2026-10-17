import test from 'node:test';
import assert from 'node:assert/strict';
import { saveGeneratedClientReport } from '../../shared/generatedClientReport';
import { pdfFingerprint, saveClientReport, verifyClientReportDownload } from '../../shared/clientReports';
import type { ClientAccount } from '../../shared/clientLedger';

const workspaceId = '11111111-1111-4111-8111-111111111111';
const client: ClientAccount = {
  id:'22222222-2222-4222-8222-222222222222', workspaceId, name:'Cliente QA', kind:'Empresa', country:'UY', email:'', whatsapp:'',
  businessIds:['business'], monthlyFeeCents:1050, currency:'USD', dueDay:10, invoices:[], payments:[], reports:[], updatedAt:'v1',
};
const request = { workspaceId, clientId:client.id, business:{id:'business',workspaceId,name:'Negocio QA'}, title:'Diagnóstico', period:'Octubre 2026' };
// Storage fixture only, not a client deliverable or a live PDF export.
const prepare = async () => new File(['%PDF-1.7\nQA\n%%EOF'],'Visibility-QA.pdf',{type:'application/pdf'});

test('direct report rejects a foreign workspace or a client no longer associated before generating or storing', async () => {
  let generated = 0;
  let stored = 0;
  const cases = [
    { ...client, workspaceId:'other' },
    { ...client, businessIds:[] },
    { ...client, id:'another-client' },
  ];
  for (const row of cases) await assert.rejects(saveGeneratedClientReport(request,async () => { generated++; return prepare(); },()=>true,{
    list:async () => [row], saveReport:async () => { stored++; return row; },
  }),/cliente asociado/);
  await assert.rejects(saveGeneratedClientReport({...request,business:{...request.business,workspaceId:'other'}},prepare,()=>true,{
    list:async () => { throw Error('should not list'); }, saveReport:async () => { throw Error('should not save'); },
  }),/no pertenece/);
  assert.equal(generated,0); assert.equal(stored,0);
});

test('report changes during client reload or PDF preparation cancel before any upload', async () => {
  for (const stage of ['listing','preparing']) {
    let current = true;
    let stored = 0;
    await assert.rejects(saveGeneratedClientReport(request,async () => { if(stage==='preparing') current=false; return prepare(); },()=>current,{
      list:async () => { if(stage==='listing')current=false; return [client]; },
      saveReport:async () => { stored++; return client; },
    }),/informe cambió/i);
    assert.equal(stored,0);
  }
});

test('direct save uses the newly read client, preserves its ledger and confirms a pending report with original bytes', async () => {
  const fresh = {...client,updatedAt:'v2',payments:[{id:'payment',invoiceId:'invoice',amountCents:525,paidAt:'2026-10-17T12:00:00Z',method:'QA',recordedAt:'2026-10-17T12:00:00Z'}]};
  let persisted: ClientAccount | null = null;
  let uploaded: Blob | undefined;
  let reads = 0;
  const result = await saveGeneratedClientReport(request,prepare,()=>true,{
    list:async workspace => { assert.equal(workspace,workspaceId); return [fresh]; },
    saveReport:async (selected,report,file) => {
      assert.equal(selected.updatedAt,'v2');
      return saveClientReport(selected,report,file,{
        upload:async (_path,bytes) => { uploaded=bytes; },
        save:async next => { persisted={...next,updatedAt:'v3'}; return persisted; },
        read:async () => { reads++; return persisted; },
      });
    },
  });
  assert.equal(reads,1); assert.equal(result.updatedAt,'v3');
  assert.deepEqual(result.payments,fresh.payments);
  assert.equal(result.reports.length,1);
  const report=result.reports[0];
  assert.equal(report.businessId,'business'); assert.equal(report.fileName,'Visibility-QA.pdf');
  assert.equal(report.sentAt,undefined); assert.equal(report.channel,undefined);
  assert.equal(report.sentRecordedAt,undefined);
  await verifyClientReportDownload(result,report,uploaded!);
});

test('unconfirmed database persistence does not turn a direct save into success', async () => {
  await assert.rejects(saveGeneratedClientReport(request,prepare,()=>true,{
    list:async () => [client],
    saveReport:async (selected,report,file) => saveClientReport(selected,report,file,{
      upload:async () => {}, save:async next => next, read:async () => client,
    }),
  }),/no se pudo confirmar/);
});

test('retry after a lost acknowledgement cannot upload the same registered document again', async () => {
  const file = await prepare();
  const fresh = {...client,reports:[{id:'existing',businessId:'business',businessName:'Negocio QA',title:request.title,period:request.period,fileName:file.name,filePath:'existing.pdf',createdAt:'2026-10-17T12:00:00Z',fileSha256:await pdfFingerprint(file)}]};
  let uploads = 0;
  await assert.rejects(saveGeneratedClientReport(request,prepare,()=>true,{
    list:async () => [fresh],saveReport:async () => {uploads++;return fresh;},
  }),/ya está guardado/);
  assert.equal(uploads,0);
});
