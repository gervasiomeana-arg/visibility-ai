import React, { useEffect, useState } from 'react';
import {
  KeyRound,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Search,
  Plus,
  Info,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { KeywordItem, Business, ActiveTab } from '../types';
import { searchConsoleService, SearchConsoleSite } from '../services/searchConsoleService';
import { storageService } from '../services/storageService';

interface KeywordsViewProps {
  business: Business;
  keywords: KeywordItem[];
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAssistant: () => void;
}

export const KeywordsView: React.FC<KeywordsViewProps> = ({
  business,
  keywords: initialKeywords,
  setActiveTab,
  onOpenAssistant,
}) => {
  const [keywords, setKeywords] = useState<KeywordItem[]>(initialKeywords);
  const [searchTerm, setSearchTerm] = useState('');
  const [intentFilter, setIntentFilter] = useState<string>('all');
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [gscConfigured, setGscConfigured] = useState(false);
  const [gscConnected, setGscConnected] = useState(false);
  const [gscLoading, setGscLoading] = useState(false);
  const [gscError, setGscError] = useState('');
  const [gscSites, setGscSites] = useState<SearchConsoleSite[]>([]);
  const [selectedSite, setSelectedSite] = useState('');

  useEffect(() => {
    setKeywords(initialKeywords);
  }, [initialKeywords, business.id]);

  useEffect(() => {
    let cancelled = false;

    searchConsoleService.status()
      .then(async (status) => {
        if (cancelled) return;
        setGscConfigured(status.configured);
        setGscConnected(status.connected);

        if (status.connected) {
          const sites = await searchConsoleService.sites();
          if (cancelled) return;
          setGscSites(sites);

          let host = '';
          try {
            host = new URL(business.url).hostname.replace(/^www\./, '');
          } catch {
            host = '';
          }

          const preferred = sites.find((site) => site.siteUrl.includes(host)) || sites[0];
          if (preferred) setSelectedSite(preferred.siteUrl);
        }
      })
      .catch(() => {
        if (!cancelled) setGscError('No se pudo consultar Google Search Console.');
      });

    return () => {
      cancelled = true;
    };
  }, [business.id, business.url]);

  const filteredKeywords = keywords.filter((kw) => {
    if (intentFilter !== 'all' && kw.intent !== intentFilter) return false;
    if (searchTerm && !kw.keyword.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeywordInput.trim()) return;

    const newItem: KeywordItem = {
      id: `kw-${Date.now()}`,
      businessId: business.id,
      keyword: newKeywordInput.trim(),
      position: 0,
      searchVolume: 0,
      difficulty: 'Media',
      evolution: 0,
      intent: 'Comercial',
      url: business.url,
    };

    setKeywords([newItem, ...keywords]);
    setNewKeywordInput('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2">
              <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
              <span>POSICIONAMIENTO EN GOOGLE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
              Palabras Clave de Búsqueda
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
              Monitoreo de las búsquedas con las que tus clientes potenciales te encuentran en Google y dónde se encuentra <strong>{business.name}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Rastrear palabra clave</span>
            </button>
          </div>
        </div>

        {/* Demo Data Notice */}
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>
              <strong>DATOS DEMO:</strong> Las filas precargadas son ejemplos. Las palabras agregadas manualmente quedan pendientes de medición hasta conectar una fuente real.
            </span>
          </div>
          <button
            onClick={onOpenAssistant}
            className="text-indigo-600 hover:text-indigo-800 font-medium underline shrink-0 hidden sm:block cursor-pointer"
          >
            ¿Qué keywords me convienen?
          </button>
        </div>

        {/* Search & Filters */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto no-scrollbar pb-1">
            {['all', 'Comercial', 'Local', 'Transaccional', 'Informativa'].map((intent) => (
              <button
                key={intent}
                onClick={() => setIntentFilter(intent)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors cursor-pointer ${
                  intentFilter === intent
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {intent === 'all' ? 'Todas las intenciones' : intent}
              </button>
            ))}
          </div>

          <div className="relative shrink-0 sm:w-64">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar palabra clave..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {/* Keywords Table matching user prompt exactly */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 sm:px-6">Palabra clave</th>
                <th className="py-3.5 px-4 text-center">Posición</th>
                <th className="py-3.5 px-4 text-right">Volumen</th>
                <th className="py-3.5 px-4 text-center">Dificultad</th>
                <th className="py-3.5 px-4 text-center">Evolución</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredKeywords.map((kw) => {
                const hasMeasurement = kw.position > 0;
                const isTop10 = hasMeasurement && kw.position <= 10;
                const isGoodRank = hasMeasurement && kw.position <= 20;

                return (
                  <tr key={kw.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="font-semibold text-slate-900">{kw.keyword}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="bg-slate-100 px-1.5 py-0.2 rounded text-slate-600 font-medium">
                          {kw.intent}
                        </span>
                        <span className="truncate max-w-[200px]">{kw.url}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center font-bold px-2.5 py-1 rounded-lg text-xs ${
                          isTop10
                            ? 'bg-emerald-100 text-emerald-800'
                            : isGoodRank
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {hasMeasurement ? `#${kw.position}` : 'Pendiente'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                      {kw.searchVolume > 0 ? kw.searchVolume.toLocaleString('es-AR') : 'Pendiente'}
                      <span className="text-[11px] text-slate-400 block font-normal">
                        {kw.searchVolume > 0 ? 'búsquedas/mes · DEMO' : 'sin fuente conectada'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          kw.difficulty === 'Baja'
                            ? 'text-emerald-700 bg-emerald-50'
                            : kw.difficulty === 'Media'
                            ? 'text-amber-700 bg-amber-50'
                            : 'text-rose-700 bg-rose-50'
                        }`}
                      >
                        {kw.difficulty}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {kw.evolution > 0 ? (
                        <span className="inline-flex items-center text-xs font-bold text-emerald-600">
                          ↑ {kw.evolution}
                        </span>
                      ) : kw.evolution < 0 ? (
                        <span className="inline-flex items-center text-xs font-bold text-rose-600">
                          ↓ {Math.abs(kw.evolution)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs font-medium text-slate-400">
                          <Minus className="w-3 h-3" />
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      <button
                        onClick={() => setActiveTab('content-generator')}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center justify-end gap-1 ml-auto cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>Generar texto</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Keyword Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 font-heading">
              Rastrear nueva palabra clave
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Ingresá la frase con la que te gustaría que tus clientes encuentren tu negocio.
            </p>

            <form onSubmit={handleAddKeyword} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Frase o búsqueda (ej: hotel cerca del casino)
                </label>
                <input
                  type="text"
                  required
                  value={newKeywordInput}
                  onChange={(e) => setNewKeywordInput(e.target.value)}
                  placeholder="Escribí aquí..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                >
                  Agregar a seguimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
