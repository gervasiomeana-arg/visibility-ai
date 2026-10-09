import React, { useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Gauge,
  Globe,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

interface LandingPageProps {
  onAnalyze: (url: string, businessName?: string, category?: string, city?: string) => void;
  onSelectPreset: (businessId: string) => void;
  showPresets?: boolean;
  analysisEnabled?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onAnalyze,
  onSelectPreset,
  showPresets = true,
  analysisEnabled = true,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!analysisEnabled) {
      setErrorMsg('Tu rol es de solo lectura. Un owner, admin o member puede iniciar nuevas auditorías.');
      return;
    }

    if (!urlInput.trim()) {
      setErrorMsg('Por favor ingresá la dirección web de tu negocio.');
      return;
    }

    const normalized =
      urlInput.trim().startsWith('http://') || urlInput.trim().startsWith('https://')
        ? urlInput.trim()
        : `https://${urlInput.trim()}`;

    try {
      const parsed = new URL(normalized);
      if (!parsed.hostname.includes('.') || parsed.protocol !== 'https:') {
        throw new Error('invalid');
      }
    } catch {
      setErrorMsg('Ingresá una URL válida con dominio, por ejemplo https://mihotel.com.');
      return;
    }

    setErrorMsg('');
    onAnalyze(normalized);
  };

  const presets = [
    { id: 'biz-hotel-mdp', name: 'Gran Hotel Bristol', city: 'Mar del Plata', score: '71/100', tag: 'Hotelería' },
    { id: 'biz-restaurante-palermo', name: 'Trattoria Della Nonna', city: 'Palermo, CABA', score: '64/100', tag: 'Gastronomía' },
    { id: 'biz-clinica-cordoba', name: 'Clínica Dental OdontoSalud', city: 'Córdoba Capital', score: '78/100', tag: 'Salud' },
  ];

  return (
    <div className="min-h-screen text-slate-950">
      <section className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 lg:pt-16 pb-16 lg:pb-24">
        <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_15%_15%,rgba(79,70,229,0.14),transparent_28rem),radial-gradient(circle_at_80%_20%,rgba(13,148,136,0.08),transparent_24rem)] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-[1.02fr_0.98fr] gap-10 lg:gap-16 items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 ring-1 ring-slate-200/70 px-3 py-1.5 text-[11px] font-semibold text-indigo-700 shadow-sm backdrop-blur">
              <Sparkles className="w-3.5 h-3.5" />
              Visibilidad digital explicada para dueños de negocios
            </div>

            <h1 className="mt-6 text-4xl sm:text-5xl xl:text-7xl font-heading font-bold tracking-[-0.055em] leading-[0.98] text-balance">
              Sabé dónde estás perdiendo visibilidad
              <span className="block text-indigo-600">antes de perder clientes.</span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-slate-600 leading-8 max-w-xl text-pretty">
              Visibility AI reúne auditoría técnica, PageSpeed y Search Console en un diagnóstico claro:
              qué está bien, qué está frenando tu negocio y qué conviene hacer primero.
            </p>

            <form
              onSubmit={handleFormSubmit}
              className="mt-8 max-w-2xl rounded-[1.4rem] bg-white/95 p-2 shadow-[0_24px_70px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/70 backdrop-blur"
            >
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 flex items-center gap-3 px-4 py-3">
                  <Globe className="w-5 h-5 text-indigo-600 shrink-0" />
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="https://tu-negocio.com"
                    className="w-full bg-transparent text-sm sm:text-base text-slate-950 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!analysisEnabled}
                  className="group px-5 py-3.5 rounded-[1rem] bg-slate-950 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-[0.1em] flex items-center justify-center gap-2 transition-all active:scale-[0.985]"
                >
                  {analysisEnabled ? 'Analizar ahora' : 'Solo lectura'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </form>

            {errorMsg && <p className="mt-2 text-xs font-semibold text-rose-600">{errorMsg}</p>}

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
              {[
                ['Auditoría técnica', 'REAL cuando se mide'],
                ['Search Console', 'REAL al conectar'],
                ['Competidores', 'DEMO hasta medir'],
              ].map(([label, state]) => (
                <div key={label} className="rounded-2xl bg-white/70 ring-1 ring-slate-200/70 px-4 py-3 backdrop-blur">
                  <p className="text-xs font-bold text-slate-900">{label}</p>
                  <p className="mt-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{state}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />
            <div className="relative rounded-[2rem] bg-slate-950 text-white p-5 sm:p-6 lg:p-7 shadow-[0_36px_90px_rgba(15,23,42,0.26)] ring-1 ring-white/10 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(99,102,241,0.28),transparent_18rem),radial-gradient(circle_at_10%_90%,rgba(20,184,166,0.13),transparent_20rem)]" />

              <div className="relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-300">Diagnóstico ejecutivo</p>
                    <h2 className="mt-1 text-xl sm:text-2xl font-heading font-bold">Panorama de visibilidad</h2>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/10 ring-1 ring-white/10 text-slate-300">Vista ejemplo</span>
                </div>

                <div className="mt-6 grid grid-cols-[1.05fr_0.95fr] gap-3">
                  <div className="rounded-[1.4rem] bg-white/[0.06] ring-1 ring-white/10 p-5">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Score general</p>
                        <p className="mt-2 text-5xl font-heading font-black font-tabular">71</p>
                      </div>
                      <span className="text-xs font-semibold text-emerald-300">+ señales reales</span>
                    </div>
                    <div className="mt-5 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full w-[71%] rounded-full bg-gradient-to-r from-indigo-400 to-emerald-300" />
                    </div>
                  </div>

                  <div className="rounded-[1.4rem] bg-white/[0.06] ring-1 ring-white/10 p-4 space-y-3">
                    {[
                      ['SEO', '62', 'REAL'],
                      ['Web', '68', 'REAL'],
                      ['Google', '—', 'AL CONECTAR'],
                    ].map(([label, value, source]) => (
                      <div key={label} className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold">{label}</p>
                          <p className="text-[9px] text-slate-500 uppercase tracking-wider">{source}</p>
                        </div>
                        <span className="font-bold font-tabular text-sm">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 grid sm:grid-cols-3 gap-3">
                  {[
                    ['Problemas críticos', '3', 'Prioridad alta'],
                    ['Oportunidades', '8', 'Para revisar'],
                    ['Consultas Google', '24', 'Search Console'],
                  ].map(([label, value, source]) => (
                    <div key={label} className="rounded-2xl bg-white/[0.045] ring-1 ring-white/10 p-4">
                      <p className="text-[10px] text-slate-400">{label}</p>
                      <div className="mt-2 flex items-end justify-between gap-2">
                        <span className="text-2xl font-bold font-heading font-tabular">{value}</span>
                        <span className="text-[9px] text-slate-500 text-right">{source}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 rounded-2xl bg-indigo-500/10 ring-1 ring-indigo-400/20 p-4 flex items-start gap-3">
                  <TrendingUp className="w-4 h-4 text-indigo-300 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold">Qué haría primero Visibility AI</p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-400">
                      Priorizar los hallazgos verificables y dejar cualquier supuesto claramente marcado como DEMO.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showPresets && (
          <div className="relative max-w-7xl mx-auto mt-12 lg:mt-16 pt-8 border-t border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Modo demostración</p>
                <h3 className="mt-1 text-lg font-heading font-bold text-slate-950">Probá cómo se ve un diagnóstico completo</h3>
              </div>
              <p className="text-xs text-slate-500">Estos negocios y scores son ejemplos DEMO.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onSelectPreset(preset.id)}
                  className="text-left rounded-[1.35rem] bg-white/90 ring-1 ring-slate-200/70 p-4 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">{preset.tag}</span>
                    <span className="text-xs font-bold font-tabular">{preset.score}</span>
                  </div>
                  <p className="mt-3 text-sm font-bold text-slate-950">{preset.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{preset.city}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="px-4 sm:px-6 lg:px-8 py-16 lg:py-20 bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16">
            <div>
              <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-indigo-300">De dato técnico a decisión</span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-heading font-bold tracking-[-0.04em] text-balance">
                No necesitás aprender SEO para entender qué hacer.
              </h2>
              <p className="mt-4 text-sm text-slate-400 leading-7 max-w-lg">
                El objetivo no es mostrar más gráficos. Es separar evidencia, contexto y recomendación para que cada pantalla responda una pregunta de negocio.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              {[
                [Search, '1. Medimos', 'Auditamos señales técnicas verificables de tu sitio.'],
                [BarChart3, '2. Ordenamos', 'Priorizamos por impacto y mostramos la fuente de cada dato.'],
                [CheckCircle2, '3. Actuás', 'Convertimos hallazgos en tareas claras y seguimiento histórico.'],
              ].map(([Icon, title, text]) => {
                const C = Icon as React.ElementType;
                return (
                  <div key={String(title)} className="rounded-[1.4rem] bg-white/[0.05] ring-1 ring-white/10 p-5">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-indigo-300">
                      <C className="w-5 h-5" />
                    </div>
                    <h3 className="mt-5 text-sm font-bold">{String(title)}</h3>
                    <p className="mt-2 text-xs leading-6 text-slate-400">{String(text)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1fr_1fr] gap-10 lg:gap-16 items-center">
          <div className="rounded-[1.7rem] bg-white ring-1 ring-slate-200/70 p-6 sm:p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <div className="grid grid-cols-2 gap-3">
              {[
                [Gauge, 'PageSpeed', 'Rendimiento y Core Web Vitals'],
                [Search, 'SEO técnico', 'Etiquetas, estructura y rastreo'],
                [BarChart3, 'Search Console', 'Consultas, clics e impresiones'],
                [ShieldCheck, 'Provenance', 'REAL, PARCIAL y DEMO separados'],
              ].map(([Icon, title, text]) => {
                const C = Icon as React.ElementType;
                return (
                  <div key={String(title)} className="rounded-2xl bg-slate-50/80 ring-1 ring-slate-200/70 p-4">
                    <C className="w-5 h-5 text-indigo-600" />
                    <p className="mt-4 text-sm font-bold text-slate-950">{String(title)}</p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">{String(text)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-indigo-600">Diseñado para vender una decisión, no un reporte</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-heading font-bold tracking-[-0.04em] text-balance">
              Una plataforma que un dueño puede entender en minutos.
            </h2>
            <p className="mt-5 text-sm sm:text-base text-slate-600 leading-7">
              Cada módulo está pensado para responder algo concreto: qué funciona, qué está fallando, qué buscan tus clientes y qué conviene priorizar.
            </p>

            <div className="mt-7 space-y-3">
              {[
                'Auditoría y PageSpeed con fuente real cuando están disponibles.',
                'Search Console conectado a la cuenta del usuario.',
                'Plan de acción y evolución con provenance visible.',
                'Competidores permanecen DEMO hasta contar con una fuente verificable.',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200/80 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <p className="font-semibold text-slate-700">VISIBILITY AI · Digital Visibility Intelligence</p>
          <p>Datos reales cuando existen. DEMO cuando todavía no hay fuente.</p>
        </div>
      </footer>
    </div>
  );
};
