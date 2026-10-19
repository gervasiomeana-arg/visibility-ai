import {privateTabs} from '../../shared/privateWorkflow';
import React, { useEffect, useState } from 'react';
import { Building2, ChevronDown, Plus, Menu, X, LogOut, MessageSquare, ArrowUpRight } from 'lucide-react';
import { Business, ActiveTab, Workspace } from '../types';
import { Brand } from './Brand';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  activeBusiness: Business;
  businesses: Business[];
  onSelectBusiness: (bizId: string) => void;
  onOpenNewBusinessModal: () => void;
  onOpenAssistant: () => void;
  workspaceName?: string;
  workspaces?: Workspace[];
  activeWorkspaceId?: string;
  onSelectWorkspace?: (workspaceId: string) => void;
  onSignOut?: () => void;
  privateOnly?:boolean;
}

const navItems = privateTabs;

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, activeBusiness, businesses,
  onSelectBusiness, onOpenNewBusinessModal, onOpenAssistant, workspaceName, workspaces = [],
  activeWorkspaceId, onSelectWorkspace, onSignOut, privateOnly=false }) => {
  const stepIndex = navItems.findIndex(item => item.id === activeTab);
  const [bizDropdownOpen, setBizDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setBizDropdownOpen(false); setMobileMenuOpen(false); }
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, []);
  const navigate = (tab: ActiveTab) => { setActiveTab(tab); setMobileMenuOpen(false); setBizDropdownOpen(false); };

  return <header className="vai-header no-print">
    <a className="vai-skip-link" href="#main-content">Ir al contenido</a>
    <div className="vai-header-inner">
      <div className="vai-header-top">
        <button type="button" onClick={() => navigate('clients')} className="vai-brand-link" aria-label="Visibility, ir al inicio"><Brand /></button>
        <div className="vai-workspace">
          <span className="vai-overline">Uso privado · espacio de trabajo</span>
          {workspaces.length > 1 && onSelectWorkspace
            ? <select aria-label="Espacio de trabajo" value={activeWorkspaceId || ''} onChange={event => onSelectWorkspace(event.target.value)}>
                {workspaces.map(workspace => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
              </select>
            : <span>{workspaceName || 'Mi espacio'}</span>}
        </div>
        <div className="vai-header-actions">

          <button type="button" onClick={onOpenAssistant} className="vai-button vai-button-secondary vai-assistant-top">
            <MessageSquare size={16} /><span>Consultar asistente</span>
          </button>
          <button type="button" onClick={() => navigate('admin')} className="vai-quiet-button vai-desktop-only">Ajustes</button>
          {onSignOut && <button type="button" onClick={onSignOut} className="vai-icon-button vai-desktop-only" aria-label="Cerrar sesión"><LogOut size={17} /></button>}
          <button type="button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="vai-icon-button lg:hidden"
            aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={mobileMenuOpen} aria-controls="mobile-navigation">
            {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
      <div className="vai-header-bottom">
        <div className="vai-business-picker">
          <button type="button" className="vai-business-trigger" onClick={() => setBizDropdownOpen(!bizDropdownOpen)}
            aria-expanded={bizDropdownOpen} aria-controls="business-options">
            <Building2 size={17} /><span>{activeBusiness.name}</span><ChevronDown size={14} />
          </button>
          {bizDropdownOpen && <>
            <div className="fixed inset-0 z-20" onClick={() => setBizDropdownOpen(false)} />
            <div id="business-options" className="vai-business-options">
              <p className="vai-overline px-4 py-3">Tus negocios</p>
              <div className="max-h-72 overflow-y-auto">
                {businesses.map(business => <button type="button" key={business.id}
                  onClick={() => { onSelectBusiness(business.id); setBizDropdownOpen(false); }}
                  className={`vai-business-option ${business.id === activeBusiness.id ? 'is-active' : ''}`}>
                  <span><strong>{business.name}</strong><small>{business.city} · {business.category}</small></span>
                  {business.id === activeBusiness.id && <span className="vai-selected-dot" aria-label="Negocio seleccionado" />}
                </button>)}
              </div>
              {!privateOnly&&<button type="button" className="vai-new-business" onClick={() => { setBizDropdownOpen(false); onOpenNewBusinessModal(); }}>
                <Plus size={16} /> Agregar negocio a una ficha
              </button>}
            </div>
          </>}
        </div>
        <nav aria-label="Navegación principal" className="vai-desktop-nav">
          {navItems.map((item, index) => <button type="button" key={item.id} onClick={() => navigate(item.id)}
            aria-current={activeTab === item.id ? 'page' : undefined}
            title={item.hint}
            className={`vai-nav-link ${activeTab === item.id ? 'is-active' : ''}`}>{item.label}</button>)}
        </nav>
        {!privateOnly&&<button type="button" className="vai-quiet-button vai-new-shortcut" onClick={onOpenNewBusinessModal}><Plus size={15} /><span>Negocio</span></button>}
      </div>
    </div>
    {mobileMenuOpen && <nav id="mobile-navigation" aria-label="Navegación móvil" className="vai-mobile-nav lg:hidden">
      {navItems.map((item, index) => <button type="button" key={item.id} onClick={() => navigate(item.id)}
        aria-current={activeTab === item.id ? 'page' : undefined} className={activeTab === item.id ? 'is-active' : ''}>
        <span className="vai-nav-index">{String(index + 1).padStart(2, '0')}</span>{item.label}<ArrowUpRight size={15} />
      </button>)}
      <div className="vai-mobile-account">
        <button type="button" onClick={() => navigate('clients')}>Clientes</button>
        <button type="button" onClick={() => navigate('admin')}>Ajustes</button>
        <button type="button" onClick={() => navigate('clients')}>Inicio</button>
        {onSignOut && <button type="button" onClick={onSignOut}>Cerrar sesión</button>}
      </div>
    </nav>}
  </header>;
};
