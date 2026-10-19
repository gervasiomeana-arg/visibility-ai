import {apiFetchJson} from './apiClient';
import {authService} from './authService';
export interface IntegrationStatus {
 gemini:{configured:boolean;model:string;quota:'not-checked'};
 youtube:{configured:boolean;missing:string[]};
}
export async function integrationStatus():Promise<IntegrationStatus>{
 return apiFetchJson('/api/integrations/status',{headers:await authService.getAuthorizationHeaders(),signal:AbortSignal.timeout(10000)});
}
