import { apiFetchJson } from './apiClient';
import { authService } from './authService';
import type { BusinessProfileSuggestion } from '../../shared/businessProfileSuggestion';

export async function requestBusinessProfileSuggestion(businessId: string, url: string): Promise<BusinessProfileSuggestion> {
  return apiFetchJson<BusinessProfileSuggestion>('/api/business/profile/suggest', {
    method: 'POST', headers: await authService.getAuthorizationHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ businessId, url }),
  });
}
