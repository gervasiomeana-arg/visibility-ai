import { propertyMatchesBusiness } from './searchConsoleDiagnostics';
export const searchConsolePeriods = [28,90,365] as const;
export type SearchConsolePeriod = typeof searchConsolePeriods[number];
export function searchConsoleWindow(days:number, now=new Date()) {
  if(!searchConsolePeriods.includes(days as SearchConsolePeriod)||!Number.isFinite(now.getTime()))throw new Error('Elegí 28, 90 o 365 días.');
  const end=new Date(now);end.setUTCDate(end.getUTCDate()-2);
  const start=new Date(end);start.setUTCDate(start.getUTCDate()-(days-1));
  return {startDate:start.toISOString().slice(0,10),endDate:end.toISOString().slice(0,10)};
}
export interface SearchConsoleResultSummary {siteUrl:string;startDate:string;endDate:string;rowCount:number;restored?:boolean;loadedAt?:string}
export function restoreSearchConsoleSummary(meta:any,businessUrl:string,selectedSite:string):SearchConsoleResultSummary|null {
  if(!meta||meta.siteUrl!==selectedSite||!propertyMatchesBusiness(meta.siteUrl,businessUrl)||!Number.isSafeInteger(meta.rowCount)||meta.rowCount<0||meta.rowCount>100||typeof meta.loadedAt!=='string'||!Number.isFinite(Date.parse(meta.loadedAt)))return null;
  for(const value of [meta.startDate,meta.endDate]){
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
    const date=new Date(value+'T00:00:00Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)return null;
  }
  if(meta.startDate>meta.endDate)return null;
  return {siteUrl:meta.siteUrl,startDate:meta.startDate,endDate:meta.endDate,rowCount:meta.rowCount,loadedAt:meta.loadedAt,restored:true};
}
