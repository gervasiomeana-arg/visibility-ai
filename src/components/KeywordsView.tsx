import React, { useEffect, useRef, useState } from 'react';
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
  Globe,
  Copy,
  Check,
  ExternalLink,
  Lock,
  ShieldAlert,
  X,
} from 'lucide-react';
import { KeywordItem, Business, ActiveTab } from '../types';
import {
  searchConsoleService,
  SearchConsoleSite,
  SearchConsoleStatus,
} from '../services/searchConsoleService';
import { storageService } from '../services/storageService';
import { workspaceService } from '../services/workspaceService';
import { authService } from '../services/authService';

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
  const [gscStatus, setGscStatus] = useState<SearchConsoleStatus | null>(null);
  const [gscConfigured, setGscConfigured] = useState(false);
  const [gscConnected, setGscConnected] = useState(false);
  const [gscLoading, setGscLoading] = useState(false);
  const [gscError, setGscError] = useState('');
  const [gscSites, setGscSites] = useState<SearchConsoleSite[]>([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [copiedRedirectUri, setCopiedRedirectUri] = useState(false);
  const [gscResult, setGscResult] = useState<{
    siteUrl: string; startDate: string; endDate: string; rowCount: number;
  } | null>(null);
  const queryVersion = useRef(0);

  useEffect(() => {
    setKeywords(initialKeywords);
  }, [initialKeywords, business.id]);

  useEffect(() => {
    queryVersion.current += 1;
    setGscLoading(false);
    setGscResult(null);
    setGscError('');
    setGscSites([]);
    setSelectedSite('');
    return () => { queryVersion.current += 1; };
  }, [business.id, business.workspaceId]);

  useEffect(() => {
    let cancelled = false;

    searchConsoleService.status()
      .then(async (status) => {
        if (cancelled) return;
        setGscStatus(status);
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
      .catch((err) => {
        if (!cancelled) setGscError(err?.message || 'No se pudo consultar Google Search Console.');
      });

    return () => {
      cancelled = true;
    };
  }, [business.id, business.url, business.workspaceId]);

  const handleLoadSearchConsole = async () => {
    if (!selectedSite || gscLoading) return;
    const requestVersion = ++queryVersion.current;

    setGscLoading(true);
    setGscError('');
    setGscResult(null);

    try {
      const result = await searchConsoleService.query(
        selectedSite,
        28,
        {
          workspaceId: business.workspaceId,
          businessId: business.id,
        }
      );
      if (requestVersion !== queryVersion.current) return;
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

      // Refresh the measured source without deleting words the user added manually.
      const updatedKeywords = [
        ...keywords.filter((kw) => kw.source === 'manual'),
        ...realKeywords,
      ];
      setKeywords(updatedKeywords);
      storageService.saveKeywords(business.id, updatedKeywords);
      setGscResult({
        siteUrl: selectedSite,
        startDate: result.startDate,
        endDate: result.endDate,
        rowCount: realKeywords.length,
      });

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

      if (authService.isConfigured() && business.workspaceId) {
        await workspaceService.saveSearchConsoleSnapshot({
          workspaceId: business.workspaceId,
          businessId: business.id,
          siteUrl: selectedSite,
          periodStart: result.startDate,
          periodEnd: result.endDate,
          clicks,
          impressions,
          ctr,
          position,
          payload: { keywords: realKeywords },
        }).catch(() => {
          // Local cache remains available if remote persistence is temporarily unavailable.
        });
      }

      if (requestVersion !== queryVersion.current) return;
      storageService.updateBusinessScores(
        business.id,
        {},
        { google: 'partial' }
      );
    } catch (error: any) {
      if (requestVersion === queryVersion.current) {
        setGscError(error?.message || 'No se pudieron cargar datos de Search Console.');
      }
    } finally {
      if (requestVersion === queryVersion.current) setGscLoading(false);
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
    <div className="space-y-6 pb-14">
      {/* Header */}
      <div className="vai-shell">
        <div className="vai-core vai-panel p-6 sm:p-8 lg:p-9">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
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
              className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-[0.1em] shadow-[0_10px_22px_rgba(15,23,42,0.12)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.985] flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Rastrear palabra clave</span>
            </button>
          </div>
        </div>

        <div className="mt-5 p-4 bg-slate-50/70 ring-1 ring-slate-200/70 rounded-[1.25rem] text-xs text-slate-600 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${gscConnected ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-amber-400'}`}></span>
              <span>
                {gscConnected
                  ? <><strong>GOOGLE SEARCH CONSOLE CONECTADO:</strong> podés consultar consultas, clics, impresiones, CTR y posición media reales.</>
                  : <><strong>FUENTE DE DATOS:</strong> Search Console todavía no está conectado. Las palabras clave DEMO siguen identificadas como ejemplo.</>}
              </span>
            </div>

            {!gscConnected && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={async () => {
                    setGscError('');
                    if (!gscConfigured) {
                      setShowConfigModal(true);
                      return;
                    }
                    try {
                      setGscLoading(true);
                      await searchConsoleService.connect('/keywords');
                    } catch (error: any) {
                      setGscError(error?.message || 'No se pudo iniciar la conexión con Search Console.');
                      setGscLoading(false);
                    }
                  }}
                  disabled={gscLoading}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.985] text-white font-bold text-xs flex items-center gap-2 transition-all duration-300 shadow-sm cursor-pointer shrink-0"
                >
                  <Globe className="w-4 h-4 text-blue-100" />
                  <span>{gscLoading ? 'Iniciando OAuth...' : 'Conectar Google Search Console'}</span>
                </button>
              </div>
            )}
          </div>

          {!gscConnected && !gscConfigured && (
            <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  Faltan variables OAuth en el servidor ({gscStatus?.missing?.join(', ') || 'GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, APP_URL'}).
                </span>
              </span>
              <button
                type="button"
                onClick={() => setShowConfigModal(true)}
                className="font-semibold text-blue-600 hover:text-blue-800 underline flex items-center gap-1 cursor-pointer"
              >
                <span>Ver requisitos y URI de redirección</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}

          {gscConnected && (
            <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-slate-200/60">
              <select
                aria-label="Propiedad de Google Search Console"
                disabled={gscLoading}
                value={selectedSite}
                onChange={(e) => {
                  setSelectedSite(e.target.value);
                  setGscResult(null);
                  setGscError('');
                }}
                className="flex-1 px-3 py-2 rounded-xl ring-1 ring-slate-200 bg-white text-slate-800"
              >
                {gscSites.length === 0 && <option value="">No hay propiedades disponibles</option>}
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
                className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.985] cursor-pointer"
              >
                {gscLoading ? 'Cargando...' : 'Cargar últimos 28 días'}
              </button>
            </div>
          )}

          {gscConnected && gscSites.length === 0 && !gscError && (
            <p>Si el selector sigue vacío, comprobá que esta cuenta tenga acceso a una propiedad verificada en Google Search Console y recargá la página.</p>
          )}
          {gscResult && (
            <div role="status" className="rounded-xl bg-blue-50 p-3 text-blue-900">
              <p className="font-semibold">
                {gscResult.rowCount === 0
                  ? 'Consulta completada: sin datos disponibles para este período.'
                  : `Consulta completada: ${gscResult.rowCount} ${gscResult.rowCount === 1 ? 'consulta recibida' : 'consultas recibidas'}.`}
              </p>
              <p className="mt-1">{gscResult.siteUrl} · {gscResult.startDate} a {gscResult.endDate}</p>
              {gscResult.rowCount === 0 && (
                <p className="mt-1">La conexión sigue activa. Revisá el mismo período en Search Console; si Google indica que está procesando datos, volvé a consultar cuando estén disponibles.</p>
              )}
            </div>
          )}
          {gscError && <p role="alert" className="text-[11px] font-semibold text-rose-600">{gscError}</p>}
        </div>

        {/* Search & Filters */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto no-scrollbar pb-1">
            {['all', 'Comercial', 'Local', 'Transaccional', 'Informativa'].map((intent) => (
              <button
                key={intent}
                onClick={() => setIntentFilter(intent)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer ${
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
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50/70 ring-1 ring-slate-200/70 text-xs text-slate-900 focus:outline-none focus:ring-indigo-300 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>
        </div>
      </div>

      {/* Keywords Table matching user prompt exactly */}
      <div className="vai-panel rounded-[1.45rem] ring-1 ring-slate-200/60 overflow-hidden">
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
              {filteredKeywords.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    {keywords.length > 0
                      ? 'No hay palabras clave que coincidan con estos filtros.'
                      : gscLoading
                      ? 'Consultando Google Search Console…'
                      : gscResult?.rowCount === 0
                      ? 'No se recibieron consultas de búsqueda para el período seleccionado.'
                      : 'Todavía no hay palabras clave cargadas.'}
                  </td>
                </tr>
              )}
              {filteredKeywords.map((kw) => {
                const hasMeasurement = kw.position > 0;
                const isTop10 = hasMeasurement && kw.position <= 10;
                const isGoodRank = hasMeasurement && kw.position <= 20;

                return (
                  <tr key={kw.id} className="hover:bg-slate-50/80 transition-colors">
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
                  className="w-full px-3 py-2 text-xs rounded-xl ring-1 ring-slate-200 bg-slate-50/70 focus:outline-none focus:border-indigo-500"
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

      {/* Search Console Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-heading">
                    Conectar Google Search Console
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Requisitos técnicos y credenciales OAuth 2.0 requeridas.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-xs text-slate-600">
              {/* Variables de Entorno Requeridas */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <span className="font-bold text-[11px] uppercase tracking-wider text-slate-700 block">
                  1. Variables de entorno requeridas
                </span>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Para habilitar la autenticación con Google se requiere registrar credenciales OAuth en Google Cloud e inyectar las siguientes variables en el servidor (sin exponer sus secretos al navegador):
                </p>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                    <span className="font-semibold text-slate-800">GOOGLE_CLIENT_ID</span>
                    <span className={gscStatus?.missing?.includes('GOOGLE_CLIENT_ID') ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                      {gscStatus?.missing?.includes('GOOGLE_CLIENT_ID') ? 'Faltante ❌' : 'Configurada ✅'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                    <span className="font-semibold text-slate-800">GOOGLE_CLIENT_SECRET</span>
                    <span className={gscStatus?.missing?.includes('GOOGLE_CLIENT_SECRET') ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                      {gscStatus?.missing?.includes('GOOGLE_CLIENT_SECRET') ? 'Faltante ❌' : 'Configurada ✅'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                    <span className="font-semibold text-slate-800">APP_URL</span>
                    <span className={gscStatus?.missing?.includes('APP_URL') ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                      {gscStatus?.missing?.includes('APP_URL') ? 'Faltante ❌' : 'Configurada ✅'}
                    </span>
                  </div>
                </div>
              </div>

              {/* SEARCH_CONSOLE_TOKEN_KEY */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] uppercase tracking-wider text-slate-700">
                    2. Cifrado de tokens persistentes (Supabase)
                  </span>
                  <span className={gscStatus?.hasTokenKey ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                    {gscStatus?.hasTokenKey ? 'Configurada ✅' : 'Pendiente ⚠️'}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  <strong>SEARCH_CONSOLE_TOKEN_KEY:</strong> es necesaria para guardar los tokens de acceso y actualización de Google de forma cifrada (AES-256-GCM) en Supabase (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded">search_console_connections</code>). Si no está configurada, los tokens sólo se mantienen en cookies de sesión volátiles.
                </p>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 font-mono text-[10px] text-slate-700 select-all">
                  node -e &quot;console.log(require(&apos;crypto&apos;).randomBytes(32).toString(&apos;base64&apos;))&quot;
                </div>
              </div>

              {/* URI de Redirección Exacta */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-indigo-950 space-y-2">
                <span className="font-bold text-[11px] uppercase tracking-wider text-indigo-800 block">
                  3. URI de redirección exacta para Google Cloud
                </span>
                <p className="text-[11px] text-indigo-900 leading-relaxed">
                  Registrá exactamente esta URI en <strong>Google Cloud Console &gt; APIs y servicios &gt; Credenciales &gt; URIs de redireccionamiento autorizados</strong>:
                </p>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-indigo-200 text-indigo-900 font-mono text-[11px] break-all">
                  <span className="flex-1 select-all">
                    {gscStatus?.redirectUri || 'https://ais-dev-rwgx7qeqyl2myh7eaxpsuv-50992746135.us-west2.run.app/api/search-console/oauth/callback'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const uri = gscStatus?.redirectUri || 'https://ais-dev-rwgx7qeqyl2myh7eaxpsuv-50992746135.us-west2.run.app/api/search-console/oauth/callback';
                      navigator.clipboard.writeText(uri);
                      setCopiedRedirectUri(true);
                      setTimeout(() => setCopiedRedirectUri(false), 2000);
                    }}
                    className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 cursor-pointer shrink-0"
                    title="Copiar URI"
                  >
                    {copiedRedirectUri ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-[10px] text-indigo-800 space-y-0.5">
                  <p><strong>APP_URL actual:</strong> <code className="font-mono">{gscStatus?.appUrl || 'https://ais-dev-rwgx7qeqyl2myh7eaxpsuv-50992746135.us-west2.run.app'}</code></p>
                  <p><strong>Alcance requerido:</strong> <code className="font-mono">https://www.googleapis.com/auth/webmasters.readonly</code></p>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  Entendido
                </button>
                {gscConfigured && (
                  <button
                    type="button"
                    onClick={async () => {
                      setShowConfigModal(false);
                      setGscLoading(true);
                      try {
                        await searchConsoleService.connect('/keywords');
                      } catch (err: any) {
                        setGscError(err?.message || 'Error al conectar');
                        setGscLoading(false);
                      }
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer flex items-center gap-1.5"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Iniciar OAuth ahora</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
