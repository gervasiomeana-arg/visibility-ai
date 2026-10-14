import test from 'node:test';
import assert from 'node:assert/strict';
import { groundedResearch, validateResearchInput, researchPrompt, researchWidgetDocument, researchSourceUrl } from '../../shared/competitorResearch';
import { researchCompetitor } from '../competitorResearchService';
import { storageService } from '../../src/services/storageService';
const input = { name: 'Hotel Ejemplo', location: 'Mar del Plata, Argentina', website: 'example.com', question: '¿Qué servicios y categoría documentan las fuentes?' };
const text = 'El sitio declara recepción. No hay datos documentados de estrellas.';
const response = () => ({ candidates:[{content:{parts:[{text}]},groundingMetadata:{webSearchQueries:['Hotel Ejemplo servicios'],searchEntryPoint:{renderedContent:'<a href="https://www.google.com/search?q=Hotel">Google</a>'},groundingChunks:[{web:{uri:'https://example.com/servicios',title:'Sitio del hotel'}}],groundingSupports:[{segment:{text:'El sitio declara recepción.'},groundingChunkIndices:[0]}]}}],usageMetadata:{totalTokenCount:15} });

test('research requires identity and location, constrains data and refuses unsafe reference URLs', () => {
  assert.equal(validateResearchInput(input).website,'https://example.com/');
  for (const patch of [{name:''},{location:''},{question:''},{question:'x'.repeat(501)},{website:'javascript:alert(1)'},{website:'http://localhost'},{website:'http://127.0.0.1'},{website:'https://user:secret@example.com'}]) assert.throws(()=>validateResearchInput({...input,...patch}));
  for (const url of ['javascript:alert(1)','https://127.0.0.1','https://private.internal','https://[::1]']) assert.equal(researchSourceUrl(url),null);
});
test('only response segments tied to valid source metadata are exposed as research claims', () => {
  const result=groundedResearch(response(),validateResearchInput(input),'hotel','2026-10-12T22:00:00Z');
  assert.equal(result.claims.length,1);assert.equal(result.claims[0].text,'El sitio declara recepción.');
  assert.equal(result.claims[0].sources[0].url,'https://example.com/servicios');assert.equal(result.businessId,'hotel');
  assert.equal(result.claims.some(claim=>claim.text.includes('estrellas')),false);
});
test('uncited model answers, fake segment text and invalid citations cannot become measured evidence', () => {
  assert.throws(()=>groundedResearch({candidates:[{content:{parts:[{text:'Cinco estrellas'}]}}]},validateResearchInput(input),'hotel'),/fuentes/);
  const wrong=response();wrong.candidates[0].groundingMetadata.groundingSupports[0].segment.text='Servicio inventado';assert.throws(()=>groundedResearch(wrong,validateResearchInput(input),'hotel'),/fuentes/);
  const unsafe=response();unsafe.candidates[0].groundingMetadata.groundingChunks[0].web.uri='javascript:alert(1)';assert.throws(()=>groundedResearch(unsafe,validateResearchInput(input),'hotel'),/fuentes/);
  const noSearch=response();noSearch.candidates[0].groundingMetadata.webSearchQueries=[];assert.throws(()=>groundedResearch(noSearch,validateResearchInput(input),'hotel'),/fuentes/);
});
test('the server service explicitly enables Google Search and returns referenced results instead of memory-only copy', async () => {
  const output=await researchCompetitor(validateResearchInput(input),'hotel',async params=>{assert.deepEqual(params.config?.tools,[{googleSearch:{}}]);assert.equal(params.config?.httpOptions?.timeout,60000);assert.match(String(params.contents),/no confundas estrellas/i);return response();});
  assert.equal(output.result.claims.length,1);assert.equal(output.tokens,15);
  assert.match(researchPrompt(validateResearchInput(input)),/negocios homónimos/);
});
test('research history stays isolated by business, workspace and user and reports failed storage', () => {
  const values=new Map<string,string>();const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>values.get(key)||null,setItem:(key:string,value:string)=>values.set(key,value)}});
  try {const result=groundedResearch(response(),validateResearchInput(input),'hotel');storageService.setScope('user:workspace-a');assert.equal(storageService.saveCompetitorResearch('other',result),false);assert.equal(storageService.saveCompetitorResearch('hotel',result),true);assert.equal(storageService.getCompetitorResearch('hotel').length,1);assert.equal(storageService.getCompetitorResearch('other').length,0);storageService.setScope('user:workspace-b');assert.equal(storageService.getCompetitorResearch('hotel').length,0);storageService.setScope('other:workspace-a');assert.equal(storageService.getCompetitorResearch('hotel').length,0);Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('Blocked')}});assert.equal(storageService.saveCompetitorResearch('hotel',result),false);}
  finally {storageService.setScope();if(original)Object.defineProperty(globalThis,'localStorage',original);else delete(globalThis as any).localStorage;}
});
test('search suggestions are framed with a restrictive document policy rather than injected into the app DOM', () => {
  assert.match(researchWidgetDocument('<a>Search</a>'),/default-src &#39;none&#39;|default-src 'none'/);
  assert.match(researchWidgetDocument('<a>Search</a>'),/form-action 'none'/);
});

test('authenticated research endpoint validates input before contacting a provider and reports missing Gemini configuration', async () => {
  const { default: express } = await import('express');const { default: router } = await import('../aiRouter');
  const originalFetch=globalThis.fetch;
  const names=['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY','VITE_SUPABASE_ANON_KEY'];
  const previous=names.map(name=>process.env[name]);
  process.env.VITE_SUPABASE_URL='https://auth.example';process.env.VITE_SUPABASE_PUBLISHABLE_KEY='test-key';delete process.env.VITE_SUPABASE_ANON_KEY;
  globalThis.fetch=((...args:Parameters<typeof fetch>)=>args[0]==='https://auth.example/auth/v1/user'?Promise.resolve(new Response(JSON.stringify({id:'test-user'}))):originalFetch(...args)) as typeof fetch;
  const app=express();app.use(express.json());app.use('/api',router);const server=app.listen(0,'127.0.0.1');
  await new Promise<void>(resolve=>server.on('listening',resolve));const port=(server.address() as any).port;
  try {
    const invalid=await fetch(`http://127.0.0.1:${port}/api/competitors/research`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer test-token'},body:JSON.stringify({})});assert.equal(invalid.status,400);
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY==='MY_GEMINI_API_KEY') {
      const unavailable=await fetch(`http://127.0.0.1:${port}/api/competitors/research`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer test-token'},body:JSON.stringify({...input,businessId:'hotel'})});assert.equal(unavailable.status,503);assert.match((await unavailable.json() as any).error,/GEMINI_API_KEY/);
    }
  } finally {
    globalThis.fetch=originalFetch;
    names.forEach((name,index)=>{if(previous[index]===undefined)delete process.env[name];else process.env[name]=previous[index];});
    await new Promise<void>((resolve,reject)=>server.close(err=>err?reject(err):resolve()));
  }
});
