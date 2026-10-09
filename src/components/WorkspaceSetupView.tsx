import React, { useState } from 'react';
import { Building2, ArrowRight } from 'lucide-react';
import { MARKET_CONFIGS, getMarket } from '../config/markets';
import { SubscriptionPlanId, SupportedCountryCode } from '../types';
import { workspaceService } from '../services/workspaceService';

interface WorkspaceSetupViewProps {
  onCreated: (workspaceId: string) => void;
}

export const WorkspaceSetupView: React.FC<WorkspaceSetupViewProps> = ({ onCreated }) => {
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState<SupportedCountryCode>('AR');
  const [planId, setPlanId] = useState<SubscriptionPlanId>('growth');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');

    try {
      const market = getMarket(countryCode);
      const slug = name
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 48);

      const workspaceId = await workspaceService.createWorkspace({
        name: name.trim(),
        slug: slug || undefined,
        countryCode: market.countryCode,
        currency: market.currency,
        locale: market.locale,
        timezone: market.timezone,
        planId,
      });

      onCreated(workspaceId);
    } catch (err: any) {
      setError(err?.message || 'No se pudo crear el espacio de trabajo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] px-4 py-10 sm:px-6 flex items-center justify-center">
      <div className="w-full max-w-3xl">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="text-[11px] font-semibold tracking-[0.16em] uppercase text-indigo-600">Configuración inicial</span>
          <h1 className="mt-3 text-3xl sm:text-4xl font-heading font-bold text-slate-950 text-balance">
            Prepará tu espacio de trabajo
          </h1>
          <p className="mt-3 text-sm text-slate-500 leading-6 text-pretty">
            País, moneda, zona horaria y plan quedan asociados al workspace para mantener cada cliente correctamente separado.
          </p>
        </div>

        <div className="vai-shell">
          <section className="vai-core vai-panel p-6 sm:p-8 lg:p-10">
        <div className="w-11 h-11 rounded-[1rem] bg-slate-950 text-white flex items-center justify-center shadow-[0_10px_24px_rgba(15,23,42,0.16)]">
          <Building2 className="w-5 h-5" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-950">Datos del workspace</h2>
        <p className="mt-1 text-sm text-slate-500 leading-6">
          Podrás cambiar varios de estos datos más adelante desde administración.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del espacio</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Agencia Meana / Hotel Costa"
              className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">País / Mercado</label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value as SupportedCountryCode)}
                className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 bg-white text-sm"
              >
                {MARKET_CONFIGS.map((market) => (
                  <option key={market.countryCode} value={market.countryCode}>
                    {market.country}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Plan</label>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value as SubscriptionPlanId)}
                className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 bg-white text-sm"
              >
                <option value="diagnostic">Diagnóstico</option>
                <option value="monitor">Visibility Monitor</option>
                <option value="growth">Visibility Growth</option>
                <option value="pro">Visibility PRO</option>
                <option value="agency">Agency</option>
              </select>
            </div>
          </div>

          {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="group w-full py-3 rounded-2xl bg-slate-950 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-bold uppercase tracking-[0.12em] flex items-center justify-center gap-2 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.985]"
          >
            {loading ? 'Creando...' : 'Crear espacio'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
          </section>
        </div>
      </div>
    </main>
  );
};
