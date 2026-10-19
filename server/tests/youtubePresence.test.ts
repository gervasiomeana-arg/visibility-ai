import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {PresenceEvidence} from '../../src/components/PresenceEvidence';
import test from 'node:test';
import assert from 'node:assert/strict';
import {collectYouTube} from '../youtubePublic';
import {publicProfileUrl,validatePublicSnapshot,type SocialAccount} from '../../shared/socialMetrics';
import {monthlySeries} from '../../shared/socialMonthly';
import {socialReportRows} from '../../shared/socialReport';
import {discoverSocialLinks,publicResearchInput} from '../publicSocialResearch';
import {validatePresenceObservation,scopedPresence,type PresenceObservation} from '../../shared/presenceAnalysis';
import {researchPresence} from '../presenceResearch';
const channel='UCabcdefghijklmnopqrstuv',profile='https://www.youtube.com/@fixture/';
const day=new Date().toISOString().slice(0,10);
test('YouTube canonical identity supports handles and channel IDs, rejects videos, external hosts and credentials',()=>{
 assert.equal(publicProfileUrl('youtube','https://youtube.com/@Fixture?si=x'),profile);
 assert.equal(publicProfileUrl('youtube',`https://youtube.com/channel/${channel}`),`https://www.youtube.com/channel/${channel}/`);
 for(const url of ['https://youtube.com/watch?v=x','https://youtu.be/123','https://youtube.com/shorts/x','https://youtube.com.evil.com/@fixture','https://secret@youtube.com/@fixture','https://youtube.com:444/@fixture'])assert.throws(()=>publicProfileUrl('youtube',url));
 assert.equal(publicResearchInput({network:'youtube',profileUrl:profile,start:day,end:day}).network,'youtube');
 assert.equal(discoverSocialLinks(`<a href="${profile}">Channel</a><a href="https://youtube.com/watch?v=x">Video</a>`,'https://fixture.example').length,1);
});
test('YouTube uses fixed API, no client password, no invented monthly views or reach, public subscription precision retained',async()=>{
 const s=await collectYouTube(profile,day,day,async(url,init)=>{
  const u=new URL(String(url));assert.equal(u.origin,'https://www.googleapis.com');assert.equal(u.pathname,'/youtube/v3/channels');assert.equal(u.searchParams.get('forHandle'),'@fixture');assert.equal(init?.redirect,'error');assert.ok(init?.signal);
  return Response.json({items:[{id:channel,statistics:{hiddenSubscriberCount:false,subscriberCount:'123000',videoCount:'25',viewCount:'999999999'}}]});
 },'test-only-key');
 assert.equal(s.followers,123000);assert.equal(s.totalPosts,25);assert.match(s.evidence,/redondeados/);assert.equal('views' in s,false);assert.equal('reach' in s,false);assert.deepEqual(s.posts,[]);
 const a:SocialAccount={workspaceId:'w',businessId:'b',network:'youtube',profileUrl:profile,accountId:'',measurements:[],publicProfiles:[{role:'own',name:'Fixture',profileUrl:profile,confirmed:true,snapshots:[s]}]};
 assert.equal(monthlySeries(a,'youtube','followers',day,day)[0].value,123000);
 assert.equal(monthlySeries(a,'youtube','views',day,day)[0].value,null);assert.equal(monthlySeries(a,'youtube','reach',day,day)[0].value,null);
 const r=socialReportRows([a],'w','b').find(r=>r.network==='youtube');assert.equal(r?.followers,123000);assert.match(r?.source || '',/YouTube/);
 assert.throws(()=>validatePublicSnapshot('instagram',{...s,profileUrl:'https://instagram.com/fixture/'}));
});
test('YouTube hidden subscribers remain missing and provider failures never expose key or trigger HTML fallback',async()=>{
 const s=await collectYouTube(profile,day,day,async()=>Response.json({items:[{id:channel,statistics:{hiddenSubscriberCount:true,subscriberCount:'100',videoCount:'0'}}]}),'test-only-key');
 assert.equal(s.followers,undefined);assert.equal(s.totalPosts,0);
 let calls=0;await assert.rejects(collectYouTube(profile,day,day,async()=>{calls++;return new Response('secret',{status:403});},'test-only-key'),e=>{assert.doesNotMatch(String(e),/test-only-key|secret/);return true;});assert.equal(calls,1);
 await assert.rejects(collectYouTube(profile,day,day,async()=>{throw Error('should not fetch');},''),/YOUTUBE_API_KEY/);
 await assert.rejects(collectYouTube(profile,day,day,async()=>Response.json({items:[]}),'key'),/único canal/);
});
const record:PresenceObservation={id:'r',workspaceId:'w',businessId:'b',platform:'google',query:'fixture business',market:'Uruguay',language:'Español',device:'desktop',observedAt:'2026-01-01T12:00:00Z',method:'manual',result:'found',position:4,evidenceUrl:'https://google.com/search?q=fixture',excerpt:'Operator checked the fourth organic result for this query.',recommendation:'Revisar la descripción del servicio.'};
test('Presence isolates scope and distinguishes absent observations from zero or AI rankings',()=>{
 assert.equal(validatePresenceObservation(record).position,4);
 assert.deepEqual(scopedPresence([record,{...record,businessId:'other'},{...record,workspaceId:'other'}],'w','b'),[record]);
 for(const patch of [{platform:'chatgpt'},{result:'not-observed'},{position:0},{evidenceUrl:'http://127.0.0.1/x'},{method:'gemini-api'},{observedAt:'2999-01-01'}])assert.throws(()=>validatePresenceObservation({...record,...patch} as PresenceObservation));
});
test('Gemini grounded response stays Gemini pending review; it never measures ChatGPT, Claude or a Google position',async()=>{
 const segment='The source describes a public service relevant to the query.';
 const response={candidates:[{content:{parts:[{text:segment}]},groundingMetadata:{webSearchQueries:['fixture services'],groundingChunks:[{web:{uri:'https://fixture.example/services',title:'Fixture'}}],groundingSupports:[{segment:{text:segment},groundingChunkIndices:[0]}],searchEntryPoint:{renderedContent:'<div>Search references</div>'}}}]};
 const r=await researchPresence({...record,name:'Fixture',website:'https://fixture.example',query:record.query},async()=>response);
 assert.equal(r.platform,'gemini');assert.equal(r.method,'gemini-api');assert.equal(r.result,'unreviewed');assert.equal(r.position,undefined);assert.equal(r.sources?.length,1);assert.match(r.excerpt,/public service/);
 await assert.rejects(researchPresence({...record,name:'Fixture',website:'https://fixture.example'},async()=>({candidates:[{content:{parts:[{text:'Unsupported answer'}]}}]})),/fuentes/);
});

test('Evidence rendering includes provider, date, query and citation URLs as PDF-readable paragraphs',()=>{
 const html=renderToStaticMarkup(React.createElement(PresenceEvidence,{rows:[{...record,platform:'gemini',method:'gemini-api',result:'unreviewed',position:undefined,model:'test-model',excerpt:'<script>untrusted evidence</script>',sources:[{title:'Source',url:'https://fixture.example/reference'}]}]}));
 assert.match(html,/pendiente de revisión/);assert.match(html,/API Gemini/);assert.match(html,/no equivale a la interfaz/);assert.match(html,/2026-01-01T12:00:00Z/);assert.match(html,/fixture.example\/reference/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);
});
