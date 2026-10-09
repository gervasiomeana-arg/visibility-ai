import React, { useState } from 'react';
import { DatabaseZap, ArrowRight, X } from 'lucide-react';
import { LegacyBusinessBundle } from '../services/storageService';

interface LegacyMigrationViewProps {
  bundles: LegacyBusinessBundle[];
  onImport: () => Promise<void>;
  onSkip: () => void;
}

export const LegacyMigrationView: React.FC<LegacyMigrationViewProps> = ({
  bundles,
  onImport,
  onSkip,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImport = async () => {
    setLoading(true);
    setError('');

    try {
      await onImport();
    } catch (err: any) {
      setError(err?.message || 'No se pudieron importar los datos anteriores.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] px-4 py-10 sm:px-6 flex items-center justify-center">
      <div className="w-full max-w-2xl vai-shell">
        <section className="vai-core vai-panel p-6 sm:p-8 lg:p-10">
          <div className="w-11 h-11 rounded-[1rem] bg-slate-950 text-white flex items-center justify-center">
            <DatabaseZap className="w-5 h-5" />
          </div>

          <span className="mt-5 block text-[11px] font-semibold tracking-[0.14em] uppercase text-indigo-600">
            Migración disponible
          </span>
          <h1 className="mt-2 text-3xl font-heading font-bold text-slate-950 tracking-[-0.035em]">
            Encontramos datos anteriores en este navegador
          </h1>
          <p className="mt-3 text-sm text-slate-500 leading-6">
            Hay {bundles.length} {bundles.length === 1 ? 'negocio' : 'negocios'} con actividad previa,
            auditorías reales o datos de Search Console que pueden copiarse a tu nuevo workspace.
            Nada se subirá sin tu confirmación.
          </p>

          <div className="mt-6 space-y-2">
            {bundles.slice(0, 5).map((bundle) => (
              <div
                key={bundle.business.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-slate-50/70 ring-1 ring-slate-200/70 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {bundle.business.name}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {bundle.business.url}
                  </p>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {bundle.seoAudit.some((item) => item.source === 'real')
                    ? 'SEO real'
                    : bundle.searchMeta
                    ? 'Search Console'
                    : 'Local'}
                </span>
              </div>
            ))}
          </div>

          {error && (
            <p className="mt-4 text-xs font-semibold text-rose-600">{error}</p>
          )}

          <div className="mt-7 flex flex-col sm:flex-row gap-2 sm:justify-end">
            <button
              type="button"
              onClick={onSkip}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
            >
              <X className="w-3.5 h-3.5 inline mr-1.5" />
              Omitir por ahora
            </button>

            <button
              type="button"
              onClick={handleImport}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all"
            >
              {loading ? 'Importando...' : 'Importar al workspace'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
};
