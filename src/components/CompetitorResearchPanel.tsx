import React, { useEffect, useRef, useState } from 'react';
import { Search, ExternalLink, Loader2 } from 'lucide-react';
import type { Business } from '../types';
import { storageService } from '../services/storageService';
import { authService } from '../services/authService';
import { apiFetchJson } from '../services/apiClient';
import { researchSourceUrl, researchWidgetDocument, validateResearchInput, type CompetitorResearchResult } from '../../shared/competitorResearch';
import { keywordRequestScope } from '../../shared/keywordWorkflow';

export const CompetitorResearchPanel: React.FC<{ business: Business }> = ({ business }) => {
  const [name, setName] = useState('');const [location, setLocation] = useState(business.city || '');
  const [website, setWebsite] = useState('');const [question, setQuestion] = useState('¿Qué servicios ofrece y qué categoría declara, si corresponde?');
  const [busy, setBusy] = useState(false);const [error, setError] = useState('');const [saveError, setSaveError] = useState('');
  const [history, setHistory] = useState<CompetitorResearchResult[]>(() => storageService.getCompetitorResearch(business.id));
  const [result, setResult] = useState<CompetitorResearchResult | null>(() => storageService.getCompetitorResearch(business.id)[0] || null);
  const scope = keywordRequestScope(business, storageService.getScope());const currentScope = useRef(scope);currentScope.current = scope;
  const version = useRef(0);const lock = useRef(false);const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    version.current++;controller.current?.abort();lock.current = false;setBusy(false);setError('');setSaveError('');setName('');setWebsite('');setLocation(business.city || '');
    const records = storageService.getCompetitorResearch(business.id);setHistory(records);setResult(records[0] || null);
    return () => {version.current++;controller.current?.abort();};
  }, [scope]);

  const investigate = async (event: React.FormEvent) => {
    event.preventDefault();if (lock.current) return;
    let input;
    try {input = validateResearchInput({ name, location, website, question });}
    catch (err) {setError(err instanceof Error ? err.message : 'Revisá los datos.');return;}
    const requestVersion = ++version.current;const requestScope = scope;
    const active = () => version.current === requestVersion && currentScope.current === requestScope;
    const abort = new AbortController();controller.current = abort;const timeout = setTimeout(() => abort.abort(), 70000);
    lock.current = true;setBusy(true);setError('');setSaveError('');
    try {
      const response = await apiFetchJson<CompetitorResearchResult>('/api/competitors/research', {method:'POST',signal:abort.signal,
        headers:await authService.getAuthorizationHeaders({'Content-Type':'application/json'}),body:JSON.stringify({...input,businessId:business.id,workspaceId:business.workspaceId})});
      if (!active()) return;
      if (response.businessId !== business.id || !Array.isArray(response.claims) || !response.claims.length) throw new Error('No se recibió una investigación con fuentes para el negocio seleccionado.');
      setResult(response);
      if (!storageService.saveCompetitorResearch(business.id, response)) setSaveError('El resultado se muestra, pero no se pudo guardar en este navegador. No se confirmó la persistencia.');
      setHistory(storageService.getCompetitorResearch(business.id));
    } catch (err) {if (active()) setError(err instanceof Error && err.name === 'AbortError' ? 'La investigación tardó demasiado. El resultado anterior, si existe, se conserva; podés reintentar.' : err instanceof Error ? err.message : 'No se pudo investigar el negocio.');}
    finally {clearTimeout(timeout);if (active()) {lock.current = false;setBusy(false);}}
  };
  return <section className="vai-panel rounded-xl p-5 sm:p-7 border border-slate-200 space-y-5">
    <div><h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Search className="w-5 h-5"/>Investigar un negocio en la web</h2>
      <p className="text-sm text-slate-600 mt-2">Buscá servicios, ubicación y categoría pública de un negocio concreto. Las respuestas incluyen referencias del proveedor de búsqueda para que puedas revisar cada afirmación.</p>
      <p className="text-xs text-slate-500 mt-2">La investigación usa Gemini y Google Search, sujetos a las cuotas y facturación de tu proyecto. Se ejecuta solo al pulsar el botón.</p>
    </div>
    <form onSubmit={investigate} className="grid sm:grid-cols-2 gap-4 text-sm">
      <label className="space-y-1"> <span className="block font-semibold text-slate-700">Nombre del negocio a investigar</span><input required maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="Ej.: Hotel Balluk" className="w-full rounded-lg border border-slate-300 p-2.5"/></label>
      <label className="space-y-1"><span className="block font-semibold text-slate-700">Ciudad y país</span><input required maxLength={160} value={location} onChange={e=>setLocation(e.target.value)} placeholder="Ej.: Mar del Plata, Argentina" className="w-full rounded-lg border border-slate-300 p-2.5"/></label>
      <label className="space-y-1 sm:col-span-2"><span className="block font-semibold text-slate-700">Web de referencia · opcional</span><input maxLength={2048} value={website} onChange={e=>setWebsite(e.target.value)} placeholder="Si conocés su web, ayuda a distinguir negocios con nombres similares" className="w-full rounded-lg border border-slate-300 p-2.5"/></label>
      <label className="space-y-1 sm:col-span-2"><span className="block font-semibold text-slate-700">¿Qué querés investigar?</span><textarea required maxLength={500} rows={2} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ej.: ¿Qué servicios ofrece y qué fuentes documentan su categoría hotelera?" className="w-full rounded-lg border border-slate-300 p-2.5"/></label>
      {error && <p role="alert" className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 text-red-800 p-3">{error}</p>}
      <div className="sm:col-span-2"><button disabled={busy} className="vai-button vai-button-primary disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin"/>:<Search className="w-4 h-4"/>}{busy?'Investigando con fuentes…':'Investigar en la web'}</button></div>
    </form>
    {saveError && <p role="alert" className="text-sm text-amber-800">{saveError}</p>}
    {history.length > 1 && <label className="block text-xs text-slate-600">Investigaciones guardadas en este navegador<select className="ml-2 max-w-full border border-slate-200 rounded p-2" value={result?.researchedAt || ''} onChange={e=>setResult(history.find(item=>item.researchedAt===e.target.value)||null)}>{history.map(item=><option key={item.researchedAt} value={item.researchedAt}>{item.input.name} · {new Date(item.researchedAt).toLocaleString('es-AR')}</option>)}</select></label>}
    {result && <article className="border-t border-slate-200 pt-5 space-y-4">
      <div><p className="text-xs font-semibold text-indigo-700">ÚLTIMA INVESTIGACIÓN CON REFERENCIAS · REVISIÓN PENDIENTE</p><h3 className="text-lg font-bold text-slate-900 mt-1">{result.input.name} · {result.input.location}</h3><p className="text-xs text-slate-500">Consultada el {new Date(result.researchedAt).toLocaleString('es-AR')} · {history.some(item=>item.researchedAt===result.researchedAt)?'guardado en este navegador':'guardado no confirmado'}</p><p className="text-sm text-slate-600 mt-1">Pregunta: {result.input.question}</p></div>
      <p className="text-xs text-slate-600">Las citas vinculan una síntesis de IA a fuentes devueltas por la búsqueda; no acreditan por sí solas una categoría oficial ni verifican cada dato de forma independiente. Si falta información, no significa que el servicio no exista. Abrí las referencias antes de usarla en un informe.</p>
      <ul className="space-y-3">{result.claims.map((claim,index)=><li key={index} className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-800 whitespace-pre-wrap break-words">{claim.text}</p><div className="mt-2 flex flex-wrap gap-3 text-xs">{claim.sources.map(source=>{const url=researchSourceUrl(source.url);return url?<a key={url} href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-700 underline inline-flex items-center gap-1 break-all">{source.title || new URL(url).hostname}<ExternalLink className="w-3 h-3 shrink-0"/></a>:null;})}</div></li>)}</ul>
      {result.suggestionsHtml && <iframe title="Sugerencias de Google Search" srcDoc={researchWidgetDocument(result.suggestionsHtml)} sandbox="allow-popups" referrerPolicy="no-referrer" className="w-full h-40 border-0 rounded-lg bg-white"/>}
      <p className="text-xs text-slate-500">No se modificó el perfil ni se generó contenido comercial para {business.name}. Esta investigación tampoco mide posiciones, tráfico o puntajes del competidor.</p>
    </article>}
  </section>;
};
