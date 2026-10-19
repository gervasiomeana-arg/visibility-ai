import { authService } from './authService';
import { apiFetchJson } from './apiClient';
import { beginOAuthNavigation } from '../../shared/oauthNavigation';
import { validateSearchQueryResult } from '../../shared/searchAnalytics';
import { searchConsoleWindow } from '../../shared/searchConsolePeriod';

export interface SearchConsoleSite {
  siteUrl: string;
  permissionLevel: string;
}

export interface SearchConsoleQueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchConsoleStatus {
  configured: boolean;
  connected: boolean;
  persistence: string;
  missing?: string[];
  appUrl?: string;
  redirectUri?: string;
  hasTokenKey?: boolean;
}

async function authHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...(extra || {}) };

  if (authService.isConfigured()) {
    const session = await authService.getSession();
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  }

  return headers;
}

export const searchConsoleService = {
  async status(): Promise<SearchConsoleStatus> {
    return apiFetchJson<SearchConsoleStatus>('/api/search-console/status', {
      headers: await authHeaders(),
      signal: AbortSignal.timeout(60000),
    });
  },

  async connect(returnTo = '/'): Promise<'new-tab' | 'redirect'> {
    return beginOAuthNavigation(window, async () => {
    const data = await apiFetchJson<{ authUrl?: string }>(
      '/api/search-console/auth/start',
      {
        method: 'POST',
        headers: await authHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ returnTo }),
        signal: AbortSignal.timeout(30000),
      }
    );

      return data.authUrl;
    });
  },

  async disconnect(): Promise<void> {
    await apiFetchJson<{ connected: boolean }>(
      '/api/search-console/disconnect',
      {
        method: 'POST',
        headers: await authHeaders(),
        signal: AbortSignal.timeout(60000),
      }
    );
  },

  async sites(): Promise<SearchConsoleSite[]> {
    const data = await apiFetchJson<{ sites?: SearchConsoleSite[] }>(
      '/api/search-console/sites',
      {
        headers: await authHeaders(),
        signal: AbortSignal.timeout(60000),
      }
    );
    return data.sites || [];
  },

  async query(
    siteUrl: string,
    days = 28,
    context?: { workspaceId?: string; businessId?: string }
  ): Promise<{ rows: SearchConsoleQueryRow[]; startDate: string; endDate: string }> {
    const {startDate,endDate} = searchConsoleWindow(days);
    return this.queryWindow(siteUrl,startDate,endDate,context);
  },
  async queryWindow(siteUrl:string,startDate:string,endDate:string,context?:{workspaceId?:string;businessId?:string}):Promise<{rows:SearchConsoleQueryRow[];startDate:string;endDate:string}> {
    const data = await apiFetchJson<unknown>('/api/search-console/query', {
      method: 'POST',
      headers: await authHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        siteUrl,
        startDate,
        endDate,
        rowLimit: 100,
        workspaceId: context?.workspaceId,
        businessId: context?.businessId,
      }),
      signal: AbortSignal.timeout(60000),
    });
    return validateSearchQueryResult(data, { siteUrl, startDate, endDate });
  },
};
