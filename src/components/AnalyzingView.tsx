import React, { useState, useEffect } from 'react';
import { Search, Loader2, CheckCircle2, Sparkles, Globe, MapPin } from 'lucide-react';

interface AnalyzingViewProps {
  url: string;
  onComplete: () => void;
}

export const AnalyzingView: React.FC<AnalyzingViewProps> = ({ url, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { title: 'Preparando la ficha del negocio', desc: 'Normalizando la dirección web para el entorno de demostración' },
    { title: 'Cargando estructura de auditoría SEO', desc: 'Mostrando factores que luego se verificarán con fuentes reales' },
    { title: 'Preparando indicadores de rendimiento', desc: 'Vista previa del módulo que conectará PageSpeed y Core Web Vitals' },
    { title: 'Preparando comparación competitiva', desc: 'Cargando ejemplos para validar la experiencia de uso' },
    { title: 'Preparando visibilidad en IA', desc: 'Vista previa del módulo de presencia en motores y asistentes de IA' },
    { title: 'Armando el dashboard de demostración', desc: 'Organizando ejemplos, prioridades y acciones sin presentarlos como mediciones reales' },
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
            Preparando diagnóstico DEMO...
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Esta etapa prepara una demostración del producto. Las mediciones reales se incorporarán en las siguientes fases.
          </p>

          {/* Progress Bar */}
          <div className="mt-8">
            <div className="flex justify-between text-xs font-semibold text-slate-600 mb-2">
              <span>Preparación del demo</span>
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
            * No se están ejecutando todavía mediciones SEO, rankings ni Core Web Vitals reales.
          </div>
        </div>
      </div>
    </div>
  );
};
