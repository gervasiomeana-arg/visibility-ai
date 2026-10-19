import { geminiQuotaDiagnostic, geminiQuotaMessage, type GeminiQuotaDiagnostic } from '../shared/geminiQuota';
import { GoogleGenAI, ThinkingLevel, type GenerateContentParameters } from '@google/genai';
import type { Response } from 'express';

type FailureKind = 'configuration' | 'credentials' | 'quota' | 'model' | 'request' | 'timeout' | 'unavailable';
export class AiProviderError extends Error {
  constructor(public kind: FailureKind, public providerStatus?: number, public quota?: GeminiQuotaDiagnostic) {
    super(kind); this.name = 'AiProviderError';
  }
}
export function geminiConfigured() {
  const key = process.env.GEMINI_API_KEY?.trim();
  return Boolean(key && key !== 'MY_GEMINI_API_KEY');
}
export function geminiModel() { return process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash'; }
function providerStatus(error: unknown): number | undefined {
  const value = (error as any)?.status ?? (error as any)?.error?.code;
  const status = typeof value === 'number' ? value : typeof value === 'string' && /^\d{3}$/.test(value) ? Number(value) : NaN;
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : undefined;
}
export function classifyAiFailure(error: unknown): AiProviderError {
  if (error instanceof AiProviderError) return error;
  const status = providerStatus(error);
  if (status === 401 || status === 403) return new AiProviderError('credentials', status);
  if (status === 429) return new AiProviderError('quota', status, geminiQuotaDiagnostic(error));
  if (status === 404) return new AiProviderError('model', status);
  if (status === 400 || status === 422) return new AiProviderError('request', status);
  if (status === 408 || status === 504 || ['TimeoutError', 'AbortError'].includes((error as any)?.name)) return new AiProviderError('timeout', status);
  return new AiProviderError('unavailable', status);
}

type Client = { models: { generateContent: (params: GenerateContentParameters) => Promise<any> } };
/** Resolve secrets at request time, after dotenv has loaded; never retain a missing client at import. */
export function createGeminiGenerator(options: {
  key?: () => string | undefined; client?: (key: string) => Client;
  wait?: (ms: number) => Promise<void>; now?: () => number;
} = {}) {
  let cachedKey: string | undefined, client: Client | undefined;
  const now = options.now || Date.now;
  const wait = options.wait || (ms => new Promise(resolve => setTimeout(resolve, ms)));
  return async (params: GenerateContentParameters) => {
    const key = (options.key || (() => process.env.GEMINI_API_KEY))()?.trim();
    if (!key || key === 'MY_GEMINI_API_KEY') throw new AiProviderError('configuration');
    if (!client || cachedKey !== key) { client = (options.client || (apiKey => new GoogleGenAI({ apiKey })))(key); cachedKey = key; }
    const budget = Math.min(60000, Math.max(1000, params.config?.httpOptions?.timeout || 45000));
    const deadline = now() + budget;
    for (let attempt = 0; attempt < 2; attempt++) {
      const remaining = deadline - now();
      if (remaining < 1000) throw new AiProviderError('timeout');
      try {
        return await client.models.generateContent({ ...params, config: {
          ...params.config,
          // Low reasoning is sufficient for constrained drafts and short grounded research.
          ...(/^gemini-3[.-]/.test(params.model) && !params.config?.thinkingConfig ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
          httpOptions: { ...params.config?.httpOptions, timeout: remaining, retryOptions: { attempts: 1 } },
        } });
      } catch (error) {
        const failure = classifyAiFailure(error);
        // Only an explicit transient provider rejection is retried. Never retry timeouts,
        // unknown network outcomes, quota, permissions, or invalid requests automatically.
        if (attempt === 0 && [500, 502, 503].includes(failure.providerStatus || 0) && deadline - now() > 1750) { await wait(750); continue; }
        throw failure;
      }
    }
    throw new AiProviderError('unavailable');
  };
}
export const generateWithGemini = createGeminiGenerator();

export function sendAiFailure(res: Response, error: unknown, operation: string) {
  const failure = classifyAiFailure(error);
  const messages: Record<FailureKind, string> = {
    configuration: 'La IA no está configurada. Revisá GEMINI_API_KEY en el servidor y volvé a publicar.',
    credentials: 'Gemini rechazó la credencial o sus permisos. Revisá la clave y las restricciones del proyecto en Google AI Studio.',
    quota: geminiQuotaMessage(failure.quota || {window:'unknown',service:'unknown'}),
    model: 'Gemini no encontró el modelo configurado. Revisá GEMINI_MODEL y el acceso del proyecto a ese modelo.',
    request: 'Gemini rechazó los parámetros de la solicitud. Revisá la compatibilidad del modelo y, para investigación, Google Search.',
    timeout: 'Gemini superó el tiempo de espera. No se confirmó un resultado nuevo; podés reintentar en unos momentos.',
    unavailable: 'Gemini no está disponible o no se pudo contactar. Reintentá más tarde; el resultado anterior se conserva.',
  };
  console.error(JSON.stringify({ type: 'ai_failure', requestId: res.locals.requestId, operation, kind: failure.kind, providerStatus: failure.providerStatus, ...(failure.quota ? {quota:failure.quota} : {}) }));
  if(failure.quota?.retryAfterSeconds)res.setHeader('Retry-After',String(failure.quota.retryAfterSeconds));
  return res.status(failure.kind === 'request' ? 502 : 503).json({ error: messages[failure.kind], code: `ai_${failure.kind}`, ...(failure.quota ? {quota:failure.quota,retryAfterSeconds:failure.quota.retryAfterSeconds} : {}) });
}
