import { apiFetchJson, ApiError } from './apiClient';

/** A failed request must never be replaced by a success-looking canned answer. */
export async function requestAssistantReply(body: unknown, headers: HeadersInit): Promise<string> {
  const data = await apiFetchJson<{ reply?: unknown }>('/api/assistant/chat', {
    method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(60000),
  });
  if (typeof data?.reply !== 'string' || !data.reply.trim()) {
    throw new Error('El asistente no devolvió una respuesta. Podés reintentar; no se generó un diagnóstico nuevo.');
  }
  return data.reply.trim();
}

export function assistantFailureMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return 'No se pudo autorizar la consulta. Revisá tu sesión y volvé a intentarlo.';
    if (error.status === 429) return error.message;
    if (error.status >= 500 && ['ai_configuration', 'ai_credentials', 'ai_quota', 'ai_model', 'ai_request', 'ai_timeout', 'ai_unavailable'].includes((error.details as any)?.code)) return error.message;
    if (error.status >= 500) return 'El servicio del asistente no está disponible en este momento. Podés reintentar más tarde.';
  }
  return 'No se pudo obtener una respuesta. Revisá la conexión y volvé a intentarlo.';
}
