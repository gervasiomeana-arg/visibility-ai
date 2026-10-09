import { apiFetchJson } from './apiClient';

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
    return apiFetchJson<ProductionHealth>('/api/health');
  },
};
