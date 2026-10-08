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

  const handleLoadSearchConsole = async () => {
    if (!selectedSite) return;

    setGscLoading(true);
    setGscError('');

    try {
      const result = await searchConsoleService.query(selectedSite, 28);
      const realKeywords: KeywordItem[] = result.rows.map((row, index) => ({
        id: `gsc-${business.id}-${index}`,
        businessId: business.id,
        keyword: row.query,
        position: row.position > 0 ? Math.round(row.position * 10) / 10 : 0,
        searchVolume: 0,
        difficulty: 'Media',
        evolution: 0,
        intent: 'Informativa',
        url: business.url,
        source: 'search-console',
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
      }));

      setKeywords(realKeywords);
      storageService.saveKeywords(business.id, realKeywords);

      const realOpportunities = storageService.buildOpportunitiesFromSearchConsole(business, realKeywords);
      storageService.replaceOpportunitiesBySource(business.id, 'search-console', realOpportunities);

      const clicks = realKeywords.reduce((sum, kw) => sum + (kw.clicks || 0), 0);
      const impressions = realKeywords.reduce((sum, kw) => sum + (kw.impressions || 0), 0);
      const weightedPositionDenominator = realKeywords.reduce((sum, kw) => sum + (kw.impressions || 0), 0);
      const weightedPositionNumerator = realKeywords.reduce(
        (sum, kw) => sum + (kw.position || 0) * (kw.impressions || 0),
        0
      );
      const position = weightedPositionDenominator > 0
        ? weightedPositionNumerator / weightedPositionDenominator
        : 0;
      const ctr = impressions > 0 ? clicks / impressions : 0;

      const loadedAt = new Date().toISOString();

      storageService.saveSearchConsoleMeta(business.id, {
        siteUrl: selectedSite,
        startDate: result.startDate,
        endDate: result.endDate,
        clicks,
        impressions,
        ctr,
        position,
        loadedAt,
      });

      storageService.saveSearchConsoleHistoryPoint(business.id, {
        loadedAt,
        clicks,
        impressions,
        ctr,
        position,
      });

      storageService.updateBusinessScores(
        business.id,
        {},
        { google: 'partial', overall: 'partial' }
      );
    } catch (error: any) {
      setGscError(error?.message || 'No se pudieron cargar datos de Search Console.');
    } finally {
      setGscLoading(false);
    }
  };

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
      source: 'manual',
    };

    const updated = [newItem, ...keywords];
    setKeywords(updated);
    storageService.saveKeywords(business.id, updated);
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

        <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${gscConnected ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
              <span>
                {gscConnected
                  ? <><strong>GOOGLE SEARCH CONSOLE CONECTADO:</strong> podés cargar consultas, clics, impresiones, CTR y posición media reales.</>
                  : <><strong>FUENTE DE DATOS:</strong> Search Console todavía no está conectado. Las filas DEMO siguen identificadas como ejemplo.</>}
              </span>
            </div>
            {!gscConnected && gscConfigured && (
              <button
                type="button"
                onClick={() => searchConsoleService.connect('/')}
                className="px-3 py-2 rounded-lg bg-slate-900 text-white font-semibold"
              >
                Conectar Search Console
              </button>
            )}
          </div>

          {gscConnected && (
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800"
              >
                {gscSites.map((site) => (
                  <option key={site.siteUrl} value={site.siteUrl}>
                    {site.siteUrl}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleLoadSearchConsole}
                disabled={!selectedSite || gscLoading}
                className="px-4 py-2 rounded-lg bg-indigo-600 disabled:bg-slate-300 text-white font-bold"
              >
                {gscLoading ? 'Cargando...' : 'Cargar últimos 28 días'}
              </button>
            </div>
          )}

          {!gscConfigured && (
            <p className="text-[11px] text-slate-500">
              Para habilitar esta conexión hay que configurar GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y APP_URL. No requiere DATABASE_URL.
            </p>
          )}

          {gscError && <p className="text-[11px] font-semibold text-rose-600">{gscError}</p>}
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
                <th className="py-3.5 px-4 text-right">Impresiones</th>
                <th className="py-3.5 px-4 text-right">Clics / CTR</th>
                <th className="py-3.5 px-4 text-center">Fuente</th>
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
                      {kw.impressions !== undefined ? kw.impressions.toLocaleString('es-AR') : '—'}
                    </td>

                    <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                      {kw.clicks !== undefined ? kw.clicks.toLocaleString('es-AR') : '—'}
                      <span className="text-[11px] text-slate-400 block font-normal">
                        {kw.ctr !== undefined ? `${(kw.ctr * 100).toFixed(1)}% CTR` : 'sin medición'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                        kw.source === 'search-console'
                          ? 'bg-emerald-50 text-emerald-700'
                          : kw.source === 'manual'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {kw.source === 'search-console' ? 'SEARCH CONSOLE' : kw.source === 'manual' ? 'MANUAL' : 'DEMO'}
                      </span>
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
