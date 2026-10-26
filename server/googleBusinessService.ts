import {googleResource,validateGoogleLocation,type GoogleBusinessLocation} from '../shared/googleBusiness';
export class GoogleBusinessError extends Error {constructor(public status:number,public code:string,message:string){super(message);}}
export async function businessGet(url:URL,accessToken:string,fetcher:typeof fetch=fetch){
 if(!['mybusinessaccountmanagement.googleapis.com','mybusinessbusinessinformation.googleapis.com'].includes(url.hostname)||url.protocol!=='https:')throw new Error('Destino de Google no permitido.');
 const r=await fetcher(url,{headers:{authorization:`Bearer ${accessToken}`},redirect:'error',signal:AbortSignal.timeout(20000)});
 if(!r.ok){let reason='';try{const body:any=await r.json();reason=JSON.stringify(body?.error?.details||[]);}catch{}
 if(r.status===401)throw new GoogleBusinessError(401,'authorization','Google rechazó la autorización. Volvé a conectar Business Profile.');
 if(reason.includes('SERVICE_DISABLED'))throw new GoogleBusinessError(503,'api_disabled','Habilitá las APIs My Business Account Management y My Business Business Information en el proyecto de Google Cloud.');
 if(r.status===429)throw new GoogleBusinessError(429,'quota','Google rechazó la consulta por cuota de Business Profile. Revisá en Google Cloud las cuotas de My Business Account Management y My Business Business Information del proyecto del cliente OAuth. Si la cuota es 0, solicitá aprobación de acceso a Business Profile; habilitar las APIs no concede esa aprobación. Si la cuota es mayor que 0, revisá el consumo antes de reintentar. Los informes guardados se conservan.');
 if(r.status===403)throw new GoogleBusinessError(403,'permission','Google no autorizó esta consulta. Revisá el permiso business.manage, acceso a la ficha y aprobación del proyecto para las APIs de Business Profile.');
 throw new GoogleBusinessError(502,'provider','Google Business Profile no respondió correctamente. Los informes guardados se conservan.');}
 const body:any=await r.json();if(!body||typeof body!=='object'||Array.isArray(body)||body.error)throw new Error('Respuesta inválida de Google Business Profile.');return body;
}
async function list(url:URL,field:string,token:string,fetcher:typeof fetch){const all:any[]=[];const seen=new Set<string>();for(let page=0;page<20;page++){
 const b=await businessGet(url,token,fetcher);if(!(field in b)&&Object.keys(b).some(k=>!['nextPageToken','totalSize'].includes(k)))throw new Error('Respuesta de lista inválida de Google.');if(b[field]!==undefined&&!Array.isArray(b[field]))throw new Error('Respuesta de lista inválida de Google.');all.push(...(b[field]||[]));if(!b.nextPageToken)return all;
 if(typeof b.nextPageToken!=='string'||seen.has(b.nextPageToken))throw new Error('Paginación inválida de Google.');seen.add(b.nextPageToken);url.searchParams.set('pageToken',b.nextPageToken);
 }throw new Error('La lista supera el límite de consulta; no se presenta como completa.');}
export async function listBusinessAccounts(token:string,fetcher:typeof fetch=fetch){
 const u=new URL('https://mybusinessaccountmanagement.googleapis.com/v1/accounts');u.searchParams.set('pageSize','20');return (await list(u,'accounts',token,fetcher)).map(a=>{googleResource(a?.name,'accounts');if(typeof a.accountName!=='string'||!a.accountName.trim())throw new Error('Cuenta de Google incompleta.');return {name:a.name,accountName:a.accountName};});
}
export async function listBusinessLocations(token:string,account:string,fetcher:typeof fetch=fetch):Promise<GoogleBusinessLocation[]>{
 googleResource(account,'accounts');const u=new URL(`https://mybusinessbusinessinformation.googleapis.com/v1/${account}/locations`);u.searchParams.set('pageSize','100');u.searchParams.set('readMask','name,title,websiteUri,phoneNumbers,storefrontAddress,categories,regularHours,metadata');
 return (await list(u,'locations',token,fetcher)).map(v=>validateGoogleLocation({name:v?.name,title:v?.title,websiteUri:v?.websiteUri,phone:v?.phoneNumbers?.primaryPhone,address:v?.storefrontAddress?[...(v.storefrontAddress.addressLines||[]),v.storefrontAddress.locality,v.storefrontAddress.administrativeArea,v.storefrontAddress.postalCode,v.storefrontAddress.regionCode].filter(Boolean).join(', '):undefined,category:v?.categories?.primaryCategory?.displayName,hours:v?.regularHours?JSON.stringify(v.regularHours):undefined,mapsUri:v?.metadata?.mapsUri}));
}
