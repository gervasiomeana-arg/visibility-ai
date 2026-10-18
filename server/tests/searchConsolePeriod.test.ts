import test from 'node:test';
import assert from 'node:assert/strict';
import { searchConsoleWindow, restoreSearchConsoleSummary } from '../../shared/searchConsolePeriod';

test('28, 90 and 365 day windows are inclusive and omit the last two UTC dates',()=>{
 const now=new Date('2026-10-18T20:49:00Z');
 assert.deepEqual(searchConsoleWindow(28,now),{startDate:'2026-09-19',endDate:'2026-10-16'});
 for(const days of [28,90,365]){
  const w=searchConsoleWindow(days,now);
  assert.equal((Date.parse(w.endDate)-Date.parse(w.startDate))/86400000+1,days);
  assert.equal(w.endDate,'2026-10-16');
 }
 assert.deepEqual(searchConsoleWindow(28,new Date('2024-03-02T00:30:00Z')),{startDate:'2024-02-02',endDate:'2024-02-29'});
 for(const days of [0,1,NaN,366])assert.throws(()=>searchConsoleWindow(days,now));
});
const meta={siteUrl:'sc-domain:example.com',startDate:'2026-09-19',endDate:'2026-10-16',loadedAt:'2026-10-18T20:49:00Z',rowCount:0};
test('an explicitly empty stored result survives reload without inventing a fresh query or cloud save',()=>{
 const restored=restoreSearchConsoleSummary(JSON.parse(JSON.stringify(meta)),'https://example.com','sc-domain:example.com');
 assert.equal(restored?.rowCount,0);assert.equal(restored?.restored,true);assert.equal(restored?.loadedAt,meta.loadedAt);assert.equal('cloud' in restored!,false);
});
test('restore rejects another business/property, legacy missing counts and malformed dates',()=>{
 assert.equal(restoreSearchConsoleSummary(meta,'https://other.test',meta.siteUrl),null);
 assert.equal(restoreSearchConsoleSummary(meta,'https://example.com','https://example.com/'),null);
 for(const patch of [{rowCount:undefined},{rowCount:null},{rowCount:-1},{rowCount:101},{rowCount:'0'},{startDate:'2026-02-30'},{endDate:'2026-01-01'},{loadedAt:'invalid'}])assert.equal(restoreSearchConsoleSummary({...meta,...patch},'https://example.com',meta.siteUrl),null);
 assert.equal(restoreSearchConsoleSummary({...meta,rowCount:5},'https://www.example.com',meta.siteUrl)?.rowCount,5);
});
