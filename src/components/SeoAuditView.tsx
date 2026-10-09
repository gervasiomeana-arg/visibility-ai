import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  HelpCircle,
  Sparkles,
  Info,
  SlidersHorizontal,
} from 'lucide-react';
import { SeoAuditItem, Business, ActiveTab } from '../types';

interface SeoAuditViewProps {
  business: Business;
  items: SeoAuditItem[];
  auditMeta?: any | null;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAssistant: () => void;
  onReanalyze: () => void;
}

export const SeoAuditView: React.FC<SeoAuditViewProps> = ({
  business,
  items,
  auditMeta,
  setActiveTab,
  onOpenAssistant,
  onReanalyze,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    'all',
    'Contenido y On-Page',
    'Técnico e Indexación',
    'Velocidad y Móvil',
    'Seguridad y Datos',
  ];

  const filteredItems = items.filter((item) => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
    if (searchTerm) {
      const matchTitle = item.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchExp = item.simpleExplanation.toLowerCase().includes(searchTerm.toLowerCase());
      return matchTitle || matchExp;
    }
    return true;
  });

  const okCount = items.filter((i) => i.status === 'ok').length;
  const warningCount = items.filter((i) => i.status === 'warning').length;
  const errorCount = items.filter((i) => i.status === 'error').length;
  const realCount = items.filter((i) => i.source === 'real').length;
  const isRealAudit = items.length > 0 && realCount === items.length;

  return (
    <div className="space-y-6 pb-14">
      {/* Header with clear DEMO banner */}
      <div className="vai-shell">
        <div className="vai-core vai-panel p-6 sm:p-8 lg:p-9">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2">
              <Search className="w-3.5 h-3.5 text-indigo-600" />
              <span>AUDITORÍA SEO INTEGRAL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
              Auditoría Técnica y Contenido SEO
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
              {isRealAudit
                ? <>Resultados técnicos obtenidos directamente desde la web de <strong>{business.name}</strong>.</>
                : <>Vista demostrativa de factores SEO para <strong>{business.name}</strong>.</>}
            </p>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
          <div className={`border rounded-xl p-3 max-w-xs text-xs ${isRealAudit ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
            <div className="flex items-center gap-1.5 font-bold mb-0.5">
              {isRealAudit ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
              <span>{isRealAudit ? 'DATOS REALES · AUDITORÍA TÉCNICA' : 'DATOS DE SIMULACIÓN (DEMO)'}</span>
            </div>
            <p className={`text-[11px] leading-tight ${isRealAudit ? 'text-emerald-800' : 'text-amber-800'}`}>
              {isRealAudit
                ? 'Title, meta description, encabezados, canonical, indexación, ALT, robots.txt, sitemap y respuesta HTTP fueron verificados en el sitio.'
                : 'Todavía no hay una auditoría técnica real guardada para este negocio.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onReanalyze}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-[0.12em] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.985]"
          >
            Volver a analizar
          </button>
          </div>
        </div>

        </div>

        {/* Status Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-100/80">
          <div className="p-3 rounded-xl bg-slate-50/70 ring-1 ring-slate-200/70 flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Correctos</span>
            <span className="text-lg font-bold text-emerald-600">{okCount} / {items.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50/70 ring-1 ring-slate-200/70 flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Mejorables</span>
            <span className="text-lg font-bold text-amber-600">{warningCount} / {items.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50/70 ring-1 ring-slate-200/70 flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Atención Crítica</span>
            <span className="text-lg font-bold text-rose-600">{errorCount} / {items.length}</span>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'all' ? 'Todas las categorías' : cat}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative shrink-0 sm:w-64">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar factor SEO..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50/70 ring-1 ring-slate-200/70 text-xs text-slate-900 focus:outline-none focus:ring-indigo-300 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {isRealAudit && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="vai-panel rounded-[1.25rem] ring-1 ring-slate-200/60 p-4">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">URL verificada</span>
            <p className="mt-1 text-xs font-semibold text-slate-800 break-all">{auditMeta?.finalUrl || business.url}</p>
          </div>
          <div className="vai-panel rounded-[1.25rem] ring-1 ring-slate-200/60 p-4">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Última auditoría</span>
            <p className="mt-1 text-xs font-semibold text-slate-800">
              {auditMeta?.fetchedAt ? new Date(auditMeta.fetchedAt).toLocaleString('es-AR') : 'Sin fecha registrada'}
            </p>
          </div>
          <div className={`rounded-2xl border p-4 ${auditMeta?.pageSpeedError ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <span className={`text-[10px] uppercase tracking-wider font-bold ${auditMeta?.pageSpeedError ? 'text-amber-700' : 'text-emerald-700'}`}>
              Google PageSpeed
            </span>
            <p className={`mt-1 text-xs font-semibold ${auditMeta?.pageSpeedError ? 'text-amber-900' : 'text-emerald-900'}`}>
              {auditMeta?.pageSpeedError
                ? `No disponible: ${auditMeta.pageSpeedError}`
                : auditMeta?.pageSpeed?.performanceScore !== null && auditMeta?.pageSpeed?.performanceScore !== undefined
                ? `Medición móvil real: ${auditMeta.pageSpeed.performanceScore}/100`
                : 'Sin medición disponible'}
            </p>
          </div>
        </div>
      )}

      {/* Grid of SEO items */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filteredItems.map((item) => {
          const isH1 = item.key === 'h1';
          const isOpenVoley =
            business.name.toLowerCase().includes('voley') ||
            business.url.toLowerCase().includes('openvoley');

          const effectiveStatus = isH1 && item.status === 'error' ? 'warning' : item.status;
          const isOk = effectiveStatus === 'ok';
          const isWarning = effectiveStatus === 'warning';
          const isError = effectiveStatus === 'error';

          const effectiveStatusLabel =
            isH1 && isWarning
              ? 'Pendiente en página renderizada'
              : item.statusLabel;

          const effectiveExplanation =
            isH1 && isWarning
              ? 'H1 no detectado en HTML inicial; pendiente de comprobar en la página renderizada. El auditor inspecciona únicamente el HTML inicial recibido desde el servidor sin ejecutar JavaScript; no se presenta como una ausencia confirmada ni como un error crítico únicamente por ese resultado, dado que podría existir contenido generado en el cliente.'
              : item.simpleExplanation;

          const proposedChange =
            isH1 && isOpenVoley
              ? 'Definir o confirmar un encabezado <h1> en la plantilla o HTML inicial. Borrador propuesto: "Open Voley: scouting y estadísticas para entrenadores".'
              : item.proposedChange || item.solution;

          return (
            <div
              key={item.id}
              className={`vai-panel rounded-[1.35rem] p-5 ring-1 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 flex flex-col justify-between ${
                isError
                  ? 'ring-rose-200/80 hover:ring-rose-300'
                  : isWarning
                  ? 'ring-amber-200/80 hover:ring-amber-300'
                  : 'ring-slate-200/70 hover:ring-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    {item.category}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                      isOk
                        ? 'bg-emerald-50 text-emerald-700'
                        : isWarning
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {isOk && <CheckCircle2 className="w-3 h-3" />}
                    {isWarning && <AlertTriangle className="w-3 h-3" />}
                    {isError && <AlertCircle className="w-3 h-3" />}
                    <span>{effectiveStatusLabel}</span>
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 font-heading">
                  {item.title}
                </h3>

                {item.metricValue && (
                  <p className="text-xs font-semibold text-slate-700 mt-1">
                    {item.source === 'real' ? 'Valor verificado:' : 'Valor DEMO:'} <span className="text-indigo-600 font-bold">{item.metricValue}</span>
                  </p>
                )}

                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {effectiveExplanation}
                </p>

                {isH1 && isOpenVoley && (
                  <div className="mt-2.5 p-2.5 bg-sky-50/80 border border-sky-200/90 rounded-xl text-[11px] text-sky-950 flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[10px] uppercase tracking-wider text-sky-800 block mb-0.5">
                        Evidencia aportada por el usuario
                      </span>
                      <p className="leading-relaxed">
                        Comprobación manual del usuario: se detectó un encabezado H1 en el DOM renderizado en el navegador. (Evidencia aportada por el usuario, no medición automática del servidor).
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100/80 space-y-2">
                <div className="text-[11px] text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900 block font-heading">Solución recomendada:</strong>
                    <span className="text-[10px] text-slate-400">Sin suponer WordPress o Wix</span>
                  </div>
                  {proposedChange ? (
                    <div className="space-y-1.5 text-[11px] leading-relaxed">
                      <p><strong className="text-slate-800">Propuesta:</strong> {proposedChange}</p>
                      {item.howToVerify && (
                        <p><strong className="text-slate-800">Comprobación:</strong> {item.howToVerify}</p>
                      )}
                    </div>
                  ) : (
                    <span className="leading-relaxed">{item.solution}</span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500 text-[11px]">
                    Impacto: <strong>{item.impact}</strong>
                  </span>
                  <button
                    onClick={onOpenAssistant}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    Consultar a la IA
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
