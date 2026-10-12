import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Globe, Loader2 } from 'lucide-react';
import { seoAuditService } from '../services/seoAuditService';
import { SeoAuditResult } from '../types';

interface AnalyzingViewProps {
  url: string;
  onComplete: (result: SeoAuditResult) => void;
  onCancel?: () => void;
  workspaceId?: string;
  businessId?: string;
}

const AnalyzingRequest: React.FC<AnalyzingViewProps> = ({
  url,
  onComplete,
  onCancel,
  workspaceId,
  businessId,
}) => {
  const [requestUrl, setRequestUrl] = useState(url);
  const [retryUrl, setRetryUrl] = useState(url);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'running' | 'success' | 'error'>('running');
  const [error, setError] = useState('');
  const [result, setResult] = useState<SeoAuditResult | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    'Conectando de forma segura con la web',
    'Leyendo HTML y estado HTTP',
    'Revisando title, description y encabezados',
    'Comprobando canonical, indexación e imágenes ALT',
    'Buscando robots.txt y sitemap.xml',
    'Esperando la respuesta de la auditoría y PageSpeed',
  ];

  useEffect(() => {
    let cancelled = false;
    setStatus('running');
    setResult(null);
    setError('');
    setCurrentStep(0);
    const timer = window.setInterval(() => {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }, 700);

    seoAuditService.audit(requestUrl, { workspaceId, businessId })
      .then((data) => {
        if (cancelled) return;
        window.clearInterval(timer);
        setCurrentStep(steps.length - 1);
        setResult(data);
        setStatus('success');
      })
      .catch((err: Error) => {
        if (cancelled) return;
        window.clearInterval(timer);
        setError(err.message || 'No se pudo completar la auditoría.');
        setStatus('error');
      });

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [requestUrl, attempt, workspaceId, businessId]);

  useEffect(() => {
    if (status !== 'success' || !result) return;
    const timer = window.setTimeout(() => onComplete(result), 700);
    return () => window.clearTimeout(timer);
  }, [status, result, onComplete]);

  const progressPercent = status === 'success'
    ? 100
    : Math.min(95, Math.round(((currentStep + 1) / steps.length) * 100));

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full bg-white rounded-3xl p-7 sm:p-10 shadow-2xl border border-slate-200 text-center">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border ${
          status === 'error'
            ? 'bg-rose-50 border-rose-100 text-rose-600'
            : status === 'success'
            ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
            : 'bg-indigo-50 border-indigo-100 text-indigo-600'
        }`}>
          {status === 'error' ? (
            <AlertCircle className="w-8 h-8" />
          ) : status === 'success' ? (
            <CheckCircle2 className="w-8 h-8" />
          ) : (
            <Loader2 className="w-8 h-8 animate-spin" />
          )}
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-3 max-w-full">
          <Globe className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span className="truncate">{requestUrl}</span>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 font-heading">
          {status === 'error' ? 'No pudimos completar la auditoría' : status === 'success' ? 'Auditoría técnica completada' : 'Analizando SEO real...'}
        </h2>

        <p className="text-xs sm:text-sm text-slate-500 mt-2">
          {status === 'error'
            ? 'No guardamos resultados incompletos.'
            : 'Revisamos el HTML y consultamos PageSpeed en móvil. Esa consulta puede tardar hasta 60 segundos; si no responde, conservamos los resultados técnicos y avisamos qué medición falta.'}
        </p>

        {status !== 'error' && (
          <>
            <div className="mt-8">
              <div className="flex justify-between text-xs font-semibold text-slate-600 mb-2">
                <span>{status === 'success' ? 'Auditoría técnica' : 'Progreso orientativo'}</span>
                <span className="text-indigo-600">{progressPercent}%</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div className="h-full bg-indigo-600 rounded-full transition-[background-color,color,transform] duration-150" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            <div className="mt-8 text-left space-y-2.5">
              {steps.map((step, index) => {
                const isDone = status === 'success';
                const isCurrent = status === 'running' && index === currentStep;
                return (
                  <div key={step} className={`flex items-center gap-3 p-2.5 rounded-xl ${
                    isCurrent ? 'bg-indigo-50 border border-indigo-100' : isDone ? 'opacity-90' : 'opacity-40'
                  }`}>
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                    )}
                    <span className="text-xs font-medium text-slate-700">{step}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {status === 'error' && (
          <div className="mt-6">
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-left text-xs text-rose-800">
              <strong className="block mb-1">Detalle:</strong>
              {error}
            </div>
            <form onSubmit={event => { event.preventDefault(); setRequestUrl(retryUrl); setAttempt(value => value + 1); }} className="mt-4 space-y-3 text-left">
              <label htmlFor="audit-retry-url" className="block text-xs font-semibold text-slate-700">Dirección web para reintentar</label>
              <input id="audit-retry-url" type="text" inputMode="url" autoComplete="url" required value={retryUrl} onChange={event => setRetryUrl(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              <p className="text-xs text-slate-500">Podés escribir el dominio sin protocolo: agregamos https:// automáticamente.</p>
              <button type="submit" className="vai-button vai-button-primary w-full">Reintentar auditoría</button>
            </form>
            <div className="mt-4 flex justify-center">
              <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-wider">
                Volver
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const AnalyzingView: React.FC<AnalyzingViewProps> = props => (
  <AnalyzingRequest key={`${props.workspaceId || 'local'}:${props.businessId || ''}:${props.url}`} {...props} />
);
