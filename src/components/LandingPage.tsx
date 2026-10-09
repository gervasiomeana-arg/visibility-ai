import React, { useState } from 'react';
import {
  Search,
  ArrowRight,
  Sparkles,
  Globe,
  MapPin,
  CheckCircle2,
  TrendingUp,
  Cpu,
  BarChart,
  ShieldCheck,
  Zap,
  Building2,
  Compass,
} from 'lucide-react';

interface LandingPageProps {
  onAnalyze: (url: string, businessName?: string, category?: string, city?: string) => void;
  onSelectPreset: (businessId: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onAnalyze, onSelectPreset }) => {
  const [urlInput, setUrlInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      setErrorMsg('Por favor ingresá la dirección web de tu negocio.');
      return;
    }

    const normalized = urlInput.trim().startsWith('http://') || urlInput.trim().startsWith('https://')
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
    {
      id: 'biz-hotel-mdp',
      name: 'Gran Hotel Bristol',
      city: 'Mar del Plata',
      category: 'Hotelería y Turismo',
      url: 'https://granhotelbristol.com.ar',
      score: '71/100',
      tag: 'Ejemplo Hotelería',
    },
    {
      id: 'biz-restaurante-palermo',
      name: 'Trattoria Della Nonna',
      city: 'Palermo, CABA',
      category: 'Gastronomía y Pastas',
      url: 'https://trattoriadellanonna.com',
      score: '64/100',
      tag: 'Ejemplo Restaurante',
    },
    {
      id: 'biz-clinica-cordoba',
      name: 'Clínica Dental OdontoSalud',
      city: 'Córdoba Capital',
      category: 'Salud y Odontología',
      url: 'https://odontosaludplus.com',
      score: '78/100',
      tag: 'Ejemplo Salud',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900">
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden px-4 sm:px-6 lg:px-8">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-indigo-100/70 to-transparent blur-3xl -z-10 pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center">
          {/* Slogan Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>¿Mi negocio aparece donde buscan mis clientes?</span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15] font-heading">
            Descubrí qué tan visible es tu negocio en Internet.
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-base sm:text-lg lg:text-xl text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
            Visibility AI combina auditoría técnica real, PageSpeed, Search Console y módulos claramente identificados como DEMO para mostrarte qué mejorar sin mezclar hechos con estimaciones.
          </p>

          {/* Search Box Form */}
          <div className="mt-10 max-w-2xl mx-auto">
            <form onSubmit={handleFormSubmit} className="relative shadow-xl rounded-2xl bg-white border border-slate-200/80 p-2 sm:p-2.5 transition-all focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="flex items-center gap-3 w-full px-3 py-2 text-slate-400">
                  <Globe className="w-5 h-5 text-indigo-500 shrink-0" />
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="Ingresá la web de tu negocio (ej: https://mihotel.com)"
                    className="w-full bg-transparent text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] shrink-0 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>ANALIZAR MI NEGOCIO</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {errorMsg && (
              <p className="mt-2 text-xs text-rose-600 font-medium text-left px-2">
                {errorMsg}
              </p>
            )}

            {/* Core Pillars listed under the button */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Google
              </span>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> SEO
              </span>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Web
              </span>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Competidores
              </span>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Contenido
              </span>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Inteligencia Artificial
              </span>
            </div>
          </div>

          {/* Quick 1-click Preset Demos */}
          <div className="mt-12 pt-8 border-t border-slate-200 max-w-3xl mx-auto">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3">
              O probá un diagnóstico ya listo con 1 clic:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelectPreset(p.id)}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {p.tag}
                    </span>
                    <span className="text-xs font-bold text-slate-700">{p.score}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {p.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {p.city}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step Process Section */}
      <section className="py-16 bg-slate-900 text-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400">
              Simple, claro y sin tecnicismos
            </h2>
            <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-white font-heading">
              Cómo funciona en tres simples pasos
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700 relative">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-lg mb-4 border border-indigo-500/30">
                1
              </div>
              <h3 className="text-lg font-bold text-white font-heading">
                Ingresás tu web.
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Sin registros complejos ni instalaciones. Solo indicás la dirección web de tu hotel, restaurante, consultorio o comercio.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700 relative">
              <div className="w-12 h-12 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-lg mb-4 border border-blue-500/30">
                2
              </div>
              <h3 className="text-lg font-bold text-white font-heading">
                Visibility AI prepara tu diagnóstico.
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                La auditoría técnica, PageSpeed y Search Console pueden aportar datos reales cuando están configurados. Lo que todavía no tenga una fuente verificable se muestra como DEMO.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700 relative">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold text-lg mb-4 border border-emerald-500/30">
                3
              </div>
              <h3 className="text-lg font-bold text-white font-heading">
                Recibís oportunidades y acciones.
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Te mostramos problemas y oportunidades en lenguaje humano. La comparación competitiva solo se presentará como real cuando exista una fuente verificable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition for Non-Technical Business Owners */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              Diseñado para dueños de empresas
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 font-heading">
              Dejá de descifrar reportes técnicos incomprensibles.
            </h2>
            <p className="mt-4 text-sm text-slate-600 leading-relaxed">
              Las agencias y herramientas tradicionales te inundan con términos como <em>canonical tags</em>, <em>crawl budget</em> y gráficos indescifrables.
            </p>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              En <strong>Visibility AI</strong> transformamos cada hallazgo verificable en una decisión de negocio: <em>¿qué problema conviene corregir primero? ¿qué consultas reales muestran interés? ¿qué acción puede mejorar la experiencia de contacto?</em>
            </p>

            <div className="mt-6 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-slate-700 font-medium">
                  <strong>Puntuación 0 a 100:</strong> Resumen derivado de las señales disponibles, con su fuente claramente indicada.
                </span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-slate-700 font-medium">
                  <strong>Plan de acción priorizado:</strong> Sabés exactamente qué corregir hoy, qué la semana que viene y qué delegar.
                </span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-slate-700 font-medium">
                  <strong>Generador de contenido IA:</strong> Redactá páginas y artículos optimizados para tu negocio con un solo clic.
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Card Preview */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                  71
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Visibilidad Digital</h4>
                  <p className="text-[11px] text-slate-500">Ejemplo: Hotel en Mar del Plata</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                23 Oportunidades
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-100">
                <p className="text-xs font-bold text-rose-900">🔴 Problema Importante</p>
                <p className="text-xs text-rose-700 mt-0.5">
                  Ejemplo DEMO: la velocidad móvil podría convertirse en una prioridad cuando exista una medición real.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100">
                <p className="text-xs font-bold text-amber-900">🟡 Oportunidad Comercial</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Ejemplo DEMO: una keyword local puede revelar una oportunidad de contenido cuando contemos con datos reales.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-indigo-900">✨ Solución con IA</p>
                  <p className="text-[11px] text-indigo-700">Crear página: Hotel Familiar en Mar del Plata</p>
                </div>
                <span className="text-[10px] font-bold bg-indigo-600 text-white px-2.5 py-1 rounded-md">
                  GENERAR
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-700">VISIBILITY AI · SaaS de Diagnóstico y Crecimiento Digital</p>
        <p className="mt-1">Diseñado para hoteles, gastronomía, salud, comercios y pymes.</p>
      </footer>
    </div>
  );
};
