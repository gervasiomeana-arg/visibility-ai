export const clientWebsiteUrl='https://visibility-global.rea-de-traba-5826.chatgpt.site';
export const clientWebsiteShareUrl='https://visibility-ia.ai.studio/web';
export const leadStages={new:'Nueva',contacted:'Contactada',proposal:'Propuesta enviada',won:'Contratada',archived:'Archivada'} as const;
export type LeadStage=keyof typeof leadStages;
export interface WebsiteLead {id:string;name:string;email:string;business:string;country:string;website:string;service:string;kind:string;message:string;language:string;status:LeadStage;created_at:string;updated_at:string;}
export interface WebsiteInbox {leads:WebsiteLead[];stats:{total:number;fresh:number|null};offset:number;}
