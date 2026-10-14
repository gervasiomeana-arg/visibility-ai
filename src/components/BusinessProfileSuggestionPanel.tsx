import React, { useEffect, useRef, useState } from 'react';
import type { BusinessProfileSuggestion } from '../../shared/businessProfileSuggestion';

export function BusinessProfileSuggestionPanel({ businessId, url, disabled, onApply }: {
  businessId: string; url: string; disabled: boolean; onApply: (description: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<BusinessProfileSuggestion | null>(null);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(false);
  const generation = useRef(0);
  const pending = useRef(false);
  useEffect(() => { generation.current++; return () => { generation.current++; }; }, [businessId, url]);

  const suggest = async () => {
    if (pending.current || disabled) return;
    pending.current = true;
    const version = generation.current;
    setLoading(true); setSuggestion(null); setError(''); setApplied(false);
    try {
      const { requestBusinessProfileSuggestion } = await import('../services/businessProfileService');
      const result = await requestBusinessProfileSuggestion(businessId, url);
      if (generation.current !== version) return;
      if (result.businessId !== businessId || result.method !== 'initial_html') throw new Error('La propuesta no corresponde a este negocio.');
      setSuggestion(result);
    } catch (err) {
      if (generation.current === version) setError(err instanceof Error ? err.message : 'No se pudo preparar la propuesta.');
    } finally {
      if (generation.current === version) { pending.current = false; setLoading(false); }
    }
  };

  return <section className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 space-y-3" aria-label="Ayuda para describir el negocio">
    <p className="text-xs text-slate-600">La IA puede leer la web del negocio y proponer una descripción. Revisá la actividad y las citas antes de guardarla.</p>
    <button type="button" disabled={loading || disabled} onClick={suggest} className="text-xs font-semibold text-indigo-700 disabled:opacity-50">
      {loading ? 'Leyendo la web…' : 'Leer web y proponer descripción con IA'}
    </button>
    {loading && <p role="status" className="text-xs text-slate-600">Consultando el HTML inicial de {url}</p>}
    {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
    {suggestion && <div className="space-y-2 text-xs text-slate-700">
      <p className="font-semibold">Propuesta para revisar · todavía sin guardar</p>
      <p>{suggestion.description}</p>
      <p className="text-[11px]">Texto encontrado en la web:</p>
      {suggestion.quotes.map(quote => <blockquote key={quote} className="border-l-2 border-indigo-200 pl-2">{quote}</blockquote>)}
      <a href={suggestion.sourceUrl} target="_blank" rel="noreferrer" className="block underline break-all">Fuente: {suggestion.sourceUrl}</a>
      {suggestion.requestedUrl !== suggestion.sourceUrl && <p className="break-all">Dirección solicitada: {suggestion.requestedUrl}</p>}
      <p>Consulta: {new Date(suggestion.fetchedAt).toLocaleString('es-AR', { hour12: false })}. Se leyó el HTML inicial, sin ejecutar JavaScript. Las citas respaldan la propuesta; no verifican de forma independiente lo que declara el sitio.</p>
      <button type="button" disabled={disabled || applied} onClick={() => { onApply(suggestion.description); setApplied(true); }} className="font-semibold text-indigo-700 disabled:opacity-50">{applied ? 'Copiada al campo de descripción' : 'Usar esta propuesta en el formulario'}</button>
      <p>Podés editarla en el campo de descripción. Para conservarla, pulsá «Guardar perfil». Los informes ya descargados no cambian.</p>
    </div>}
  </section>;
}
