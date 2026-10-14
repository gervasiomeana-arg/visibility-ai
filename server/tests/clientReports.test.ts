import test from 'node:test';
import assert from 'node:assert/strict';
import { pdfFingerprint, saveClientReport, verifyClientReportDownload } from '../../shared/clientReports';
import { type ClientAccount, type ClientReport } from '../../shared/clientLedger';

const client: ClientAccount = { id:'22222222-2222-4222-8222-222222222222', workspaceId:'11111111-1111-4111-8111-111111111111', name:'Cliente prueba', kind:'Empresa', country:'UY', email:'', whatsapp:'', businessIds:['hotel'], monthlyFeeCents:2000, currency:'USD', dueDay:10, invoices:[], payments:[], reports:[], updatedAt:'2026-10-14T18:00:00Z' };
const report: ClientReport = { id:'33333333-3333-4333-8333-333333333333', businessId:'hotel', businessName:'Hotel prueba', title:'Diagnóstico', period:'Octubre 2026', fileName:'nombre-ignorado.pdf', filePath:'', createdAt:'2026-10-14T18:01:00Z' };
// A byte fixture for storage integrity, not an exported or visually validated PDF.
const file = () => new File(['%PDF-1.7\ncontenido de prueba\n%%EOF'], 'informe.pdf', { type:'application/pdf' });

test('PDF round trip preserves the original bytes, name, size and fingerprint', async () => {
  let uploaded: Blob | undefined;
  let uploadedPath = '';
  let persisted: ClientAccount | null = null;
  let reads = 0;
  const saved = await saveClientReport(client, report, file(), {
    upload: async (path, bytes) => { uploadedPath=path; uploaded=bytes; },
    save: async next => { persisted = {...next, updatedAt:'2026-10-14T18:02:00Z'}; return persisted; },
    read: async () => { reads++; return persisted; },
  });
  const registered = saved.reports[0];
  assert.equal(registered.filePath,uploadedPath);
  assert.equal(registered.fileName,'informe.pdf');
  assert.equal(registered.fileSizeBytes,uploaded!.size);
  assert.equal(registered.fileSha256,await pdfFingerprint(uploaded!));
  await verifyClientReportDownload(saved,registered,uploaded!);
  const altered = new Blob(['%PDF-1.7\ncontenido de pruebo\n%%EOF']);
  assert.equal(altered.size,uploaded!.size);
  await assert.rejects(verifyClientReportDownload(saved,registered,altered),/no coincide/);
  assert.equal(client.reports.length,0);
  assert.equal(reads,1);
});

test('a successful write acknowledgement without a confirmed persisted report never announces a saved PDF', async () => {
  for (const mode of ['absent','read-failed','foreign','mismatched'] as const) {
    let acknowledged: ClientAccount | null = null;
    let uploads = 0;
    await assert.rejects(saveClientReport(client, report, file(), {
      upload: async () => { uploads++; },
      save: async next => { acknowledged = next; return next; },
      read: async () => {
        if (mode === 'read-failed') throw Error('Read unavailable');
        if (mode === 'absent') return client;
        if (mode === 'foreign') return { ...acknowledged!, id: 'other-client' };
        return { ...acknowledged!, reports: [{ ...acknowledged!.reports[0], fileSha256: 'wrong-hash' }] };
      },
    }), /no se pudo confirmar.*archivo se conserva.*Recargá/s);
    assert.equal(uploads,1);
  }
});

test('successful report saving returns the fresh database row instead of the write acknowledgement', async () => {
  let persisted: ClientAccount | null = null;
  const result = await saveClientReport(client, report, file(), {
    upload: async () => {},
    save: async next => { persisted = { ...next, updatedAt: 'read-version' }; return { ...next, updatedAt: 'write-version' }; },
    read: async (workspaceId, clientId) => { assert.equal(workspaceId,client.workspaceId); assert.equal(clientId,client.id); return persisted; },
  });
  assert.equal(result.updatedAt,'read-version');
  assert.equal(result.reports.length,1);
});

test('lost save response recovers a committed report without deleting its PDF', async () => {
  let committed: ClientAccount | null = null;
  let uploads=0;
  const recovered = await saveClientReport(client,report,file(), {
    upload: async () => {uploads++;},
    save: async next => { committed={...next,updatedAt:'new-version'}; throw Error('Connection lost after commit'); },
    read: async (workspaceId,clientId) => {
      assert.equal(workspaceId,client.workspaceId); assert.equal(clientId,client.id);
      return committed;
    },
  });
  assert.equal(recovered.updatedAt,'new-version');
  assert.equal(uploads,1);
  assert.equal(recovered.reports.length,1);
});

test('uncertain or conflicting save cannot be reported successful', async () => {
  for (const mode of ['absent','read-failed','foreign','mismatched'] as const) {
    let attempted: ClientAccount | null = null;
    await assert.rejects(saveClientReport(client,report,file(), {
      upload: async () => {},
      save: async next => {attempted=next;throw Error('save failed');},
      read: async () => {
        if(mode==='read-failed')throw Error('offline');
        if(mode==='absent')return client;
        if(mode==='foreign')return {...attempted!,workspaceId:'foreign'};
        return {...attempted!,reports:[{...attempted!.reports[0],title:'Different report'}]};
      },
    }),/no se pudo confirmar.*archivo se conserva.*Recargá/s);
  }
});

test('invalid, duplicate or foreign reports fail before any upload', async () => {
  let uploads=0;
  const store={ upload:async()=>{uploads++;},save:async(next:ClientAccount)=>next,read:async()=>client };
  for(const invalid of [{...report,businessId:'other'},{...report,sentAt:report.createdAt},{...report,title:''},{...report,id:'../foreign'}]) await assert.rejects(saveClientReport(client,invalid,file(),store));
  await assert.rejects(saveClientReport({...client,reports:[report]},report,file(),store),/ya está registrado/);
  await assert.rejects(saveClientReport(client,report,new File(['not a PDF'],'fake.pdf'),store),/PDF válido/);
  assert.equal(uploads,0);
});

test('legacy PDFs remain available but cannot bypass report ownership', async () => {
  const path=`${client.workspaceId}/${client.id}/${report.id}.pdf`;
  const legacy={...report,filePath:path};
  const own={...client,reports:[legacy]};
  await verifyClientReportDownload(own,legacy,file());
  await assert.rejects(verifyClientReportDownload(client,legacy,file()),/no pertenece/);
  await assert.rejects(verifyClientReportDownload(own,{...legacy,filePath:'foreign.pdf'},file()),/no pertenece/);
  await assert.rejects(verifyClientReportDownload(own,legacy,new Blob(['error response'])),/PDF válido/);
});
