import { SeoAuditResult } from '../types';
import { authService } from './authService';
import { apiFetchJson } from './apiClient';

export const seoAuditService = {
  async audit(url: string): Promise<SeoAuditResult> {
    return apiFetchJson<SeoAuditResult>('/api/seo/audit', {
      method: 'POST',
      headers: await authService.getAuthorizationHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({ url }),
    });
  },
};
