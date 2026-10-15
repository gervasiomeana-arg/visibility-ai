import { apiFetchJson } from './apiClient';
import { validateContentOutput } from '../../shared/contentContext';

export async function requestContentDraft(body: unknown, headers: Record<string, string>): Promise<string> {
  let data: { content?: unknown } | null;
  try {
    data = await apiFetchJson<{ content?: unknown } | null>('/api/content/generate', {
      method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(60000),
    });
  } catch (error) {
    if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) {
      throw new Error('La generación superó el tiempo de espera. No se recibió un nuevo borrador; reintentá en unos momentos.');
    }
    throw error;
  }
  if (typeof data?.content !== 'string' || !data.content.trim()) {
    throw new Error('No se recibió contenido. Revisá la configuración del generador e intentá nuevamente.');
  }
  const issue = validateContentOutput(data.content);
  if (issue) throw new Error(issue);
  return data.content.trim();
}
