import test from 'node:test';
import assert from 'node:assert/strict';
import { exactPublicCount, publicMetadataCounts } from '../publicSocialMetadata';
import { collectPublicProfile, parsePublicSocialHtml, publicResearchInput } from '../publicSocialResearch';
const url='https://www.instagram.com/fixture_business/';
const page=(description:string,canonical=url)=>`<html><head><link rel="canonical" href="${canonical}"><meta property="og:url" content="${canonical}"><meta property="og:description" content="${description}"></head><body>Fixture, not client data</body></html>`;

test('exact public counters accept integer group separators but reject abbreviations, decimals and unsafe numbers',()=>{
 for(const [value,expected] of [[0,0],['0',0],['1,234',1234],['1.234.567',1234567],['1 234',1234],['1\u202f234',1234]] as const) assert.equal(exactPublicCount(value),expected);
 for(const value of ['1.2K','1,2 mil','1.2','1,23','1,234.567','12 million',-1,null,'9007199254740992']) assert.equal(exactPublicCount(value),undefined);
});
test('profile metadata can supply exact counts when no script JSON is available',()=>{
 const data=publicMetadataCounts('instagram',url,page('1,234 Followers, 8 Following, 56 Posts'));
 assert.equal(data.followers,1234); assert.equal(data.totalPosts,56);
 const snapshot=parsePublicSocialHtml('instagram',url,page('1,234 Followers, 8 Following, 56 Posts'),'2026-01-01','2026-10-17','2026-10-17T20:00:00Z')!;
 assert.equal(snapshot.followers,1234); assert.equal(snapshot.posts.length,0); assert.equal(snapshot.capturedAt,'2026-10-17T20:00:00Z');
 assert.match(snapshot.evidence,/metadatos públicos/); assert.equal(snapshot.source,'public-web');
});
test('Spanish, Portuguese and French labels and entity separators are read without inventing counts',()=>{
 for(const description of ['2.345 seguidores, 17 publicaciones','2.345 seguidores, 17 publicações','2&#8239;345 abonnés, 17 publications']) {
  const data=publicMetadataCounts('instagram',url,page(description)); assert.equal(data.followers,2345); assert.equal(data.totalPosts,17);
 }
});
test('unknown abbreviations remain unknown and do not match trailing digits',()=>{
 for(const text of ['1.2K Followers, 3M Posts','aprox. 1,2 mil seguidores','12K Followers, 1.2K Posts']) {
  const data=publicMetadataCounts('instagram',url,page(text)); assert.equal(data.followers,undefined); assert.equal(data.totalPosts,undefined);
 }
});
test('exact identity is mandatory; login, other profiles, body text and commented metadata cannot supply counts',()=>{
 for(const html of [page('999 Followers','https://www.instagram.com/other/'),page('999 Followers','https://www.instagram.com/accounts/login/'),'<html><head><meta name="description" content="999 Followers"></head></html>',`<html><head><link rel="canonical" href="${url}"></head><body>999 Followers</body></html>`,`<html><head><link rel="canonical" href="${url}"><!--<meta property="og:description" content="999 Followers">--></head></html>`,page('999 Followers').replace('</head>',`<meta property="og:url" content="https://www.instagram.com/other/"></head>` )]) assert.equal(publicMetadataCounts('instagram',url,html).followers,undefined);
});
test('conflicting description counts are not silently resolved and duplicated tags stay one count',()=>{
 const conflict=page('12 Followers').replace('</head>','<meta name="description" content="13 Followers"></head>');
 assert.equal(publicMetadataCounts('instagram',url,conflict).followers,undefined);
 const duplicate=page('12 Followers').replace('</head>','<meta name="description" content="12 Followers"></head>');
 assert.equal(publicMetadataCounts('instagram',url,duplicate).followers,12);
});
test('Facebook metadata identifies exact page and does not treat likes as followers',()=>{
 const fb='https://www.facebook.com/fixture_business/';
 assert.equal(publicMetadataCounts('facebook',fb,page('4,321 followers, 3,210 likes',fb)).followers,4321);
 assert.equal(publicMetadataCounts('facebook',fb,page('3,210 likes',fb)).followers,undefined);
});
test('TikTok universal data statsV2 exact numeric strings remain scoped to the identified user',()=>{
 const tiktok='https://www.tiktok.com/@fixture_business/';
 const html=`<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">${JSON.stringify({__DEFAULT_SCOPE__:{'webapp.user-detail':{userInfo:{user:{uniqueId:'fixture_business'},statsV2:{followerCount:'18',videoCount:'2'}}}},other:{user:{uniqueId:'other'},statsV2:{followerCount:'999'}}})}</script>`;
 const snapshot=parsePublicSocialHtml('tiktok',tiktok,html,'2026-01-01','2026-10-17','2026-10-17T20:00:00Z')!;
 assert.equal(snapshot.followers,18); assert.equal(snapshot.totalPosts,2);
});
test('one public read reaches metadata extraction; login response stops with no second endpoint, credentials or fabricated totals',async()=>{
 const input=publicResearchInput({network:'instagram',profileUrl:url,start:'2026-01-01',end:'2026-10-17'});
 let calls=0;
 const data=await collectPublicProfile(input,async(target)=>{calls++;assert.equal(target,url);return {html:page('12 Followers'),finalUrl:url,fetchedAt:'2026-10-17T20:00:00Z'} as any;});
 assert.equal(calls,1);assert.equal(data.status,'measured'); assert.equal(data.snapshot?.followers,12);
 calls=0;
 const blocked=await collectPublicProfile(input,async()=>{calls++;return {html:page('999 Followers'),finalUrl:'https://www.instagram.com/accounts/login/',fetchedAt:'2026-10-17T20:00:00Z'} as any;});
 assert.equal(calls,1);assert.equal(blocked.status,'unavailable'); assert.equal(blocked.snapshot,undefined);
});
