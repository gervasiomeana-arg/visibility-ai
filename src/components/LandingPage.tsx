import React, { useState } from 'react';
import { ArrowUpRight, ArrowRight, Search, BarChart3, ListChecks, Check } from 'lucide-react';
import { Brand } from './Brand';

interface LandingPageProps {
  onAnalyze: (url: string, businessName?: string, category?: string, city?: string) => void;
  onSelectPreset: (businessId: string) => void;
  showPresets?: boolean;
  analysisEnabled?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onAnalyze, onSelectPreset, showPresets = true, analysisEnabled = true }) => {
  const [urlInput, setUrlInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const handleFormSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!analysisEnabled) { setErrorMsg('Tu rol es de solo lectura. Pedí a un miembro con permisos que inicie la auditoría.'); return; }
    if (!urlInput.trim()) { setErrorMsg('Ingresá la dirección web de tu negocio.'); return; }
    const normalized = /^https?:\/\//i.test(urlInput.trim()) ? urlInput.trim() : `https://${urlInput.trim()}`;
    try {
      const parsed = new URL(normalized);
      if (!parsed.hostname.includes('.') || parsed.protocol !== 'https:') throw new Error('invalid');
    } catch { setErrorMsg('Ingresá una dirección HTTPS válida, por ejemplo https://tu-negocio.com.'); return; }
    setErrorMsg('');
    onAnalyze(normalized);
  };
  const presets = [
    { id: 'biz-hotel-mdp', name: 'Gran Hotel Bristol', city: 'Mar del Plata', tag: 'Hotelería' },
    { id: 'biz-restaurante-palermo', name: 'Trattoria Della Nonna', city: 'Palermo, CABA', tag: 'Gastronomía' },
    { id: 'biz-clinica-cordoba', name: 'Clínica Dental OdontoSalud', city: 'Córdoba', tag: 'Salud' },
  ];

  return <div className="vai-landing">
    <section className="vai-hero" aria-labelledby="landing-title">
      <div className="vai-hero-copy">
        <span className="vai-overline">Presencia digital / decisiones claras</span>
        <h1 id="landing-title" className="vai-editorial-title">Tu negocio, visto <em>con claridad.</em></h1>
        <p>Entendé qué encuentra Google en tu web, qué necesita atención y cuál es el siguiente paso. Un diagnóstico que podés leer y poner en práctica.</p>
        <form onSubmit={handleFormSubmit} className="vai-analyze-form">
          <label htmlFor="business-website">Empezá por la dirección de tu web</label>
          <div className="vai-analyze-input">
            <input id="business-website" type="text" inputMode="url" autoComplete="url" value={urlInput}
              onChange={event => { setUrlInput(event.target.value); setErrorMsg(''); }} placeholder="https://tu-negocio.com"
              aria-describedby={errorMsg ? 'website-error' : undefined} aria-invalid={Boolean(errorMsg)} />
            <button type="submit" className="vai-button vai-button-primary" disabled={!analysisEnabled}>
              {analysisEnabled ? 'Analizar mi web' : 'Solo lectura'}<ArrowUpRight size={17} />
            </button>
          </div>
          {errorMsg && <p role="alert" id="website-error" className="mt-2 text-xs text-rose-700">{errorMsg}</p>}
        </form>
        <span className="vai-hero-footnote"><Check size={12} /> Auditoría técnica real. La fuente de cada dato, a la vista.</span>
      </div>
      <aside className="vai-hero-board" aria-label="Ejemplo ilustrativo de un diagnóstico, no son datos de tu negocio">
        <div className="vai-board-top"><span className="vai-board-label">Lectura del negocio</span><span>Ejemplo DEMO</span></div>
        <p className="vai-board-site">Tu presencia, en perspectiva.</p>
        <p className="vai-board-description">Una vista para entender el estado de tu sitio.</p>
        <div className="vai-board-data">
          <div><p className="vai-overline mb-3">Índice ilustrativo</p><p className="vai-board-score">71<small>/100</small></p></div>
          <div aria-hidden="true"><div className="vai-board-bars">
            {[28, 39, 35, 51, 57, 49, 68, 76].map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}
          </div><div className="vai-board-legend"><span>Evolución de ejemplo</span><span>DEMO</span></div></div>
        </div>
        {[
          ['01', 'Estructura y contenido', 'Auditoría técnica'],
          ['02', 'Velocidad de la web', 'PageSpeed'],
          ['03', 'Búsquedas en Google', 'Al conectar tu cuenta'],
        ].map(([number, label, source]) => <div className="vai-board-row" key={number}>
          <span className="vai-board-number">{number}</span><strong>{label}</strong><span>{source}</span>
        </div>)}
        <div className="vai-board-task"><span className="vai-overline">Un siguiente paso concreto</span><p>Revisar la descripción de la página</p><small>Dato detectado, propuesta y método de comprobación. Todo en la misma tarea.</small></div>
      </aside>
    </section>
    <div className="vai-feature-strip">
      <div><Search size={20} /><span>Comprendé tu web<small>HTML inicial y señales técnicas</small></span></div>
      <div><BarChart3 size={20} /><span>Leé tus búsquedas<small>Datos de tu cuenta de Search Console</small></span></div>
      <div><ListChecks size={20} /><span>Avanzá con un plan<small>Prioridades, notas y seguimiento</small></span></div>
    </div>
    <section className="vai-method" aria-labelledby="method-title">
      <div className="vai-method-intro"><span className="vai-overline">De la evidencia a la acción</span>
        <h2 id="method-title" className="vai-section-title">Menos ruido.<br />Más criterio.</h2>
        <p>No necesitás interpretar un informe técnico entero. Visibility ordena la información para que sepas qué comprobamos y qué podés hacer.</p>
      </div>
      <div>
        {[
          ['01', 'Primero, los hechos.', 'Revisamos señales del HTML inicial y el rendimiento de la web. Cada resultado indica el alcance de la medición.'],
          ['02', 'Después, las prioridades.', 'Separá lo que necesita atención de lo que ya funciona. Conectá Search Console para consultar clics, impresiones y búsquedas reales.'],
          ['03', 'Un plan que sigue tu avance.', 'Consultá soluciones, guardá tus comprobaciones y volvé a medir. Los ejemplos DEMO siempre se distinguen de los datos reales.'],
        ].map(([number, title, description]) => <article key={number} className="vai-method-step">
          <span className="vai-overline">{number}</span><div><h3>{title}</h3><p>{description}</p></div>
        </article>)}
      </div>
    </section>
    {showPresets && <section className="vai-presets" aria-labelledby="presets-title">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
        <div><span className="vai-overline">Explorá el producto</span><h2 id="presets-title" className="text-xl font-semibold mt-2">Un diagnóstico de ejemplo</h2></div>
        <p className="text-xs text-slate-500">Negocios y resultados de demostración.</p>
      </div>
      {presets.map(preset => <button key={preset.id} type="button" className="vai-preset-row" onClick={() => onSelectPreset(preset.id)}>
        <div><strong>{preset.name}</strong><small>{preset.city} · {preset.tag}</small></div><span>DEMO</span><ArrowRight size={17} />
      </button>)}
    </section>}
    <footer className="vai-landing-footer"><Brand /><p>Auditoría, contexto y seguimiento para tu negocio.</p><span>Datos reales, parciales y DEMO identificados.</span></footer>
  </div>;
};
