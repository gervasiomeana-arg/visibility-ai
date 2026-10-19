import {publicProfileUrl,type PublicNetwork,type SocialAccount} from './socialMetrics';
import {validateAuditRun,type AuditRun} from './auditRun';
export function auditSocialAccount(runs:AuditRun[],legacy:SocialAccount[],context:{workspaceId:string;businessId:string;clientId:string;network:PublicNetwork;profileUrl:string}):SocialAccount|undefined {
 let profileUrl:string;try{profileUrl=publicProfileUrl(context.network,context.profileUrl);}catch{return undefined;}
 const previous=legacy.find(a=>a.workspaceId===context.workspaceId&&a.businessId===context.businessId&&a.network===context.network&&(()=>{try{return publicProfileUrl(context.network,a.profileUrl)===profileUrl;}catch{return false;}})());
 const snapshots=runs.flatMap(r=>{try{validateAuditRun(r);return r.workspaceId===context.workspaceId&&r.businessId===context.businessId&&r.clientId===context.clientId&&r.data.kind==='networks'&&r.data.network===context.network&&publicProfileUrl(context.network,r.data.snapshot.profileUrl)===profileUrl?[r.data.snapshot]:[];}catch{return [];}});
 if(previous?.presence?.status==='not-used'&&!snapshots.length)return undefined;
 const own=previous?.publicProfiles?.find(p=>p.role==='own'&&p.confirmed&&(()=>{try{return publicProfileUrl(context.network,p.profileUrl)===profileUrl;}catch{return false;}})());
 const merged=[...new Map([...(own?.snapshots||[]),...snapshots].map(s=>[s.id,s])).values()];
 if(!previous&&!merged.length)return undefined;
 return {workspaceId:context.workspaceId,businessId:context.businessId,network:context.network,profileUrl,accountId:previous?.accountId||'',measurements:previous?.measurements||[],publicProfiles:[{role:'own',name:'Perfil confirmado del negocio',confirmed:true,profileUrl,snapshots:merged}]};
}
