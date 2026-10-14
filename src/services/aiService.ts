import { ContentGenerationRequest } from '../types';
import { authService } from './authService';
import { apiFetchJson } from './apiClient';
import { requestAssistantReply } from './assistantClient';
import { AssistantTurn, normalizeAssistantHistory } from '../../shared/assistantContext';

export const aiService = {
  async askAssistant(
    prompt: string,
    businessContext?: {
      name: string;
      url: string;
      category: string;
      city: string;
      description?: string;
      scores?: any;
      workspaceId?: string;
      businessId?: string;
      lastAudit?: any;
    },
    history: AssistantTurn[] = []
  ): Promise<string> {
    return requestAssistantReply({
      prompt, businessContext, history: normalizeAssistantHistory(history),
      workspaceId: businessContext?.workspaceId, businessId: businessContext?.businessId,
    }, await authService.getAuthorizationHeaders({ 'Content-Type': 'application/json' }));
  },

  async generateContent(
    req: ContentGenerationRequest,
    context?: { workspaceId?: string; businessId?: string; businessContext?: { name: string; description?: string; url?: string } }
  ): Promise<string> {
    const data = await apiFetchJson<{ content?: string | null }>(
      '/api/content/generate',
      {
        method: 'POST',
        headers: await authService.getAuthorizationHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ...req, ...context }),
      }
    );
    if (!data.content?.trim()) {
      throw new Error('No se recibió contenido. Revisá la configuración del generador e intentá nuevamente.');
    }
    return data.content;
  },
};
