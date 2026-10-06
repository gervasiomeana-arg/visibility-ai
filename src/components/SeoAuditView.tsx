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
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAssistant: () => void;
}

export const SeoAuditView: React.FC<SeoAuditViewProps> = ({
  business,
  items,
  setActiveTab,
  onOpenAssistant,
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

  return (
    <div className="space-y-6 pb-12">
      {/* Header with clear DEMO banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2">
              <Search className="w-3.5 h-3.5 text-indigo-600" />
              <span>AUDITORÍA SEO INTEGRAL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
              Auditoría Técnica y Contenido SEO
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
              Vista demostrativa de factores SEO que luego serán verificados con fuentes reales para <strong>{business.name}</strong>.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 max-w-xs text-xs text-amber-900 shrink-0">
            <div className="flex items-center gap-1.5 font-bold mb-0.5">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>DATOS DE SIMULACIÓN (DEMO)</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-tight">
              Arquitectura desacoplada lista para conectar con Google Search Console y PageSpeed API.
            </p>
          </div>
        </div>

        {/* Status Counters */}
        <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Correctos</span>
            <span className="text-lg font-bold text-emerald-600">{okCount} / 14</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Mejorables</span>
            <span className="text-lg font-bold text-amber-600">{warningCount} / 14</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Atención Crítica</span>
            <span className="text-lg font-bold text-rose-600">{errorCount} / 14</span>
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
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors cursor-pointer ${
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
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {/* Grid of SEO items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredItems.map((item) => {
          const isOk = item.status === 'ok';
          const isWarning = item.status === 'warning';
          const isError = item.status === 'error';

          return (
            <div
              key={item.id}
              className={`bg-white rounded-2xl p-5 border shadow-xs transition-all flex flex-col justify-between ${
                isError
                  ? 'border-rose-200 hover:border-rose-300'
                  : isWarning
                  ? 'border-amber-200 hover:border-amber-300'
                  : 'border-slate-200 hover:border-slate-300'
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
                    <span>{item.statusLabel}</span>
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 font-heading">
                  {item.title}
                </h3>

                {item.metricValue && (
                  <p className="text-xs font-semibold text-slate-700 mt-1">
                    Valor DEMO: <span className="text-indigo-600 font-bold">{item.metricValue}</span>
                  </p>
                )}

                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {item.simpleExplanation}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <div className="text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <strong className="text-slate-900 block mb-0.5">Cómo resolverlo:</strong>
                  <span>{item.solution}</span>
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
