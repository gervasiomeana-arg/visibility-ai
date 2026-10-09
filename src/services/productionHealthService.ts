export interface ProductionHealth {
  ok: boolean;
  service: string;
  environment: string;
  uptimeSeconds: number;
  integrations: {
    supabase: boolean;
    searchConsoleOAuth: boolean;
    searchConsoleDurableTokens: boolean;
    pageSpeedKey: boolean;
    gemini: boolean;
  };
  readiness: {
    coreSaasReady: boolean;
    searchConsoleProductionReady: boolean;
    blockers: string[];
    optionalMissing: string[];
  };
}

export const productionHealthService = {
  async getStatus(): Promise<ProductionHealth> {
    const response = await fetch('/api/health', {
      headers: { accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error('No se pudo consultar el estado del servidor.');
    }

    return response.json();
  },
};
