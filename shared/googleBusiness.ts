export const googleBusinessScope='https://www.googleapis.com/auth/business.manage';
export interface GoogleBusinessLocation {name:string;title:string;websiteUri?:string;phone?:string;address?:string;category?:string;hours?:string;mapsUri?:string;}
export interface GoogleBusinessSnapshot {source:'google-business-profile';observedAt:string;account:string;location:GoogleBusinessLocation;}
export function googleResource(value:unknown,kind:'accounts'|'locations'):string {
 if(typeof value!=='string'||!new RegExp(`^${kind}/[0-9]+$`).test(value))throw new Error('Seleccioná un identificador válido de Google Business Profile.');return value;
}
const optionalText=(v:unknown,max=5000)=>v===undefined||(typeof v==='string'&&v.length<=max);
export function validateGoogleLocation(v:any):GoogleBusinessLocation{
 googleResource(v?.name,'locations');if(typeof v.title!=='string'||!v.title.trim()||v.title.length>300||!['websiteUri','phone','address','category','hours','mapsUri'].every(k=>optionalText(v[k])))throw new Error('Google devolvió una ficha incompleta; no se guardó como dato verificado.');
 for(const key of ['websiteUri','mapsUri'])if(v[key]){const u=new URL(v[key]);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw new Error('La ficha contiene un enlace inválido.');}
 return {name:v.name,title:v.title,...Object.fromEntries(['websiteUri','phone','address','category','hours','mapsUri'].filter(k=>v[k]!==undefined).map(k=>[k,v[k]]))};
}
export function validateGoogleBusinessSnapshot(v:GoogleBusinessSnapshot){
 if(v?.source!=='google-business-profile'||!Number.isFinite(Date.parse(v.observedAt))||Date.parse(v.observedAt)>Date.now())throw new Error('La observación de Google Business Profile no es válida.');googleResource(v.account,'accounts');validateGoogleLocation(v.location);return v;
}
