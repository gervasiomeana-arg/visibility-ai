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

export const searchConsoleService = {
  async status(): Promise<{ configured: boolean; connected: boolean; persistence: string }> {
    const response = await fetch('/api/search-console/status');
    if (!response.ok) throw new Error('No se pudo consultar el estado de Search Console.');
    return response.json();
  },

  connect(returnTo = '/'): void {
    window.location.href = `/api/search-console/auth/start?returnTo=${encodeURIComponent(returnTo)}`;
  },

  async disconnect(): Promise<void> {
    await fetch('/api/search-console/disconnect', { method: 'POST' });
  },

  async sites(): Promise<SearchConsoleSite[]> {
    const response = await fetch('/api/search-console/sites');
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
      headers: { 'Content-Type': 'application/json' },
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
