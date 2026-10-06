import React, { useState, useEffect } from 'react';
import { Search, Loader2, CheckCircle2, Sparkles, Globe, MapPin } from 'lucide-react';

interface AnalyzingViewProps {
  url: string;
  onComplete: () => void;
}

export const AnalyzingView: React.FC<AnalyzingViewProps> = ({ url, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { title: 'Conectando con la web y comprobando seguridad HTTPS', desc: 'Validando certificado y tiempo de respuesta inicial' },
    { title: 'Analizando indexación en Google y presencia en Google Maps', desc: 'Comprobando si tus páginas aparecen en las búsquedas locales' },
    { title: 'Midiendo velocidad móvil (Core Web Vitals)', desc: 'Calculando tiempo de carga en conexiones móviles reales' },
    { title: 'Rastreando hasta 5 competidores en tu ciudad y rubro', desc: 'Comparando autoridad y posiciones de palabras clave' },
    { title: 'Evaluando visibilidad en motores de IA (ChatGPT, Gemini)', desc: 'Revisando si las inteligencias artificiales recomiendan tu negocio' },
    { title: 'Generando diagnóstico comercial y oportunidades', desc: 'Traduciendo datos técnicos a un plan de acción comprensible' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            onComplete();
          }, 800);
          return prev;
        }
      });
    }, 700);

    return () => clearInterval(interval);
  }, [onComplete, steps.length]);

  const progressPercent = Math.min(100, Math.round(((currentStep + 1) / steps.length) * 100));

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-200 text-center relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-indigo-500/10 blur-2xl pointer-events-none" />

        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-3">
            <Globe className="w-3.5 h-3.5 text-indigo-500" />
            <span className="truncate max-w-[280px]">{url}</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            Analizando presencia digital...
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Estamos revisando tu negocio desde la perspectiva de tus clientes.
          </p>

          {/* Progress Bar */}
          <div className="mt-8">
            <div className="flex justify-between text-xs font-semibold text-slate-600 mb-2">
              <span>Diagnóstico en curso</span>
              <span className="text-indigo-600">{progressPercent}%</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Steps List */}
          <div className="mt-8 text-left space-y-3.5">
            {steps.map((step, index) => {
              const isDone = index < currentStep;
              const isCurrent = index === currentStep;

              return (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-2.5 rounded-xl transition-all ${
                    isCurrent
                      ? 'bg-indigo-50/80 border border-indigo-100'
                      : isDone
                      ? 'opacity-85'
                      : 'opacity-40'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : isCurrent ? (
                      <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 leading-tight">
                      {step.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 text-[11px] text-slate-400 italic">
            * Muestra de diagnóstico rápido. No cerres esta ventana.
          </div>
        </div>
      </div>
    </div>
  );
};
