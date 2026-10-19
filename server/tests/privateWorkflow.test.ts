import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {privateTabs} from '../../shared/privateWorkflow';
import {Navbar} from '../../src/components/Navbar';
import {validateClient,type ClientAccount} from '../../shared/clientLedger';
import {validateAuditRun,auditRunBlocks,type AuditRun} from '../../shared/auditRun';
import {auditSocialAccount} from '../../shared/auditSocialHistory';
import {monthlySeries} from '../../shared/socialMonthly';
const today=new Date().toISOString().slice(0,10);
const run=(patch:Partial<AuditRun>={}):AuditRun=>({id:'r',workspaceId:'w',businessId:'b',clientId:'c',businessName:'Fixture test only',channel:'networks',observedAt:today+'T00:00:00Z',periodStart:today,periodEnd:today,savedAt:today,data:{kind:'networks',network:'instagram',snapshot:{id:'s',profileUrl:'https://www.instagram.com/fixture/',capturedAt:today+'T00:00:00Z',source:'public-web',followers:0,evidence:'Test fixture only, not client data',posts:[],periodStart:today,periodEnd:today}},...patch});
test('private navigation has exactly six areas and hides advanced tools from the main menu',()=>{
 assert.deepEqual(privateTabs.map(t=>t.label),['Clientes','Página web','Redes','Buscadores','IA','Historial']);
 const html=renderToStaticMarkup(React.createElement(Navbar,{activeTab:'clients',setActiveTab:()=>{},activeBusiness:{name:'Fixture',id:'b'} as any,businesses:[],onSelectBusiness:()=>{},onOpenNewBusinessModal:()=>{},onOpenAssistant:()=>{},privateOnly:true}));
 assert.match(html,/Página web/);assert.match(html,/Historial/);assert.doesNotMatch(html,/Siguiente:|Paso [0-9]|Plan de acción|Oportunidades|Analizar otro/);
});
test('expanded client brief is optional for legacy accounts and preserves payments, reports and invoices',()=>{
 const client:ClientAccount={id:'c',workspaceId:'w',name:'Fixture',kind:'Empresa',country:'UY',email:'',whatsapp:'',businessIds:['b'],monthlyFeeCents:100,currency:'USD',dueDay:10,invoices:[],payments:[],reports:[]};
 validateClient(client,'w',['b']);const next={...client,brief:{contactName:'Operator fixture',planName:'Mensual',needs:'Revisar presencia',requiredInformation:'Web y redes',profiles:{instagram:'https://instagram.com/fixture/'}}};validateClient(next,'w',['b']);
 assert.equal(next.payments,client.payments);assert.equal(next.reports,client.reports);assert.equal(next.invoices,client.invoices);
 assert.throws(()=>validateClient({...next,brief:{website:'javascript:alert(1)'}},'w',['b']));
 assert.throws(()=>validateClient({...next,brief:{profiles:{instagram:'https://evil.example/fixture'}}},'w',['b']));
});
test('audits preserve measured zero and evidence, never turn current public snapshots into historical reach',()=>{
 const r=run();validateAuditRun(r);const text=auditRunBlocks(r).map(b=>b.text).join('\n');assert.match(text,/Seguidores observados: 0/);assert.match(text,/sin datos verificados/i);assert.match(text,/Test fixture only/);
 assert.throws(()=>validateAuditRun({...r,channel:'ai'}));assert.throws(()=>validateAuditRun({...r,periodStart:'2999-01-01',periodEnd:'2999-01-02'}));
 const a=auditSocialAccount([r],[],{workspaceId:'w',clientId:'c',businessId:'b',network:'instagram',profileUrl:'https://instagram.com/fixture/'});
 assert.equal(monthlySeries(a,'instagram','followers',today,today)[0].value,0);assert.equal(monthlySeries(a,'instagram','reach',today,today)[0].value,null);
 assert.equal(auditSocialAccount([run({clientId:'other'})],[],{workspaceId:'w',clientId:'c',businessId:'b',network:'instagram',profileUrl:'https://instagram.com/fixture/'}),undefined);
});
test('combined reports include only saved records for the same client/business and retain each source date',()=>{
 const child=run();const combined=run({channel:'combined',data:{kind:'combined',runs:[child]}});validateAuditRun(combined);assert.match(auditRunBlocks(combined).map(b=>b.text).join('\n'),/No se realizó una medición nueva/);
 for(const invalid of [{...child,clientId:'other'},{...child,businessId:'other'},{...child,workspaceId:'other'},{...child,savedAt:undefined},combined])assert.throws(()=>validateAuditRun({...combined,data:{kind:'combined',runs:[invalid]}}));
});
test('comparison rejects other clients and nonhomogeneous sources instead of inventing evolution',async()=>{
 const {compareAuditRuns}=await import('../../shared/compareAuditRuns');
 const a=run({observedAt:'2026-01-01T12:00:00Z',periodStart:'2026-01-01',periodEnd:'2026-01-01',data:{kind:'networks',network:'instagram',snapshot:{id:'jan',profileUrl:'https://www.instagram.com/fixture/',capturedAt:'2026-01-01T12:00:00Z',source:'public-web',evidence:'Test fixture only',followers:100,posts:[],periodStart:'2026-01-01',periodEnd:'2026-01-01'}}});
 const b=run();assert.equal(compareAuditRuns(a,b).comparable,true);assert.match(compareAuditRuns(a,b).text,/100 → 0/);
 assert.equal(compareAuditRuns(a,{...b,clientId:'other'}).comparable,false);assert.equal(compareAuditRuns(b,b).comparable,false);
});
