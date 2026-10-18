import crypto from 'node:crypto';
import { calendarDay, publicProfileUrl, validatePublicSnapshot, type PublicPost, type PublicSnapshot } from '../shared/socialMetrics';

const messages = {
  'not-configured': 'Falta configurar la cuenta propia de Visibility para Instagram Business Discovery. No se necesita la clave del cliente.',
  'operator-not-authorized': 'Esta cuenta de Visibility no está autorizada a usar la conexión de investigación de Instagram.',
  'token-expired': 'La autorización de la cuenta propia de Visibility venció o no es válida. Debe renovarla el administrador; no el cliente.',
  permissions: 'Meta rechazó los permisos de Business Discovery de la cuenta propia de Visibility. Revisá la aplicación, los permisos y su nivel de acceso.',
  'rate-limited': 'Meta alcanzó el límite de consultas de Business Discovery. La solicitud se detuvo sin reintentos.',
  'profile-unavailable': 'Meta no devolvió datos del perfil solicitado. Business Discovery requiere una cuenta profesional Business o Creator compatible; no cubre todas las cuentas personales.',
  'identity-mismatch': 'Meta devolvió otro perfil o no confirmó su identidad. No se guardaron sus contadores.',
  'invalid-response': 'Meta no entregó contadores enteros válidos del perfil solicitado.',
  network: 'No se completó la conexión con Instagram Business Discovery. No se modificaron las mediciones guardadas.',
  'provider-error': 'Instagram Business Discovery rechazó la consulta. Revisá la configuración de la aplicación propia de Visibility.',
} as const;
export class InstagramDiscoveryError extends Error {
  constructor(readonly code:keyof typeof messages) { super(messages[code]); this.name='InstagramDiscoveryError'; }
}
export function getInstagramDiscoveryConfig(env:NodeJS.ProcessEnv=process.env) {
  const version=env.META_GRAPH_API_VERSION||'',ownIgUserId=env.META_DISCOVERY_IG_USER_ID||'',accessToken=env.META_DISCOVERY_ACCESS_TOKEN||'',operatorUserId=env.META_DISCOVERY_OPERATOR_USER_ID||'';
  const missing:string[]=[];
  if(!/^v\d+\.0$/.test(version))missing.push('META_GRAPH_API_VERSION');
  if(!/^\d{1,32}$/.test(ownIgUserId))missing.push('META_DISCOVERY_IG_USER_ID');
  if(!accessToken.trim()||accessToken.length>10000||/[\s\r\n]/.test(accessToken)||accessToken.startsWith('MY_'))missing.push('META_DISCOVERY_ACCESS_TOKEN');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(operatorUserId))missing.push('META_DISCOVERY_OPERATOR_USER_ID');
  return {configured:missing.length===0,missing,version,ownIgUserId,accessToken,operatorUserId};
}
export function instagramDiscoveryStatus(userId:string,env:NodeJS.ProcessEnv=process.env) {
  const c=getInstagramDiscoveryConfig(env);
  return {configured:c.configured,missing:c.missing,operatorAllowed:c.configured&&c.operatorUserId===userId,method:'instagram-business-discovery',requiresClientPassword:false};
}
export async function discoverInstagramBusiness(profile:string,start:string,end:string,userId:string,fetcher:typeof fetch=fetch,env:NodeJS.ProcessEnv=process.env):Promise<PublicSnapshot> {
  const config=getInstagramDiscoveryConfig(env);
  if(!config.configured)throw new InstagramDiscoveryError('not-configured');
  if(config.operatorUserId!==userId)throw new InstagramDiscoveryError('operator-not-authorized');
  const profileUrl=publicProfileUrl('instagram',profile),username=new URL(profileUrl).pathname.split('/').filter(Boolean)[0];
  if(!/^[a-z0-9_.]{1,30}$/i.test(username))throw new InstagramDiscoveryError('profile-unavailable');
  const valid=(value:unknown)=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;
  const deadline=Date.now()+25000;
  async function page(after?:string){
    const endpoint=new URL(`https://graph.facebook.com/${config.version}/${config.ownIgUserId}`);
    endpoint.searchParams.set('fields',`business_discovery.username(${username}){id,username,followers_count,media_count,media.limit(100)${after?`.after(${after})`:''}{id,permalink,timestamp,like_count,comments_count}}`);
    let response:Response,data:any;
    try {
      response=await fetcher(endpoint.href,{headers:{authorization:`Bearer ${config.accessToken}`,accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(Math.max(1,Math.min(20000,deadline-Date.now())))});
      data=await response.json();
    }catch{throw new InstagramDiscoveryError('network');}
    const code=data?.error?.code;
    if(response.status===429||[4,17,32,613,80004].includes(code))throw new InstagramDiscoveryError('rate-limited');
    if(code===190)throw new InstagramDiscoveryError('token-expired');
    if(response.status===401||response.status===403||[10,200].includes(code))throw new InstagramDiscoveryError('permissions');
    if(code===100)throw new InstagramDiscoveryError('profile-unavailable');
    if(!response.ok||data?.error)throw new InstagramDiscoveryError('provider-error');
    const target=data?.business_discovery;
    if(!target)throw new InstagramDiscoveryError('profile-unavailable');
    if(data.id!==config.ownIgUserId||typeof target.username!=='string'||target.username.toLowerCase()!==username||!/^\d+$/.test(target.id||''))throw new InstagramDiscoveryError('identity-mismatch');
    if(!valid(target.followers_count)||!valid(target.media_count))throw new InstagramDiscoveryError('invalid-response');
    return target;
  }
  const first=await page(), capturedAt=new Date().toISOString(),posts:PublicPost[]=[],seen=new Set<string>(),cursors=new Set<string>();
  let target=first, pages=0,examined=0,rejected=0, reason:NonNullable<PublicSnapshot['coverage']>['reason']='page-limit';
  const allMedia=new Set<string>();
  // Rebuild every request on the fixed Graph origin. Never fetch paging.next,
  // store cursors/tokens, or assume time ordering (pinned posts may be old).
  for(;;){
    pages++;
    if(!Array.isArray(target.media?.data)){reason='missing-media';break;}
    if(target.id!==first.id||target.media_count!==first.media_count){reason='count-mismatch';break;}
    for(const media of target.media.data.slice(0,100)){
      examined++;
      if(typeof media.timestamp!=='string'||!Number.isFinite(Date.parse(media.timestamp))){rejected++;continue;}
      const day=new Date(media.timestamp).toISOString().slice(0,10);
      if(!calendarDay(day)||day>capturedAt.slice(0,10)){rejected++;continue;}
      try{
        const link=new URL(media.permalink);
        if(link.protocol!=='https:'||link.hostname.replace(/^www\./,'')!=='instagram.com'||link.username||link.password||link.port||!/^\/(p|reel)\/[A-Za-z0-9_-]+\/?$/.test(link.pathname)){rejected++;continue;}
        const url=`https://www.instagram.com${link.pathname.replace(/\/$/,'')}/`;
        allMedia.add(url);
        if(day<start||day>end||seen.has(url))continue;seen.add(url);
        posts.push({url,publishedAt:day,...(valid(media.like_count)?{likes:media.like_count}:{}),...(valid(media.comments_count)?{comments:media.comments_count}:{})});
      }catch{rejected++;}
    }
    if(target.media.data.length>100){reason='invalid-media';break;}
    if(!target.media.paging?.next){
      reason=rejected?'invalid-media':allMedia.size!==first.media_count||allMedia.size!==examined?'count-mismatch':'exhausted';break;
    }
    if(pages>=5){reason='page-limit';break;}
    if(Date.now()>=deadline){reason='time-limit';break;}
    const cursor=target.media.paging?.cursors?.after;
    if(typeof cursor!=='string'||! /^[A-Za-z0-9_=-]{1,2048}$/.test(cursor)||cursors.has(cursor)){reason='invalid-cursor';break;}
    cursors.add(cursor);
    try{target=await page(cursor);}catch{reason=Date.now()>=deadline?'time-limit':'provider-error';break;}
  }
  const coverage:NonNullable<PublicSnapshot['coverage']>={status:reason==='exhausted'?'complete-available':'partial',reason,pages,examined,rejected};
  return validatePublicSnapshot('instagram',{id:crypto.randomUUID(),profileUrl,capturedAt,source:'official-public-api',evidence:`Meta Graph ${config.version} · Instagram Business Discovery · @${username} · ${pages} páginas, ${examined} elementos examinados; ${coverage.status==='complete-available'?'recorrido agotado y recuento conciliado con la API':'cobertura parcial'} (${reason}). Publicaciones filtradas por fecha, sin Insights privados ni archivo de contenido eliminado. Autorización propia de Visibility.`,followers:first.followers_count,totalPosts:first.media_count,posts,periodStart:start,periodEnd:end,coverage});
}
