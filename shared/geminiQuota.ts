/** Safe diagnostic categories only. Never persist provider messages, keys, prompts or project IDs. */
export interface GeminiQuotaDiagnostic {
  window: 'minute' | 'day' | 'mixed' | 'unknown';
  service: 'generation' | 'search' | 'unknown';
  retryAfterSeconds?: number;
}
export function geminiQuotaDiagnostic(error: unknown): GeminiQuotaDiagnostic {
  const e = error as any;
  let payload = e?.error || e;
  // @google/genai ApiError stores the structured REST error as a JSON message.
  if (typeof e?.message === 'string' && e.message.length <= 64000) {
    try { const decoded = JSON.parse(e.message); if (decoded?.error && typeof decoded.error === 'object') payload = decoded.error; } catch { /* Free text is never a diagnostic source. */ }
  }
  const details = Array.isArray(payload?.details) ? payload.details.slice(0,20) : [];
  let daily = false, minute = false, generation = false, search = false, retryAfterSeconds: number | undefined;
  for (const detail of details) {
    if (detail?.['@type'] === 'type.googleapis.com/google.rpc.QuotaFailure') {
      for (const item of Array.isArray(detail.violations) ? detail.violations.slice(0,30) : []) {
        const metric = typeof item?.quotaMetric === 'string' && item.quotaMetric.startsWith('generativelanguage.googleapis.com/') && item.quotaMetric.length <= 300 ? item.quotaMetric : '';
        const id = metric && typeof item?.quotaId === 'string' && item.quotaId.length <= 200 ? item.quotaId : '';
        const text = `${metric} ${id}`;
        daily ||= /perday|per_day|daily/i.test(text);
        minute ||= /perminute|per_minute/i.test(text);
        search ||= /google_search|grounding/i.test(metric);
        generation ||= /generate_content/i.test(metric);
      }
    }
    if (detail?.['@type'] === 'type.googleapis.com/google.rpc.RetryInfo' && typeof detail.retryDelay === 'string' && /^\d+(?:\.\d{1,9})?s$/.test(detail.retryDelay)) {
      const seconds = Math.ceil(Number(detail.retryDelay.slice(0,-1)));
      if (seconds > 0 && seconds <= 86400) retryAfterSeconds = Math.max(retryAfterSeconds || 0, seconds);
    }
  }
  return { window: daily && minute ? 'mixed' : daily ? 'day' : minute ? 'minute' : 'unknown', service: generation && !search ? 'generation' : search && !generation ? 'search' : 'unknown', ...(retryAfterSeconds ? {retryAfterSeconds} : {}) };
}
export function geminiQuotaMessage(diagnostic: GeminiQuotaDiagnostic) {
  const kind = diagnostic.window === 'minute' ? 'un límite por minuto' : diagnostic.window === 'day' ? 'un límite diario' : diagnostic.window === 'mixed' ? 'límites por minuto y por día' : 'un límite de uso cuya ventana no fue especificada';
  const service = diagnostic.service === 'search' ? ' de búsqueda con Google Search' : diagnostic.service === 'generation' ? ' de generación' : '';
  return `Gemini informó ${kind}${service}. ${diagnostic.retryAfterSeconds ? `Google indica esperar al menos ${diagnostic.retryAfterSeconds} segundos antes de reintentar; esa espera no garantiza cuota disponible. ` : ''}Revisá la cuota y los límites del proyecto y modelo en Google AI Studio. Este error no permite concluir por sí solo que se hayan terminado los créditos. No se generó un resultado nuevo.`;
}
