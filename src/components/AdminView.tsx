import React, { useState } from 'react';
import {
  ShieldAlert,
  Building2,
  Users,
  CreditCard,
  Cpu,
  BarChart,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Business, ActiveTab } from '../types';

interface AdminViewProps {
  businesses: Business[];
  setActiveTab: (tab: ActiveTab) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ businesses, setActiveTab }) => {
  const [activeTab, setActiveAdminTab] = useState<'businesses' | 'plans' | 'ai-usage' | 'integrations'>('businesses');

  const plans = [
    {
      id: 'plan-free',
      name: 'Diagnóstico Gratuito',
      price: '$0',
      period: 'por siempre',
      businessesCount: 124,
      features: ['1 negocio', 'Diagnóstico general 0-100', '3 problemas principales', 'Actualización mensual'],
      status: 'Activo',
    },
    {
      id: 'plan-starter',
      name: 'Starter Business',
      price: '$49',
      period: 'por mes',
      businessesCount: 58,
      features: ['1 negocio', 'Auditoría SEO completa 14 factores', '20 palabras clave', 'Generador IA (10 contenidos/mes)'],
      status: 'Activo',
    },
    {
      id: 'plan-pro',
      name: 'Pro Growth',
      price: '$99',
      period: 'por mes',
      businessesCount: 86,
      features: ['Hasta 3 negocios', 'Auditoría semanal automática', '5 competidores monitoreados', 'Generador IA ilimitado', 'Asistente IA 24/7'],
      status: 'Activo',
      popular: true,
    },
    {
      id: 'plan-agency',
      name: 'Agency Multi-Cuenta',
      price: '$249',
      period: 'por mes',
      businessesCount: 22,
      features: ['Hasta 15 negocios', 'Informes en PDF con marca blanca', 'API Access', 'Soporte prioritario'],
      status: 'Activo',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2">
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
              <span>ESTRUCTURA ADMINISTRATIVA SAAS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
              Panel de Administración (SaaS Console)
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Gestión centralizada de clientes, planes de suscripción, negocios auditados y consumo de modelos de Inteligencia Artificial.
            </p>
          </div>

          <div className="text-xs text-slate-400 bg-slate-800 p-3 rounded-xl border border-slate-700">
            <span className="text-emerald-400 font-bold block mb-0.5">● Sistema SaaS Operativo</span>
            <span>Versión 1.0 MVP · Arquitectura Multi-Tenant</span>
          </div>
        </div>

        {/* Global KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800">
          <div className="p-3 rounded-xl bg-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Negocios Registrados</span>
            <span className="text-2xl font-bold text-white font-heading mt-0.5 block">{businesses.length + 289}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Auditorías Realizadas</span>
            <span className="text-2xl font-bold text-white font-heading mt-0.5 block">1.420</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Consumo Tokens IA</span>
            <span className="text-2xl font-bold text-indigo-400 font-heading mt-0.5 block">48.2k</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Suscripciones Activas</span>
            <span className="text-2xl font-bold text-emerald-400 font-heading mt-0.5 block">166</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 text-xs font-semibold">
        <button
          onClick={() => setActiveAdminTab('businesses')}
          className={`px-4 py-2 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'businesses'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Negocios ({businesses.length})
        </button>
        <button
          onClick={() => setActiveAdminTab('plans')}
          className={`px-4 py-2 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'plans'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Planes y Suscripciones (4)
        </button>
        <button
          onClick={() => setActiveAdminTab('ai-usage')}
          className={`px-4 py-2 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'ai-usage'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Consumo IA & Modelos
        </button>
        <button
          onClick={() => setActiveAdminTab('integrations')}
          className={`px-4 py-2 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'integrations'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Estado de Integraciones
        </button>
      </div>

      {/* Tab: Businesses */}
      {activeTab === 'businesses' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 font-heading">
              Negocios y Clientes Registrados
            </h2>
            <span className="text-xs text-slate-500">Separación multi-empresa aislada</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Negocio</th>
                  <th className="py-3 px-4">URL</th>
                  <th className="py-3 px-4">Rubro</th>
                  <th className="py-3 px-4">Ciudad</th>
                  <th className="py-3 px-4 text-center">Score</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {businesses.map((biz) => (
                  <tr key={biz.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{biz.name}</td>
                    <td className="py-3.5 px-4 text-slate-500">{biz.url}</td>
                    <td className="py-3.5 px-4 text-slate-600">{biz.category}</td>
                    <td className="py-3.5 px-4 text-slate-600">{biz.city}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {biz.scores.overall}/100
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setActiveTab('dashboard')}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        Abrir panel →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Plans */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((p) => (
            <div
              key={p.id}
              className={`bg-white rounded-2xl p-5 border shadow-xs flex flex-col justify-between ${
                p.popular ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {p.name}
                  </span>
                  {p.popular && (
                    <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded">
                      POPULAR
                    </span>
                  )}
                </div>

                <div className="my-3">
                  <span className="text-3xl font-extrabold text-slate-900 font-heading">{p.price}</span>
                  <span className="text-xs text-slate-400 font-medium"> /{p.period}</span>
                </div>

                <p className="text-xs text-indigo-700 font-semibold mb-4">
                  {p.businessesCount} empresas suscritas
                </p>

                <ul className="space-y-2 text-xs text-slate-600 pt-3 border-t border-slate-100">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 text-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Módulo de Cobros: Próximamente (Stripe/MP)
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: AI Usage */}
      {activeTab === 'ai-usage' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 font-heading">
            Consumo y Auditoría de Modelos de IA
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 block">Modelo en Producción</span>
              <span className="text-base font-bold text-slate-900 font-mono mt-1 block">gemini-3.8-flash</span>
              <span className="text-[11px] text-slate-400">Google GenAI SDK TypeScript</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 block">Consultas al Asistente</span>
              <span className="text-base font-bold text-slate-900 mt-1 block">342 chats</span>
              <span className="text-[11px] text-emerald-600 font-medium">98.4% satisfacción</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 block">Contenidos Redactados</span>
              <span className="text-base font-bold text-slate-900 mt-1 block">189 borradores</span>
              <span className="text-[11px] text-slate-400">82% aprobados por usuarios</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Integrations */}
      {activeTab === 'integrations' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 font-heading">
            Estado de Conectores y APIs Externas
          </h2>
          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">Google Search Console API</span>
                <span className="text-slate-500">Métricas de indexación real y clicks</span>
              </div>
              <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
                SIMULADO (DEMO)
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">Google PageSpeed Insights API</span>
                <span className="text-slate-500">Velocidad móvil y Core Web Vitals reales</span>
              </div>
              <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
                SIMULADO (DEMO)
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">Google Business Profile API</span>
                <span className="text-slate-500">Fichas de Google Maps, horarios y opiniones</span>
              </div>
              <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
                SIMULADO (DEMO)
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">Google Gemini API (gemini-3.8-flash)</span>
                <span className="text-slate-500">Asistente empresarial y redactor inteligente</span>
              </div>
              <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                CONECTADO / LISTO
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
