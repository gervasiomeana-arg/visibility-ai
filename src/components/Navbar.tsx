import React, { useState } from 'react';
import {
  Search,
  Building2,
  ChevronDown,
  Sparkles,
  BarChart3,
  FileCheck2,
  KeyRound,
  Users2,
  Lightbulb,
  PenTool,
  CheckSquare,
  TrendingUp,
  FileText,
  ShieldAlert,
  Plus,
  HelpCircle,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import { Business, ActiveTab } from '../types';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  activeBusiness: Business;
  businesses: Business[];
  onSelectBusiness: (bizId: string) => void;
  onOpenNewBusinessModal: () => void;
  onOpenAssistant: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  activeBusiness,
  businesses,
  onSelectBusiness,
  onOpenNewBusinessModal,
  onOpenAssistant,
}) => {
  const [bizDropdownOpen, setBizDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoInfoOpen, setDemoInfoOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'executive-summary', label: 'Resumen Ejecutivo', icon: FileCheck2 },
    { id: 'seo', label: 'Auditoría SEO', icon: Search },
    { id: 'keywords', label: 'Palabras Clave', icon: KeyRound },
    { id: 'competidores', label: 'Competidores', icon: Users2, tabId: 'competitors' },
    { id: 'oportunidades', label: 'Oportunidades', icon: Lightbulb, tabId: 'opportunities' },
    { id: 'content-generator', label: 'Contenido IA', icon: PenTool },
    { id: 'action-plan', label: 'Plan de Acción', icon: CheckSquare },
    { id: 'evolution', label: 'Evolución', icon: TrendingUp },
    { id: 'monthly-report', label: 'Informe Mensual', icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Top Banner for Demo Transparency */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-medium text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              MODO DEMO / SIMULACIÓN ACTIVA
            </span>
            <span className="hidden sm:inline text-slate-400">·</span>
            <span className="hidden sm:inline text-slate-400">
              Datos simulados basados en auditorías reales para comercios y hoteles. Arquitectura lista para conectar APIs de Google.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDemoInfoOpen(true)}
              className="text-indigo-300 hover:text-white underline text-xs transition-colors cursor-pointer"
            >
              ¿Cómo funciona?
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={() => setActiveTab('admin')}
              className={`text-xs transition-colors cursor-pointer ${
                activeTab === 'admin' ? 'text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Panel Admin
            </button>
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('landing')}
              className="flex items-center gap-3 text-left group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200 group-hover:scale-105 transition-transform">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-slate-900 font-heading">
                  VISIBILITY <span className="text-indigo-600">AI</span>
                </span>
                <p className="text-[11px] text-slate-500 font-medium hidden md:block">
                  ¿Tu negocio aparece donde buscan tus clientes?
                </p>
              </div>
            </button>

            {/* Business Selector (Multi-Empresa) */}
            <div className="relative">
              <button
                onClick={() => setBizDropdownOpen(!bizDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-all"
              >
                <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <div className="text-left max-w-[130px] sm:max-w-[170px] truncate">
                  <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">Mis negocios</span>
                  <span className="font-semibold text-slate-900 truncate block">{activeBusiness.name}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {bizDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setBizDropdownOpen(false)}
                  />
                  <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-30 divide-y divide-slate-100">
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Seleccionar negocio activo
                    </div>
                    <div className="max-h-60 overflow-y-auto py-1">
                      {businesses.map((biz) => (
                        <button
                          key={biz.id}
                          onClick={() => {
                            onSelectBusiness(biz.id);
                            setBizDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                            biz.id === activeBusiness.id ? 'bg-indigo-50/70 text-indigo-900 font-medium' : 'text-slate-700'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <p className="font-medium text-slate-900 truncate">{biz.name}</p>
                            <p className="text-[11px] text-slate-500">{biz.city} · {biz.category}</p>
                          </div>
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 shrink-0">
                            {biz.scores.overall}/100
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setBizDropdownOpen(false);
                          onOpenNewBusinessModal();
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        Analizar nuevo negocio
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            {/* AI Assistant Quick Trigger */}
            <button
              onClick={onOpenAssistant}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span className="hidden sm:inline">Asistente IA</span>
              <span className="sm:hidden">IA</span>
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Desktop Secondary Navigation Bar */}
        <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-100 text-xs font-medium text-slate-600 no-scrollbar">
          {navItems.map((item) => {
            const target = (item.tabId || item.id) as ActiveTab;
            const isActive = activeTab === target;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(target)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'hover:text-slate-900 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-300' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 shadow-lg max-h-[80vh] overflow-y-auto">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Módulos del Negocio
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {navItems.map((item) => {
              const target = (item.tabId || item.id) as ActiveTab;
              const isActive = activeTab === target;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(target);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => {
                setActiveTab('landing');
                setMobileMenuOpen(false);
              }}
              className="text-xs text-indigo-600 font-medium hover:underline flex items-center gap-1"
            >
              Volver a la portada
            </button>
            <button
              onClick={() => {
                setActiveTab('admin');
                setMobileMenuOpen(false);
              }}
              className="text-xs text-slate-500 font-medium hover:text-slate-900"
            >
              Panel Admin
            </button>
          </div>
        </div>
      )}

      {/* Demo Modal Explainer */}
      {demoInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <button
                onClick={() => setDemoInfoOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mt-3 font-heading">
              Transparencia y Datos de Simulación (DEMO)
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              En esta versión inicial MVP, los datos de auditoría, competidores y rankings se generan mediante un modelo de simulación realista diseñado específicamente para hotelería, gastronomía, salud y comercios locales.
            </p>

            <div className="mt-4 space-y-2 text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <p className="font-semibold text-slate-900">Arquitectura desacoplada para conexiones reales:</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li>Google Search Console (indexabilidad y clicks)</li>
                <li>Google PageSpeed Insights (velocidad y Core Web Vitals)</li>
                <li>Google Business Profile (fichas y reseñas)</li>
                <li>Servicios de palabras clave & rank tracking</li>
                <li>Modelos de IA (Gemini 2.5 / 3.0 para asesor y redacción)</li>
              </ul>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setDemoInfoOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Entendido, continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
