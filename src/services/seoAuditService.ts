import { normalizeAuditUrl } from '../../shared/auditUrl';
import { validateSeoAuditResponse } from '../../shared/seoAuditResponse';
import { SeoAuditResult } from '../types';
import { authService } from './authService';
import { apiFetchJson } from './apiClient';

export const seoAuditService = {
  async audit(
    url: string,
    context?: { workspaceId?: string; businessId?: string }
  ): Promise<SeoAuditResult> {
    const requestedUrl = normalizeAuditUrl(url);
    const result = await apiFetchJson<unknown>('/api/seo/audit', {
      method: 'POST',
      headers: await authService.getAuthorizationHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        url: requestedUrl,
        workspaceId: context?.workspaceId,
        businessId: context?.businessId,
      }),
    });
    return validateSeoAuditResponse(result, requestedUrl);
  },
};
