import React, { useState, useEffect, useRef } from 'react';
import {
  PenTool,
  Sparkles,
  Copy,
  Check,
  Globe,
  FileText,
  HelpCircle,
  Share2,
  Layers,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { ContentGenerationRequest, Business, ActiveTab } from '../types';
import { storageService } from '../services/storageService';
import { validateContentInput, validateContentOutput } from '../../shared/contentContext';
import { aiService } from '../services/aiService';

interface ContentGeneratorViewProps {
  business: Business;
  initialParams?: Partial<ContentGenerationRequest>;
  setActiveTab: (tab: ActiveTab) => void;
}

const ContentGeneratorForm: React.FC<ContentGeneratorViewProps> = ({
  business,
  initialParams,
  setActiveTab,
}) => {
  const [savedDraft] = useState(() => storageService.getContentDraft(business.id));
  const live = useRef(true);
  const busy = useRef(false);
  const [error, setError] = useState('');
  const [saveFailed, setSaveFailed] = useState(false);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  const [contentType, setContentType] = useState<ContentGenerationRequest['contentType']>(
    initialParams?.contentType || savedDraft?.request.contentType || 'web_page'
  );
  const [topic, setTopic] = useState(
    initialParams?.topic ?? savedDraft?.request.topic ?? ('')
  );
  const [topicRelation, setTopicRelation] = useState(initialParams ? '' : savedDraft?.request.topicRelation || '');
  const [keyword, setKeyword] = useState(
    initialParams?.keyword ?? savedDraft?.request.keyword ?? ('')
  );
  const [city, setCity] = useState(initialParams?.city ?? savedDraft?.request.city ?? (business.city || ''));
  const [businessType, setBusinessType] = useState(
    initialParams?.businessType ?? savedDraft?.request.businessType ?? (business.category || '')
  );
  const [goal, setGoal] = useState(
    initialParams?.goal ?? savedDraft?.request.goal ?? ('Recibir consultas sobre el servicio')
  );
  const [tone, setTone] = useState(initialParams?.tone ?? savedDraft?.request.tone ?? 'Profesional, cálido, confiable y persuasivo');

  const [generatedResult, setGeneratedResult] = useState<string>(savedDraft?.text || '');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isApproved, setIsApproved] = useState<boolean>(Boolean(savedDraft?.approved && !validateContentOutput(savedDraft?.text || '')));

  useEffect(() => {
    setSaveFailed(!storageService.saveContentDraft(business.id, {
      request: { contentType, topic, keyword, city, businessType, goal, tone, topicRelation },
      text: generatedResult, approved: isApproved,
    }));
  }, [business.id, contentType, topic, keyword, city, businessType, goal, tone, topicRelation, generatedResult, isApproved]);

  // Update if initialParams changed
  useEffect(() => {
    if (initialParams) {
      setTopicRelation('');
      setIsApproved(false);
      if (initialParams.contentType !== undefined) setContentType(initialParams.contentType);
      if (initialParams.topic !== undefined) setTopic(initialParams.topic);
      if (initialParams.keyword !== undefined) setKeyword(initialParams.keyword);
      if (initialParams.city !== undefined) setCity(initialParams.city);
      if (initialParams.businessType !== undefined) setBusinessType(initialParams.businessType);
      if (initialParams.goal !== undefined) setGoal(initialParams.goal);
      if (initialParams.tone !== undefined) setTone(initialParams.tone);
    }
  }, [initialParams]);

  const contentTypes = [
    { id: 'web_page', label: 'Página Web', icon: Globe, desc: 'Página completa de servicio para posicionar' },
    { id: 'blog_article', label: 'Artículo de Blog', icon: FileText, desc: 'Contenido informativo de valor para clientes' },
    { id: 'service_description', label: 'Descripción de Servicio', icon: Layers, desc: 'Ficha clara de lo que ofrecés' },
    { id: 'faq', label: 'Preguntas Frecuentes (FAQ)', icon: HelpCircle, desc: 'Respuestas para clientes y motores de IA' },
    { id: 'seo_meta', label: 'Título SEO + Meta', icon: PenTool, desc: 'Snippet optimizado para los clics de Google' },
    { id: 'google_post', label: 'Google Business Profile', icon: Share2, desc: 'Publicación para el mapa y perfil de Google' },
  ];

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (busy.current) return;
    if (!topic.trim() || !businessType.trim() || !goal.trim()) {
      setError('Completá el tema, el tipo de negocio y el objetivo.');
      return;
    }
    const validation = validateContentInput({ contentType, topic, keyword, city, businessType, goal, tone, topicRelation, businessContext: { name: business.name, description: business.description, url: business.url } });
    if (validation) { setError(validation); return; }
    busy.current = true;
    setError('');
    setIsGenerating(true);
    try {
      const result = await aiService.generateContent(
        {
          contentType,
          topic,
          keyword,
          city,
          businessType,
          goal,
          tone,
          topicRelation,
        },
        {
          workspaceId: business.workspaceId,
          businessId: business.id,
          businessContext: { name: business.name, description: business.description, url: business.url },
        }
      );
      if (live.current) { setGeneratedResult(result); setIsApproved(false); setCopied(false); }
    } catch (err) {
      if (live.current) setError(err instanceof Error ? err.message : 'No se pudo generar el texto. Intentá nuevamente.');
    } finally {
      busy.current = false;
      if (live.current) setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedResult);
      if (!live.current) return;
      setCopied(true);
      setTimeout(() => { if (live.current) setCopied(false); }, 2500);
    } catch {
      if (live.current) setError('No se pudo copiar. Seleccioná el texto y copialo manualmente.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {saveFailed && <p role="alert" className="text-sm text-amber-800">No se pudo guardar el borrador en este navegador. Copiá el texto antes de salir.</p>}
      <p className="text-xs text-slate-500">El borrador se guarda en este navegador para este negocio. No se sincroniza entre dispositivos.</p>
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>GENERADOR DE CONTENIDO IA</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
              Redacción Inteligente para tu Negocio
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
              Prepará borradores basados en el perfil confirmado de <strong>{business.name}</strong> y revisalos antes de publicar.
            </p>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 shrink-0 max-w-xs">
            <span className="font-bold block mb-0.5">Control 100% Humano</span>
            <span className="text-amber-800 text-[11px]">
              No publicamos automáticamente. Todo el contenido generado es editable y requiere tu aprobación.
            </span>
          </div>
        </div>

        {/* Content Type Selector */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-3">
            Seleccioná qué tipo de contenido querés generar:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {contentTypes.map((t) => {
              const Icon = t.icon;
              const isSelected = contentType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setContentType(t.id as ContentGenerationRequest['contentType'])}
                  className={`p-3 rounded-xl border text-left transition-[background-color,color,transform] cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-200 text-indigo-950 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 mb-2 ${
                      isSelected ? 'text-indigo-600' : 'text-slate-400'
                    }`}
                  />
                  <div>
                    <span className="text-xs font-bold block leading-tight font-heading">
                      {t.label}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">
                      {t.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Grid: Form Inputs & Editable Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Input Form (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 font-heading">
            Datos del contenido
          </h2>

          <form onSubmit={handleGenerate} className="space-y-4 text-xs">
            {!business.description?.trim() && <div role="alert" className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-amber-900">
              <p>Falta la descripción confirmada del negocio. Completala para evitar textos genéricos o servicios supuestos.</p>
              <button type="button" onClick={() => setActiveTab('dashboard')} className="underline font-semibold mt-2 cursor-pointer">Ir a Panorama → Editar perfil</button>
            </div>}
            <div>
              <label htmlFor="content-topic" className="font-semibold text-slate-700 block mb-1">
                Tema principal del texto:
              </label>
              <textarea
                rows={2}
                required
                id="content-topic"
                  value={topic}
                onChange={(e) => {setTopic(e.target.value);setTopicRelation('');setIsApproved(false);}}
                placeholder="Describí un tema relacionado con los servicios reales del negocio"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 text-slate-900"
              />
            </div>

            <div>
              <label htmlFor="content-relation" className="font-semibold text-slate-700 block mb-1">¿Qué relación tiene este tema con el negocio?</label>
              <textarea id="content-relation" rows={2} required maxLength={2000} value={topicRelation}
                onChange={(e) => {setTopicRelation(e.target.value);setIsApproved(false);}}
                placeholder="Indicá el servicio real o vínculo confirmado. Si es otro negocio sin relación, cambiá el tema."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 text-slate-900" />
              <p className="text-slate-500 mt-1">Agregar una palabra en Búsquedas no confirma que sea un servicio o marca de este negocio.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="content-keyword" className="font-semibold text-slate-700 block mb-1">
                  Palabra clave (opcional):
                </label>
                <input
                  type="text"
                  id="content-keyword"
                  value={keyword}
                  onChange={(e) => {setKeyword(e.target.value);setTopicRelation('');setIsApproved(false);}}
                  placeholder="Una búsqueda relacionada con este tema"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="content-city" className="font-semibold text-slate-700 block mb-1">
                  Ciudad o Localidad:
                </label>
                <input
                  type="text"
                  id="content-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ej: Mar del Plata"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="content-businessType" className="font-semibold text-slate-700 block mb-1">
                  Tipo de negocio:
                </label>
                <input
                  type="text"
                  required
                  id="content-businessType"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  placeholder="Categoría confirmada del negocio"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="content-tone" className="font-semibold text-slate-700 block mb-1">
                  Tono de redacción:
                </label>
                <select
                  id="content-tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 text-slate-900 bg-white"
                >
                  <option value="Profesional, cálido, confiable y persuasivo">Cálido y Confiable</option>
                  <option value="Comercial directo con llamados a la acción">Comercial directo</option>
                  <option value="Elegante y exclusivo">Elegante / Premium</option>
                  <option value="Cercano y amigable">Cercano & Familiar</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="content-goal" className="font-semibold text-slate-700 block mb-1">
                Objetivo comercial del texto:
              </label>
              <input
                type="text"
                required
                id="content-goal"
                  value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="¿Qué debería poder hacer el lector después de leer?"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider text-xs shadow-md transition-[background-color,color,transform] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>GENERANDO CONTENIDO...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>GENERAR CONTENIDO</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right: Editable Result & Approval (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col min-h-[500px]">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-heading">
                Resultado Editable
              </h2>
              <span className="text-[11px] text-slate-500">
                Podes modificar el texto directamente antes de copiarlo a tu web
              </span>
            </div>

            {generatedResult && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { const issue = validateContentOutput(generatedResult);if (issue) {setError(issue);setIsApproved(false);return;}setIsApproved(!isApproved);}}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isApproved
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isApproved ? 'Aprobado por usuario' : 'Aprobar texto'}</span>
                </button>

                <button
                  onClick={handleCopy}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? '¡Copiado!' : 'Copiar texto'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Text Area */}
          <div className="mt-4 flex-1 flex flex-col">
            {generatedResult ? (
              <div className="flex-1 flex flex-col space-y-3">
                <textarea
                  value={generatedResult}
                  aria-label="Borrador editable"
                  onChange={(e) => { setGeneratedResult(e.target.value); setIsApproved(false); setCopied(false); }}
                  className="w-full flex-1 min-h-[360px] p-4 text-xs sm:text-sm font-mono leading-relaxed text-slate-900 bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 resize-y"
                />

                <div className="p-3 rounded-xl bg-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span>
                    Palabras: <strong>{generatedResult.split(/\s+/).filter(Boolean).length}</strong>
                  </span>
                  <span className="text-slate-500 italic">
                    Borrador en Markdown: adaptá el formato al editor de destino
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                  <PenTool className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 font-heading">
                  Todavía no generaste contenido
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Completá los campos de la izquierda y tocá en <strong>GENERAR CONTENIDO</strong> para obtener el borrador comercial.
                </p>
                <button
                  type="button"
                  onClick={() => document.getElementById('content-topic')?.focus()}
                  className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Completar los datos
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ContentGeneratorView: React.FC<ContentGeneratorViewProps> = (props) => (
  <ContentGeneratorForm key={`${storageService.getScope()}:${props.business.workspaceId || 'local'}:${props.business.id}`} {...props} />
);
