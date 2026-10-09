import { authService } from './authService';
import { apiFetchJson } from './apiClient';

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
    });
  },

  async connect(returnTo = '/'): Promise<void> {
    const data = await apiFetchJson<{ authUrl?: string }>(
      '/api/search-console/auth/start',
      {
        method: 'POST',
        headers: await authHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ returnTo }),
      }
    );

    if (!data.authUrl) {
      throw new Error(
        'Search Console no devolvió una URL de autorización.'
      );
    }

    window.location.href = data.authUrl;
  },

  async disconnect(): Promise<void> {
    await apiFetchJson<{ connected: boolean }>(
      '/api/search-console/disconnect',
      {
        method: 'POST',
        headers: await authHeaders(),
      }
    );
  },

  async sites(): Promise<SearchConsoleSite[]> {
    const data = await apiFetchJson<{ sites?: SearchConsoleSite[] }>(
      '/api/search-console/sites',
      {
        headers: await authHeaders(),
      }
    );
    return data.sites || [];
  },

  async query(
    siteUrl: string,
    days = 28,
    context?: { workspaceId?: string; businessId?: string }
  ): Promise<{ rows: SearchConsoleQueryRow[]; startDate: string; endDate: string }> {
    const end = new Date();
    end.setDate(end.getDate() - 2);
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));

    const format = (date: Date) => date.toISOString().slice(0, 10);

    return apiFetchJson<{
      rows: SearchConsoleQueryRow[];
      startDate: string;
      endDate: string;
    }>('/api/search-console/query', {
      method: 'POST',
      headers: await authHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        siteUrl,
        startDate: format(start),
        endDate: format(end),
        rowLimit: 100,
        workspaceId: context?.workspaceId,
        businessId: context?.businessId,
      }),
    });
  },
};
