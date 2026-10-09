import React, { useState } from 'react';
import { Building2, Globe, MapPin, Tag, X, ArrowRight } from 'lucide-react';
import { MARKET_CONFIGS, getMarket } from '../config/markets';
import { SubscriptionPlanId, SupportedCountryCode } from '../types';

interface NewBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspacePlanId?: SubscriptionPlanId;
  entitlement?: {
    usedBusinesses: number;
    maxBusinesses: number;
    canAddBusiness: boolean;
  };
  onAdd: (biz: {
    name: string;
    url: string;
    category: string;
    city: string;
    country: string;
    countryCode: SupportedCountryCode;
    currency: string;
    locale: string;
    timezone: string;
    subscriptionPlan: SubscriptionPlanId;
  }) => void | Promise<void>;
}

export const NewBusinessModal: React.FC<NewBusinessModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  workspacePlanId,
  entitlement,
}) => {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Hotelería y Turismo');
  const [city, setCity] = useState('');
  const [countryCode, setCountryCode] = useState<SupportedCountryCode>('AR');
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlanId>('growth');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    const normalizedUrl = url.trim().startsWith('http://') || url.trim().startsWith('https://')
      ? url.trim()
      : `https://${url.trim()}`;

    let parsed: URL;
    try {
      parsed = new URL(normalizedUrl);
      if (!parsed.hostname.includes('.') || parsed.protocol !== 'https:') throw new Error('invalid');
    } catch {
      setErrorMsg('Ingresá una URL HTTPS válida, por ejemplo https://mihotel.com.');
      return;
    }

    if (!city.trim()) {
      setErrorMsg('Ingresá la ciudad del negocio para poder contextualizar el análisis local.');
      return;
    }

    let deducedName = name.trim();
    if (!deducedName) {
      deducedName = parsed.hostname.replace('www.', '').split('.')[0];
      deducedName = deducedName.charAt(0).toUpperCase() + deducedName.slice(1);
    }

    if (entitlement && !entitlement.canAddBusiness) {
      setErrorMsg(
        `El plan actual permite ${entitlement.maxBusinesses} negocio${entitlement.maxBusinesses === 1 ? '' : 's'} y el cupo ya está completo.`
      );
      return;
    }

    setErrorMsg('');
    const market = getMarket(countryCode);
    const effectivePlan = workspacePlanId || subscriptionPlan;

    try {
      await onAdd({
        url: normalizedUrl,
        name: deducedName,
        category,
        city: city.trim(),
        country: market.country,
        countryCode: market.countryCode,
        currency: market.currency,
        locale: market.locale,
        timezone: market.timezone,
        subscriptionPlan: effectivePlan,
      });

      onClose();
    } catch (error: any) {
      setErrorMsg(
        error?.message ||
          'No se pudo agregar el negocio. Revisá el cupo disponible del plan.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Analizar Nuevo Negocio
              </h3>
              <p className="text-xs text-slate-500">
                Arquitectura multiempresa aislada
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Dirección web (URL) *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={url}
                onChange={(e) => { setUrl(e.target.value); if (errorMsg) setErrorMsg(''); }}
                placeholder="https://mihotel.com"
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 text-slate-900"
              />
              <Globe className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Nombre de la empresa o comercio (opcional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Posada del Mar"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Rubro o Categoría
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 text-slate-900 bg-white"
              >
                <option value="Hotelería y Turismo">Hotel / Turismo</option>
                <option value="Gastronomía y Restaurante">Restaurante / Bar</option>
                <option value="Salud y Odontología">Salud / Odontología</option>
                <option value="Inmobiliaria">Inmobiliaria</option>
                <option value="Comercio Local">Comercio Local</option>
                <option value="Servicios Profesionales">Servicios</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Ciudad
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => { setCity(e.target.value); if (errorMsg) setErrorMsg(''); }}
                placeholder="Ej: Mar del Plata"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                País / Mercado
              </label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value as SupportedCountryCode)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 text-slate-900 bg-white"
              >
                {MARKET_CONFIGS.map((market) => (
                  <option key={market.countryCode} value={market.countryCode}>
                    {market.country}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Plan
              </label>
              {workspacePlanId ? (
                <div className="w-full px-3 py-2 rounded-lg bg-slate-50 ring-1 ring-slate-200 text-slate-700">
                  <span className="font-semibold capitalize">{workspacePlanId}</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    Heredado del workspace
                    {entitlement
                      ? ` · ${entitlement.usedBusinesses}/${entitlement.maxBusinesses} negocios usados`
                      : ''}
                  </span>
                </div>
              ) : (
                <select
                  value={subscriptionPlan}
                  onChange={(e) =>
                    setSubscriptionPlan(
                      e.target.value as SubscriptionPlanId
                    )
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 text-slate-900 bg-white"
                >
                  <option value="diagnostic">Diagnóstico</option>
                  <option value="monitor">Visibility Monitor</option>
                  <option value="growth">Visibility Growth</option>
                  <option value="pro">Visibility PRO</option>
                  <option value="agency">Agency</option>
                </select>
              )}
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs font-medium text-rose-600" role="alert">{errorMsg}</p>
          )}

          <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={Boolean(entitlement && !entitlement.canAddBusiness)}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-slate-950 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span>
                {entitlement && !entitlement.canAddBusiness
                  ? 'LÍMITE DEL PLAN'
                  : 'COMENZAR ANÁLISIS'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
