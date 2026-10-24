import test from 'node:test';import assert from 'node:assert/strict';import {once}from'node:events';import type{AddressInfo}from'node:net';import express from'express';import router from'../clientWebsiteRouter';import{clientWebsiteUrl}from'../../shared/clientWebsite';
test('the promotional shortcut is public, preserves supported languages and cannot redirect to user input',async()=>{
 const app=express();app.use('/web',router);app.get('*',(_req,res)=>res.send('private-app'));
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');const url='http://127.0.0.1:'+(server.address()as AddressInfo).port;
 try{
  for(const [path,language]of[['/web','es'],['/web/','es'],['/web/en','en'],['/web/pt','pt'],['/web/fr','fr'],['/web?next=https://other.example/&token=fixture','es']]){
   const response=await fetch(url+path,{redirect:'manual'});assert.equal(response.status,302);assert.equal(response.headers.get('location'),clientWebsiteUrl+'/'+language);assert.equal(response.headers.get('cache-control'),'no-store');
  }
  assert.equal((await fetch(url+'/web/unknown',{redirect:'manual'})).status,404);
  assert.equal(await(await fetch(url+'/')).text(),'private-app');
 }finally{await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
});
