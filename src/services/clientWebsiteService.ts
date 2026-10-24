import {apiFetchJson} from './apiClient';
import {clientWebsiteUrl,type WebsiteInbox,type LeadStage} from '../../shared/clientWebsite';
async function request<T>(path:string,init:RequestInit={}){
 const {supabase}=await import('./authService');
 if(!supabase)throw new Error('Iniciá sesión en Visibility para ver las consultas.');
 const {data,error}=await supabase.auth.getSession();
 if(error||!data.session)throw new Error('La sesión venció. Volvé a iniciar sesión en Visibility.');
 return apiFetchJson<T>(clientWebsiteUrl+'/api/operator/leads'+path,{...init,headers:{...init.headers,Authorization:'Bearer '+data.session.access_token},credentials:'omit',redirect:'error',signal:AbortSignal.timeout(15000)});
}
export const clientWebsiteService={
 list(offset=0){return request<WebsiteInbox>('?offset='+offset);},
 update(id:string,status:LeadStage){return request<{ok:boolean}>('',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,status})});},
};
