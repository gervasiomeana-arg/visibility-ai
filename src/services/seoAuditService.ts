import { SeoAuditResult } from '../types';

export const seoAuditService = {
  async audit(url: string): Promise<SeoAuditResult> {
    const response = await fetch('/api/seo/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'No se pudo auditar el sitio.');
    }

    return data as SeoAuditResult;
  },
};
