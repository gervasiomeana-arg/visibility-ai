import { normalizeAuditUrl } from './auditUrl';

export interface BusinessProfileSuggestion {
  businessId: string;
  description: string;
  quotes: string[];
  requestedUrl: string;
  sourceUrl: string;
  fetchedAt: string;
  method: 'initial_html';
}

export function validateProfileSuggestionInput(body: any): { url: string; businessId: string } {
  if (typeof body?.businessId !== 'string' || !body.businessId.trim() || body.businessId.length > 120) {
    throw new Error('Seleccioná el negocio que querés revisar.');
  }
  if (typeof body?.url !== 'string' || body.url.length > 2000) throw new Error('Ingresá la dirección de la web.');
  return { url: normalizeAuditUrl(body.url), businessId: body.businessId.trim() };
}

/** This validates citations, not the semantic truth of an AI proposal. Review remains required. */
export function validateProfileProposal(value: any, sourceText: string): { description: string; quotes: string[] } {
  const invalid = () => new Error('La IA no devolvió una propuesta con citas verificables. Revisá la página o completá el perfil manualmente.');
  if (!value || typeof value.description !== 'string' || value.description.trim().length < 20 || value.description.length > 700) throw invalid();
  if (!Array.isArray(value.quotes) || !value.quotes.length || value.quotes.length > 4) throw invalid();
  const quotes: string[] = value.quotes.map((quote: unknown) => {
    if (typeof quote !== 'string' || quote.length < 20 || quote.length > 700 || !sourceText.includes(quote)) throw invalid();
    return quote;
  });
  return { description: value.description.trim(), quotes: [...new Set(quotes)] };
}
