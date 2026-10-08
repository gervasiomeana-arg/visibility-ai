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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-xl p-6 sm:p-8">
        <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <Building2 className="w-5 h-5" />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Crear tu espacio de trabajo</h1>
        <p className="mt-1 text-sm text-slate-500">
          Este espacio separará tus negocios, auditorías, usuarios y plan del resto de los clientes.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del espacio</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Agencia Meana / Hotel Costa"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">País / Mercado</label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value as SupportedCountryCode)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
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
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
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
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
          >
            {loading ? 'Creando...' : 'Crear espacio'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};
