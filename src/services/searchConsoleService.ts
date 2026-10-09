import { authService } from './authService';

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
  async status(): Promise<{ configured: boolean; connected: boolean; persistence: string }> {
    const response = await fetch('/api/search-console/status', {
      headers: await authHeaders(),
    });
    if (!response.ok) throw new Error('No se pudo consultar el estado de Search Console.');
    return response.json();
  },

  async connect(returnTo = '/'): Promise<void> {
    const response = await fetch('/api/search-console/auth/start', {
      method: 'POST',
      headers: await authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ returnTo }),
    });

    const data = await response.json();
    if (!response.ok || !data?.authUrl) {
      throw new Error(data?.error || 'No se pudo iniciar la conexión con Search Console.');
    }

    window.location.href = data.authUrl;
  },

  async disconnect(): Promise<void> {
    const response = await fetch('/api/search-console/disconnect', {
      method: 'POST',
      headers: await authHeaders(),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.error || 'No se pudo desconectar Search Console.');
    }
  },

  async sites(): Promise<SearchConsoleSite[]> {
    const response = await fetch('/api/search-console/sites', {
      headers: await authHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || 'No se pudieron cargar las propiedades de Search Console.');
    return data.sites || [];
  },

  async query(siteUrl: string, days = 28): Promise<{ rows: SearchConsoleQueryRow[]; startDate: string; endDate: string }> {
    const end = new Date();
    end.setDate(end.getDate() - 2);
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));

    const format = (date: Date) => date.toISOString().slice(0, 10);

    const response = await fetch('/api/search-console/query', {
      method: 'POST',
      headers: await authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        siteUrl,
        startDate: format(start),
        endDate: format(end),
        rowLimit: 100,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || 'No se pudieron cargar las consultas de Search Console.');
    return data;
  },
};
