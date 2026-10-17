import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Calendar,
  BarChart3,
  TrendingUp,
  Share2,
  Check,
  PlusCircle,
  Eye,
  Users,
  Heart,
  FileText,
  Building,
  Award,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import type { Business } from '../types';
import {
  type SocialAccount,
  type SocialNetwork,
  type PublicNetwork,
  networkNames,
  validateSocialMeasurement,
  calendarDay,
  publicProfileUrl,
} from '../../shared/socialMetrics';
import {
  searchSocialMetrics,
  getMonthPeriod,
  listRecentMonths,
  SEARCHABLE_METRICS_INFO,
  type SearchableMetric,
  type MonthPeriod,
} from '../../shared/socialSearch';

interface Props {
  business: Business;
  allBusinesses?: Business[];
  accounts: SocialAccount[];
  workspaceId: string;
  canEdit: boolean;
  onSelectBusiness?: (businessId: string) => void;
  onSaveAccount: (account: SocialAccount) => Promise<void>;
}

export function SocialMetricsFinder({
  business,
  allBusinesses = [business],
  accounts,
  workspaceId,
  canEdit,
  onSelectBusiness,
  onSaveAccount,
}: Props) {
  // Month selector
  const recentMonths = useMemo(() => listRecentMonths(8, new Date('2026-10-15T00:00:00Z')), []);
  // Default to September 2026 (the user's explicit example query)
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');

  // Searchable metric
  const [selectedMetric, setSelectedMetric] = useState<SearchableMetric>('views');

  // Selected networks to include
  const [enabledNetworks, setEnabledNetworks] = useState<SocialNetwork[]>([
    'instagram',
    'facebook',
    'tiktok',
  ]);

  // View mode: 'networks' (Instagram vs Facebook vs TikTok) or 'competitors' (Client vs Competitors)
  const [viewMode, setViewMode] = useState<'networks' | 'competitors'>('networks');

  // Client search term / selector
  const [clientSearch, setClientSearch] = useState('');
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);

  // Quick edit / add metrics modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalValues, setModalValues] = useState<{
    instagram: string;
    facebook: string;
    tiktok: string;
    evidence: string;
  }>({
    instagram: '',
    facebook: '',
    tiktok: '',
    evidence: '',
  });
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Search results calculation
  const searchResults = useMemo(() => {
    return searchSocialMetrics(
      business.id,
      business.name,
      accounts,
      selectedMonth,
      selectedMetric,
      enabledNetworks
    );
  }, [business.id, business.name, accounts, selectedMonth, selectedMetric, enabledNetworks]);

  // Handle client selection
  const handlePickClient = (picked: Business) => {
    if (onSelectBusiness) {
      onSelectBusiness(picked.id);
    }
    setClientSearch('');
    setClientDropdownOpen(false);
  };

  const filteredBusinesses = allBusinesses.filter((b) =>
    b.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (b.city && b.city.toLowerCase().includes(clientSearch.toLowerCase()))
  );

  // Copy summary to clipboard
  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(searchResults.summaryText);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
    } catch {
      // fallback
    }
  };

  // Toggle network
  const toggleNetwork = (net: SocialNetwork) => {
    setEnabledNetworks((curr) => {
      if (curr.includes(net)) {
        if (curr.length === 1) return curr; // keep at least one
        return curr.filter((n) => n !== net);
      }
      return [...curr, net];
    });
  };

  // Save quick month metrics
  const handleSaveMonthMetrics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || modalSaving) return;
    setModalSaving(true);
    setModalError('');

    try {
      const period = getMonthPeriod(selectedMonth);
      const evidence = modalValues.evidence.trim() || `Medición registrada para ${period.label}`;
      const capturedAt = period.endDate;

      const networkKeys: { net: SocialNetwork; val: string }[] = [
        { net: 'instagram', val: modalValues.instagram },
        { net: 'facebook', val: modalValues.facebook },
        { net: 'tiktok', val: modalValues.tiktok },
      ];

      for (const item of networkKeys) {
        if (!item.val.trim()) continue;
        if (!/^\d+$/.test(item.val.trim())) {
          throw new Error(`En ${networkNames[item.net]} ingresá un número entero sin puntos ni comas.`);
        }
        const numericVal = parseInt(item.val.trim(), 10);

        // Find existing account or build a clean default
        let account = accounts.find((a) => a.network === item.net);
        const profileUrl =
          account?.profileUrl ||
          (item.net === 'tiktok'
            ? `https://www.tiktok.com/@${business.name.toLowerCase().replace(/[^a-z0-9]/g, '')}/`
            : `https://www.${item.net}.com/${business.name.toLowerCase().replace(/[^a-z0-9]/g, '')}/`);

        const metricPayload: Record<string, number> = {};
        if (selectedMetric === 'views') metricPayload.views = numericVal;
        else if (selectedMetric === 'reach') metricPayload.reach = numericVal;
        else if (selectedMetric === 'followers') metricPayload.followers = numericVal;
        else if (selectedMetric === 'interactions') metricPayload.interactions = numericVal;
        else if (selectedMetric === 'posts') metricPayload.posts = numericVal;

        const newMeasurement = validateSocialMeasurement({
          id: `manual-${item.net}-${period.key}-${Date.now()}`,
          network: item.net,
          profileUrl,
          capturedAt,
          source: 'manual',
          evidence,
          periodStart: period.startDate,
          periodEnd: period.endDate,
          metrics: metricPayload,
        });

        const nextMeasurements = [
          ...(account?.measurements || []).filter(
            (m) => !(m.periodStart === period.startDate && m.periodEnd === period.endDate)
          ),
          newMeasurement,
        ].slice(-100);

        const updatedAccount: SocialAccount = {
          workspaceId,
          businessId: business.id,
          network: item.net,
          profileUrl,
          accountId: account?.accountId || '',
          measurements: nextMeasurements,
          publicProfiles: account?.publicProfiles,
        };

        await onSaveAccount(updatedAccount);
      }

      setShowAddModal(false);
      setModalValues({ instagram: '', facebook: '', tiktok: '', evidence: '' });
    } catch (err: any) {
      setModalError(err instanceof Error ? err.message : 'No se pudo guardar la medición.');
    } finally {
      setModalSaving(false);
    }
  };

  const metricInfo = SEARCHABLE_METRICS_INFO[selectedMetric];

  return (
    <section
      aria-label="Buscador de métricas públicas y de redes"
      className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-7"
    >
      {/* Title & Description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 mb-2">
            <Search className="w-3.5 h-3.5" />
            Buscador de Métricas en Redes
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Métricas de Instagram, Facebook y TikTok
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Buscá el rendimiento mensual de tu cliente, compará cuántos te vieron en cada canal o analizá a tus competidores en gráficos de barras.
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => {
              setShowAddModal((v) => !v);
              setModalError('');
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer self-start md:self-auto shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            {showAddModal ? 'Cerrar registro' : `Registrar datos de ${searchResults.period.shortLabel}`}
          </button>
        )}
      </div>

      {/* Quick Add Form Drawer (if open) */}
      {showAddModal && (
        <form
          onSubmit={handleSaveMonthMetrics}
          className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Cargar {metricInfo.label.toLowerCase()} para {business.name} en {searchResults.period.label}
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              {searchResults.period.startDate} a {searchResults.period.endDate}
            </span>
          </div>

          <p className="text-xs text-slate-600">
            Ingresá los datos del informe mensual exportado de las plataformas (o la observación del perfil). Se reflejarán inmediatamente en las barras de resultados.
          </p>

          <div className="grid sm:grid-cols-3 gap-3">
            <label className="text-xs block bg-white p-3 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 inline-block" />
                Instagram ({metricInfo.unit})
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={modalValues.instagram}
                onChange={(e) => setModalValues((v) => ({ ...v, instagram: e.target.value }))}
                placeholder="Ej. 14850"
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-indigo-500"
              />
            </label>

            <label className="text-xs block bg-white p-3 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                Facebook ({metricInfo.unit})
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={modalValues.facebook}
                onChange={(e) => setModalValues((v) => ({ ...v, facebook: e.target.value }))}
                placeholder="Ej. 8920"
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-indigo-500"
              />
            </label>

            <label className="text-xs block bg-white p-3 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900 inline-block" />
                TikTok ({metricInfo.unit})
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={modalValues.tiktok}
                onChange={(e) => setModalValues((v) => ({ ...v, tiktok: e.target.value }))}
                placeholder="Ej. 26400"
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-indigo-500"
              />
            </label>
          </div>

          <label className="text-xs block">
            <span className="font-semibold text-slate-700">Evidencia / Fuente de la medición</span>
            <input
              type="text"
              value={modalValues.evidence}
              onChange={(e) => setModalValues((v) => ({ ...v, evidence: e.target.value }))}
              placeholder={`Ej. Meta Business Suite & TikTok Analytics · ${searchResults.period.label}`}
              className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 mt-1 text-xs focus:outline-indigo-500"
            />
          </label>

          {modalError && (
            <p role="alert" className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg">
              {modalError}
            </p>
          )}

          <div className="flex items-center gap-3 justify-end">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={modalSaving}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
            >
              {modalSaving ? 'Guardando...' : 'Guardar y actualizar gráfico'}
            </button>
          </div>
        </form>
      )}

      {/* Search & Filter Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
        {/* 1. Client / Business Picker */}
        <div className="md:col-span-4 relative">
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              Cliente / Negocio
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              {allBusinesses.length} cliente{allBusinesses.length !== 1 ? 's' : ''}
            </span>
          </label>

          <div className="relative">
            <button
              type="button"
              onClick={() => setClientDropdownOpen((v) => !v)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-left text-xs font-bold text-slate-800 flex items-center justify-between shadow-xs hover:border-slate-400 focus:outline-indigo-500 cursor-pointer"
            >
              <span className="truncate">{business.name}</span>
              {clientDropdownOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              )}
            </button>

            {clientDropdownOpen && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-2 max-h-60 overflow-y-auto space-y-1">
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs mb-1 focus:outline-indigo-500"
                  autoFocus
                />
                {filteredBusinesses.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handlePickClient(b)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                      b.id === business.id
                        ? 'bg-indigo-50 text-indigo-900 font-bold'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="truncate">{b.name}</span>
                    {b.id === business.id && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. Month Selector */}
        <div className="md:col-span-4">
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Mes a consultar
            </span>
            <span className="text-[11px] text-indigo-600 font-semibold">
              {searchResults.period.label}
            </span>
          </label>
          <div className="flex gap-1.5">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 shadow-xs focus:outline-indigo-500 cursor-pointer"
            >
              {recentMonths.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label} {m.key === '2026-09' ? '★ (Septiembre)' : ''}
                </option>
              ))}
            </select>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
              className="w-10 bg-white border border-slate-300 rounded-xl px-2 py-2 text-xs text-slate-600 shadow-xs cursor-pointer"
              title="Elegir otro mes"
            />
          </div>
        </div>

        {/* 3. Metric Selector */}
        <div className="md:col-span-4">
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
            Métrica de búsqueda
          </label>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as SearchableMetric)}
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 shadow-xs focus:outline-indigo-500 cursor-pointer"
          >
            <option value="views">Visualizaciones ("Te vieron")</option>
            <option value="reach">Alcance (Cuentas alcanzadas)</option>
            <option value="followers">Seguidores observados</option>
            <option value="interactions">Interacciones (Likes + Comentarios)</option>
            <option value="posts">Publicaciones / Videos del mes</option>
          </select>
        </div>
      </div>

      {/* Quick Month Chips & Network Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Quick Month Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <span className="text-slate-400 font-semibold text-[11px] mr-1">Meses rápidos:</span>
          {['2026-09', '2026-08', '2026-10'].map((mKey) => {
            const p = getMonthPeriod(mKey);
            const active = selectedMonth === mKey;
            return (
              <button
                key={mKey}
                type="button"
                onClick={() => setSelectedMonth(mKey)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {p.monthName} {p.year}
              </button>
            );
          })}
        </div>

        {/* Network Filter Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-semibold text-[11px] mr-1">Canales:</span>
          <button
            type="button"
            onClick={() => toggleNetwork('instagram')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              enabledNetworks.includes('instagram')
                ? 'bg-pink-50 border-pink-300 text-pink-700'
                : 'bg-white border-slate-200 text-slate-400 opacity-60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-gradient-to-r from-amber-500 to-pink-500" />
            Instagram
          </button>

          <button
            type="button"
            onClick={() => toggleNetwork('facebook')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              enabledNetworks.includes('facebook')
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-slate-200 text-slate-400 opacity-60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            Facebook
          </button>

          <button
            type="button"
            onClick={() => toggleNetwork('tiktok')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              enabledNetworks.includes('tiktok')
                ? 'bg-slate-100 border-slate-400 text-slate-900'
                : 'bg-white border-slate-200 text-slate-400 opacity-60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-slate-900" />
            TikTok
          </button>
        </div>
      </div>

      {/* Natural Language Summary Banner (Requested specifically in prompt) */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white rounded-2xl p-5 sm:p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/10 text-indigo-200 tracking-wide uppercase">
              Resultado de búsqueda · {searchResults.period.label}
            </div>
            <p className="font-heading text-lg sm:text-xl font-semibold leading-relaxed">
              {searchResults.summaryText}
            </p>
            <p className="text-xs text-indigo-200/80">
              Total acumulado de {metricInfo.unit}:{' '}
              <span className="font-bold text-white text-sm">
                {searchResults.totalValue > 0
                  ? searchResults.totalValue.toLocaleString('es-AR')
                  : '0'}
              </span>
              {searchResults.leaderNetwork && (
                <>
                  {' '}· Canal líder:{' '}
                  <span className="font-bold text-amber-300">
                    {searchResults.leaderNetwork.networkName} ({searchResults.leaderNetwork.formattedValue})
                  </span>
                </>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopySummary}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0 self-start sm:self-center"
          >
            {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Share2 className="w-3.5 h-3.5" />}
            {copiedSummary ? '¡Copiado!' : 'Copiar resumen'}
          </button>
        </div>
      </div>

      {/* Mode Switcher: Networks vs Competitors */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('networks')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'networks'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            📊 Resultados en Gráfico de Barras por Red
          </button>
          <button
            type="button"
            onClick={() => setViewMode('competitors')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'competitors'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ⚔️ Comparativa con Competidores
          </button>
        </div>

        <span className="hidden sm:inline-block text-xs text-slate-400">
          Métrica:{' '}
          <span className="font-bold text-slate-700">{metricInfo.label}</span>
        </span>
      </div>

      {/* VIEW 1: Networks Bar Chart (Instagram vs Facebook vs TikTok) */}
      {viewMode === 'networks' && (
        <div className="space-y-6">
          <div className="space-y-4">
            {searchResults.networks.map((net) => {
              const isInstagram = net.network === 'instagram';
              const isFacebook = net.network === 'facebook';
              const isTikTok = net.network === 'tiktok';

              // Gradient styling per brand
              const barGradient = isInstagram
                ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600'
                : isFacebook
                ? 'bg-gradient-to-r from-blue-700 to-blue-500'
                : 'bg-gradient-to-r from-slate-950 via-slate-800 to-cyan-500';

              const badgeColor = isInstagram
                ? 'bg-pink-50 text-pink-700 border-pink-200'
                : isFacebook
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-slate-100 text-slate-900 border-slate-300';

              return (
                <div
                  key={net.network}
                  className="bg-slate-50/50 hover:bg-slate-50 transition-colors border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3"
                >
                  {/* Network Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${badgeColor}`}>
                        {net.networkName}
                      </span>
                      {net.isLeader && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <Award className="w-3 h-3 text-amber-500" />
                          Mayor volumen en {searchResults.period.shortLabel}
                        </span>
                      )}
                      {net.profileUrl && (
                        <a
                          href={net.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-slate-400 hover:text-indigo-600 inline-flex items-center gap-1 transition-colors truncate max-w-[200px]"
                        >
                          {net.profileUrl.replace(/^https?:\/\/(www\.)?/, '')}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      )}
                    </div>

                    {/* Numeric Value Display */}
                    <div className="text-right">
                      <span className="font-heading text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                        {net.formattedValue}
                      </span>
                      {net.value !== null && (
                        <span className="text-xs text-slate-500 ml-1.5 font-medium">
                          {metricInfo.verb}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Horizontal Bar Chart */}
                  <div className="space-y-1.5">
                    <div
                      aria-label={`${net.networkName}: ${net.formattedValue}`}
                      className="h-8 bg-slate-200/70 rounded-xl overflow-hidden p-0.5 relative flex items-center"
                    >
                      {net.value !== null && net.value > 0 ? (
                        <div
                          className={`h-full rounded-lg ${barGradient} transition-all duration-500 ease-out flex items-center justify-end px-3 shadow-xs`}
                          style={{ width: `${Math.max(6, net.percentageOfMax || 0)}%` }}
                        >
                          <span className="text-white text-xs font-bold drop-shadow-xs">
                            {net.percentageOfMax}%
                          </span>
                        </div>
                      ) : (
                        <div className="w-full text-center text-xs text-slate-400 font-medium italic">
                          {net.value === 0 ? '0 registrado' : 'Sin mediciones para este mes'}
                        </div>
                      )}
                    </div>

                    {/* Footer Info / Evidence */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-1 pt-0.5">
                      <span className="truncate">
                        <strong>Fuente:</strong> {net.sourceLabel}
                        {net.evidence && ` · ${net.evidence}`}
                      </span>
                      {net.capturedAt && (
                        <span className="shrink-0 font-mono text-slate-400">
                          Medido el {net.capturedAt}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Explanation Note */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 flex items-start gap-2.5">
            <BarChart3 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">
                ¿Cómo interpretar el gráfico de barras?
              </p>
              <p className="mt-0.5">
                Las barras representan las cifras de <strong>{metricInfo.label.toLowerCase()}</strong> obtenidas en el mes de <strong>{searchResults.period.label}</strong> para cada red seleccionada. Cada plataforma calcula sus visualizaciones o alcance de acuerdo a sus métricas oficiales; podés exportar el resumen para enviárselo al cliente o registrar nuevos datos con evidencia.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Competitor Comparison Mode */}
      {viewMode === 'competitors' && (
        <div className="space-y-6">
          <div className="space-y-4">
            {/* Client Card */}
            <div className="bg-emerald-50/40 border border-emerald-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                    Tu Cliente
                  </span>
                  <h4 className="font-heading text-lg font-bold text-slate-900 mt-1">
                    {business.name}
                  </h4>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Total en el mes</span>
                  <span className="font-heading text-xl font-bold text-slate-900">
                    {searchResults.totalValue.toLocaleString('es-AR')} {metricInfo.unit}
                  </span>
                </div>
              </div>

              {/* Breakdown by network for client */}
              <div className="grid sm:grid-cols-3 gap-2.5 pt-2">
                {searchResults.networks.map((n) => (
                  <div key={n.network} className="bg-white border border-emerald-100 rounded-xl p-3">
                    <span className="text-[11px] font-bold text-slate-500 block uppercase">
                      {n.networkName}
                    </span>
                    <span className="text-base font-extrabold text-slate-900 mt-0.5 block">
                      {n.formattedValue}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                      {n.sourceLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Competitors List */}
            {searchResults.competitorsData.length > 0 ? (
              searchResults.competitorsData.map((comp) => (
                <div
                  key={comp.role}
                  className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-200/80 px-2.5 py-0.5 rounded-full">
                        {comp.role === 'competitor-1' ? 'Competidor 1' : 'Competidor 2'}
                      </span>
                      <h4 className="font-heading text-lg font-bold text-slate-900 mt-1">
                        {comp.name}
                      </h4>
                    </div>
                  </div>

                  {/* Competitor Networks */}
                  <div className="grid sm:grid-cols-3 gap-2.5 pt-1">
                    {comp.networks.map((cn) => (
                      <div key={cn.network} className="bg-white border border-slate-200 rounded-xl p-3">
                        <span className="text-[11px] font-bold text-slate-500 block uppercase">
                          {networkNames[cn.network]}
                        </span>
                        <span className="text-base font-extrabold text-slate-900 mt-0.5 block">
                          {cn.formattedValue}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                          {cn.source === 'manual-public' ? 'Muestra pública observada' : cn.source}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-2">
                <Users className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="font-bold text-slate-800 text-sm">
                  Sin competidores guardados para este mes
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Podés registrar competidores y recopilar sus datos públicos en la sección de "Presencia pública y dos competidores" más abajo para compararlos mes a mes.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
