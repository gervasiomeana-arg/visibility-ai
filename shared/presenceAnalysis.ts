import { researchSourceUrl } from './competitorResearch';
export const presencePlatforms = { google:'Google', bing:'Bing', duckduckgo:'DuckDuckGo', chatgpt:'ChatGPT', claude:'Claude', gemini:'Gemini', perplexity:'Perplexity' } as const;
export type PresencePlatform = keyof typeof presencePlatforms;
export const searchPlatforms: PresencePlatform[] = ['google','bing','duckduckgo'];
export interface PresenceObservation {
  id:string; workspaceId:string; businessId:string; platform:PresencePlatform;
  query:string; market:string; language:string; device:'desktop'|'mobile'; observedAt:string;
  method:'manual'|'gemini-api'; result:'found'|'not-observed'|'unreviewed';
  position?:number; evidenceUrl:string; excerpt:string; recommendation:string;
  model?:string; sources?:{url:string;title:string}[]; queries?:string[]; suggestionsHtml?:string;
}
export function validatePresenceObservation(value:PresenceObservation):PresenceObservation {
  if(!value || !value.id || !value.workspaceId || !value.businessId || !Object.hasOwn(presencePlatforms,value.platform) || !['manual','gemini-api'].includes(value.method) || !['found','not-observed','unreviewed'].includes(value.result) || !['desktop','mobile'].includes(value.device)) throw new Error('Seleccioná cliente, plataforma y método válidos.');
  for(const [key,min,max] of [['query',3,500],['market',2,120],['language',2,60],['excerpt',15,12000],['recommendation',0,2000]] as const) if(typeof value[key]!=='string'||value[key].trim().length<min||value[key].length>max) throw new Error('Indicá consulta, país/ciudad, idioma y evidencia textual suficiente.');
  if(typeof value.observedAt!=='string'||!Number.isFinite(Date.parse(value.observedAt))||Date.parse(value.observedAt)>Date.now())throw new Error('Indicá una fecha de observación válida, sin fechas futuras.');
  if(!researchSourceUrl(value.evidenceUrl))throw new Error('La evidencia debe tener una URL pública válida.');
  if(value.position!==undefined && (!searchPlatforms.includes(value.platform)||value.result!=='found'||value.method!=='manual'||!Number.isSafeInteger(value.position)||value.position<1||value.position>100)) throw new Error('La posición orgánica solo se registra al comprobarla en un buscador (1–100).');
  if(value.method==='gemini-api' && (value.platform!=='gemini'||value.result!=='unreviewed'||!value.model||!value.sources?.length||!value.queries?.length))throw new Error('La consulta automática corresponde a Gemini y requiere fuentes para revisión.');
  if(value.sources && (value.sources.length>50||value.sources.some(s=>!researchSourceUrl(s.url)||typeof s.title!=='string'||s.title.length>200)))throw new Error('Referencias no válidas.');
  if(value.suggestionsHtml!==undefined && (typeof value.suggestionsHtml!=='string'||value.suggestionsHtml.length>100000))throw new Error('Referencia de búsqueda no válida.');
  return value;
}
export function presenceQueryUrl(platform:PresencePlatform,query:string) {
  const q=encodeURIComponent(query);
  return {google:`https://www.google.com/search?q=${q}`,bing:`https://www.bing.com/search?q=${q}`,duckduckgo:`https://duckduckgo.com/?q=${q}`,chatgpt:`https://chatgpt.com/?q=${q}`,claude:'https://claude.ai/new',gemini:'https://gemini.google.com/app',perplexity:`https://www.perplexity.ai/search?q=${q}`}[platform];
}
export function scopedPresence(rows:PresenceObservation[],workspaceId:string,businessId:string) {
  return rows.filter(r=>{try {validatePresenceObservation(r);return r.workspaceId===workspaceId&&r.businessId===businessId;}catch{return false;}}).sort((a,b)=>Date.parse(b.observedAt)-Date.parse(a.observedAt));
}

/** Changing any research condition invalidates the pending response, never relabels its evidence. */
export function samePresenceContext(value:PresenceObservation,context:{workspaceId:string;businessId:string;query:string;market:string;language:string;device:string;platform?:PresencePlatform}) {
 return value.workspaceId===context.workspaceId && value.businessId===context.businessId && value.query===context.query.trim() && value.market===context.market.trim() && value.language.trim()===context.language.trim() && value.device===context.device && (!context.platform || value.platform===context.platform);
}
