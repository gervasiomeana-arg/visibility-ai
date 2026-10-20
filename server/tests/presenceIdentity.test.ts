import test from 'node:test';
import assert from 'node:assert/strict';
import { assertPresenceIdentity, PresenceIdentityError, researchPresence } from '../presenceResearch';

const input={workspaceId:'qa-workspace',businessId:'qa-business',name:'Fixture',website:'https://fixture.example',market:'Argentina',language:'Español',device:'desktop',query:'Información pública verificable de Fixture',confirmedDescription:'Herramienta de scouting y estadísticas para entrenadores.'};
function response(url='https://fixture.example/services',title='Fixture') {
 const text='La fuente describe una herramienta para entrenadores.';
 return {candidates:[{content:{parts:[{text}]},groundingMetadata:{webSearchQueries:['fixture.example'],groundingChunks:[{web:{uri:url,title}}],groundingSupports:[{segment:{text},groundingChunkIndices:[0]}],searchEntryPoint:{renderedContent:'<div>Referencias de búsqueda</div>'}}}]};
}
test('Presence research supplies confirmed profile as data without treating it as public evidence',async()=>{
 let request:any;
 const result=await researchPresence(input,async params=>{request=params;return response();});
 assert.equal(JSON.parse(request.contents).confirmedDescription,input.confirmedDescription);
 assert.match(request.config.systemInstruction,/URL exacta/);
 assert.match(request.config.systemInstruction,/no prueba presencia pública/);
 assert.equal(result.result,'unreviewed');
 assert.equal(result.sources?.[0].url,'https://fixture.example/services');
 assert.equal(result.workspaceId,input.workspaceId);
 assert.equal(result.businessId,input.businessId);
});
test('Presence rejects malformed profile before calling the provider',async()=>{
 let called=false;
 for(const confirmedDescription of [42,{},'x'.repeat(4001)]){
  await assert.rejects(researchPresence({...input,confirmedDescription},async()=>{called=true;return response();}),/Descripción/);
 }
 assert.equal(called,false);
});
test('Ambiguous similar domains are not attributed to the client, including grounding redirect titles',async()=>{
 for(const host of ['open-volley.com','openvolley.app']){
  assert.throws(()=>assertPresenceIdentity('https://openvoley.com',[{url:`https://${host}/`,title:'A source'}]),PresenceIdentityError);
  await assert.rejects(researchPresence({...input,website:'https://openvoley.com'},async()=>response('https://vertexaisearch.cloud.google.com/grounding-api-redirect/fixture',host)),PresenceIdentityError);
 }
});
test('Identity ambiguity guard allows same host, its subdomains and unrelated third-party references',()=>{
 assert.doesNotThrow(()=>assertPresenceIdentity('https://www.openvoley.com',[
  {url:'https://openvoley.com/',title:'Open Voley'},
  {url:'https://docs.openvoley.com/',title:'Documentation'},
  {url:'https://news.example/story',title:'A third-party mention'},
  {url:'https://vertexaisearch.cloud.google.com/grounding-api-redirect/fixture',title:'Company review'},
 ]));
 assert.doesNotThrow(()=>assertPresenceIdentity('https://abc.example',[{url:'https://abd.example',title:'Short generic labels are not identity proof'}]));
});
