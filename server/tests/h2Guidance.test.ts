import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRealSeoAudit} from '../seoAuditService';

test('missing H2 in initial HTML requires rendered-page verification before proposing another heading', async () => {
  const result=await buildRealSeoAudit('https://example.com',{
    fetchPage:async url=>({finalUrl:url,response:new Response('<html><body><div id="root"></div></body></html>',{headers:{'content-type':'text/html'}})}),
    fetchPageSpeed:async()=>{throw new Error('Not part of this local fixture');},
  });
  const item=result.items.find(i=>i.key==='h2')!;
  assert.equal(item.status,'warning');
  assert.match(item.statusLabel!,/Pendiente en página renderizada/);
  assert.match(item.detectedData!,/DOM renderizado no se comprobó/);
  assert.match(item.proposedChange!,/sin duplicarlos/);
  assert.match(item.howToVerify!,/Inspeccionar/);
});
