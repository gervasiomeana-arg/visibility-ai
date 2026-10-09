import React, { useEffect, useState } from 'react';
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
import { Business, ActiveTab, Workspace } from '../types';
import { workspaceService } from '../services/workspaceService';
import { BASE_PLANS, getPlanPrice } from '../config/markets';

interface AdminViewProps {
  businesses: Business[];
  setActiveTab: (tab: ActiveTab) => void;
  onSelectBusiness: (bizId: string) => void;
  workspace?: Workspace | null;
  onWorkspaceUpdated?: (workspace: Workspace) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ businesses, setActiveTab, onSelectBusiness, workspace, onWorkspaceUpdated }) => {
  const [activeTab, setActiveAdminTab] = useState<'businesses' | 'plans' | 'members' | 'ai-usage' | 'integrations'>('businesses');
  const [members, setMembers] = useState<Array<{
    userId: string;
    email?: string | null;
    fullName?: string | null;
    role: 'owner' | 'admin' | 'member' | 'viewer';
  }>>([]);
  const [invites, setInvites] = useState<Array<{ id: string; email: string; role: 'admin' | 'member' | 'viewer'; token: string; expiresAt: string; acceptedAt?: string | null }>>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteError, setInviteError] = useState('');
  const canManageMembers = workspace?.role === 'owner' || workspace?.role === 'admin';
  const [workspaceName, setWorkspaceName] = useState(workspace?.name || '');
  const [workspaceMessage, setWorkspaceMessage] = useState('');
  const [workspaceError, setWorkspaceError] = useState('');
  const [memberMessage, setMemberMessage] = useState('');
  const [memberError, setMemberError] = useState('');

  useEffect(() => {
    setWorkspaceName(workspace?.name || '');
  }, [workspace?.id, workspace?.name]);

  const refreshMembers = async () => {
    if (!workspace?.id) return;
    try {
      const [nextMembers, nextInvites] = await Promise.all([
        workspaceService.listMembers(workspace.id),
        workspaceService.listInvites(workspace.id),
      ]);
      setMembers(nextMembers);
      setInvites(nextInvites);
    } catch {
      setInviteError('No se pudieron cargar los colaboradores.');
    }
  };

  useEffect(() => {
    if (activeTab === 'members') refreshMembers();
  }, [activeTab, workspace?.id]);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace?.id || !inviteEmail.trim()) return;
    setInviteError('');
    setInviteMessage('');

    try {
      const invite = await workspaceService.createInvite(workspace.id, inviteEmail, inviteRole);
      const inviteUrl = `${window.location.origin}${window.location.pathname}?invite=${encodeURIComponent(invite.token)}`;
      await navigator.clipboard?.writeText(inviteUrl);
      setInviteMessage(`Invitación creada y enlace copiado. Vence el ${new Date(invite.expiresAt).toLocaleDateString('es-AR')}.`);
      setInviteEmail('');
      await refreshMembers();
    } catch (error: any) {
      setInviteError(error?.message || 'No se pudo crear la invitación.');
    }
  };

  const handleRenameWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || workspace.role !== 'owner') return;

    setWorkspaceMessage('');
    setWorkspaceError('');

    try {
      const updated = await workspaceService.updateWorkspaceName(workspace, workspaceName);
      setWorkspaceName(updated.name);
      setWorkspaceMessage('Nombre del workspace actualizado.');
      onWorkspaceUpdated?.(updated);
    } catch (error: any) {
      setWorkspaceError(error?.message || 'No se pudo actualizar el workspace.');
    }
  };

  const handleMemberRoleChange = async (
    userId: string,
    role: 'admin' | 'member' | 'viewer'
  ) => {
    if (!workspace?.id || workspace.role !== 'owner') return;

    setMemberMessage('');
    setMemberError('');

    try {
      await workspaceService.updateMemberRole(workspace.id, userId, role);
      setMemberMessage('Rol actualizado.');
      await refreshMembers();
    } catch (error: any) {
      setMemberError(error?.message || 'No se pudo actualizar el rol.');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!workspace?.id || workspace.role !== 'owner') return;
    if (!window.confirm('¿Quitar este colaborador del workspace?')) return;

    setMemberMessage('');
    setMemberError('');

    try {
      await workspaceService.removeMember(workspace.id, userId);
      setMemberMessage('Colaborador eliminado del workspace.');
      await refreshMembers();
    } catch (error: any) {
      setMemberError(error?.message || 'No se pudo quitar el colaborador.');
    }
  };

  const plans = BASE_PLANS.map((plan) => ({
    ...plan,
    price: getPlanPrice(plan, workspace?.countryCode || 'AR'),
    businessesCount: 0,
    status: 'Activo',
    popular: plan.id === 'growth',
  }));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="rounded-[1.6rem] bg-slate-950 text-white p-6 sm:p-8 lg:p-9 shadow-[0_28px_70px_rgba(15,23,42,0.18)] ring-1 ring-white/10 overflow-hidden relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] tracking-[0.12em] uppercase text-indigo-200 font-semibold mb-3">
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
              <span>ESTRUCTURA ADMINISTRATIVA SAAS</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white font-heading tracking-[-0.04em] text-balance">
              Panel de Administración (SaaS Console)
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Gestión centralizada de clientes, planes de suscripción, negocios auditados y consumo de modelos de Inteligencia Artificial.
            </p>
          </div>

          <div className="text-xs text-slate-300 bg-white/[0.05] p-3.5 rounded-[1rem] ring-1 ring-white/10">
            <span className="text-emerald-400 font-bold block mb-0.5">● Consola SaaS DEMO</span>
            <span>Workspace multi-tenant · roles y persistencia preparados</span>
          </div>
        </div>

        {/* Global KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800">
          <div className="p-4 rounded-[1rem] bg-white/[0.045] ring-1 ring-white/8">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Negocios Registrados</span>
            <span className="text-2xl font-bold font-tabular text-white font-heading mt-0.5 block">{businesses.length}</span>
          </div>
          <div className="p-4 rounded-[1rem] bg-white/[0.045] ring-1 ring-white/8">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Auditorías Realizadas</span>
            <span className="text-2xl font-bold font-tabular text-white font-heading mt-0.5 block">0</span>
          </div>
          <div className="p-4 rounded-[1rem] bg-white/[0.045] ring-1 ring-white/8">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Consumo Tokens IA</span>
            <span className="text-2xl font-bold font-tabular text-indigo-400 font-heading mt-0.5 block">0</span>
          </div>
          <div className="p-4 rounded-[1rem] bg-white/[0.045] ring-1 ring-white/8">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Suscripciones Activas</span>
            <span className="text-2xl font-bold font-tabular text-emerald-400 font-heading mt-0.5 block">0</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-[1.15rem] bg-slate-100/80 ring-1 ring-slate-200/70 text-xs font-semibold overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveAdminTab('businesses')}
          className={`px-4 py-2.5 rounded-xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer whitespace-nowrap ${
            activeTab === 'businesses'
              ? 'bg-white text-slate-950 shadow-[0_6px_16px_rgba(15,23,42,0.08)]'
              : 'text-slate-500 hover:text-slate-950 hover:bg-white/70'
          }`}
        >
          Negocios ({businesses.length})
        </button>
        <button
          onClick={() => setActiveAdminTab('members')}
          className={`px-4 py-2.5 rounded-xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer whitespace-nowrap ${
            activeTab === 'members'
              ? 'bg-white text-slate-950 shadow-[0_6px_16px_rgba(15,23,42,0.08)]'
              : 'text-slate-500 hover:text-slate-950 hover:bg-white/70'
          }`}
        >
          Colaboradores ({members.length})
        </button>
        <button
          onClick={() => setActiveAdminTab('plans')}
          className={`px-4 py-2.5 rounded-xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer whitespace-nowrap ${
            activeTab === 'plans'
              ? 'bg-white text-slate-950 shadow-[0_6px_16px_rgba(15,23,42,0.08)]'
              : 'text-slate-500 hover:text-slate-950 hover:bg-white/70'
          }`}
        >
          Planes y Suscripciones ({plans.length})
        </button>
        <button
          onClick={() => setActiveAdminTab('ai-usage')}
          className={`px-4 py-2.5 rounded-xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer whitespace-nowrap ${
            activeTab === 'ai-usage'
              ? 'bg-white text-slate-950 shadow-[0_6px_16px_rgba(15,23,42,0.08)]'
              : 'text-slate-500 hover:text-slate-950 hover:bg-white/70'
          }`}
        >
          Consumo IA & Modelos
        </button>
        <button
          onClick={() => setActiveAdminTab('integrations')}
          className={`px-4 py-2.5 rounded-xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer whitespace-nowrap ${
            activeTab === 'integrations'
              ? 'bg-white text-slate-950 shadow-[0_6px_16px_rgba(15,23,42,0.08)]'
              : 'text-slate-500 hover:text-slate-950 hover:bg-white/70'
          }`}
        >
          Estado de Integraciones
        </button>
      </div>

      {/* Tab: Businesses */}
      {activeTab === 'businesses' && (
        <div className="vai-panel rounded-[1.45rem] ring-1 ring-slate-200/60 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900 font-heading">
              Negocios y Clientes Registrados
            </h2>
            <span className="text-xs text-slate-500">Aislamiento por workspace</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
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
                  <tr key={biz.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{biz.name}</td>
                    <td className="py-3.5 px-4 text-slate-500">{biz.url}</td>
                    <td className="py-3.5 px-4 text-slate-600">{biz.category}</td>
                    <td className="py-3.5 px-4 text-slate-600">{biz.city}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {biz.scoreSources?.overall === 'real'
                          ? 'REAL'
                          : biz.scoreSources?.overall === 'partial'
                          ? 'PARCIAL'
                          : 'DEMO'} {biz.scores.overall}/100
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          onSelectBusiness(biz.id);
                          setActiveTab('dashboard');
                        }}
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
              className={`vai-panel rounded-[1.4rem] p-5 ring-1 flex flex-col justify-between transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 ${
                p.popular ? 'ring-indigo-300 shadow-[0_18px_40px_rgba(79,70,229,0.10)]' : 'ring-slate-200/60'
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
                  <span className="text-3xl font-extrabold text-slate-900 font-heading">
                    {p.price ? `${p.price.currency} ${p.price.amount}` : 'A cotizar'}
                  </span>
                  <span className="text-xs text-slate-400 font-medium"> /mes</span>
                </div>

                <p className="text-xs text-indigo-700 font-semibold mb-4">
                  {p.businessesCount} suscripciones reales
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

      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="vai-panel rounded-[1.45rem] p-6 ring-1 ring-slate-200/60">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Workspace actual
                </span>
                <h2 className="mt-1 text-base font-bold text-slate-900 font-heading">
                  {workspace?.name || 'Sin workspace'}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Tu rol: <strong className="text-slate-700">{workspace?.role || 'sin rol'}</strong>
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                {workspace?.countryCode || '—'} · {workspace?.planId || '—'}
              </span>
            </div>

            {workspace?.role === 'owner' ? (
              <form onSubmit={handleRenameWorkspace} className="mt-5 flex flex-col sm:flex-row gap-2">
                <input
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-xl ring-1 ring-slate-200 bg-slate-50/70 text-xs focus:outline-none focus:ring-indigo-300"
                  placeholder="Nombre del workspace"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold"
                >
                  Guardar nombre
                </button>
              </form>
            ) : (
              <p className="mt-4 text-xs text-slate-500">
                Solo el owner puede cambiar el nombre del workspace.
              </p>
            )}

            {workspaceMessage && <p className="mt-2 text-xs font-semibold text-emerald-700">{workspaceMessage}</p>}
            {workspaceError && <p className="mt-2 text-xs font-semibold text-rose-600">{workspaceError}</p>}
          </div>
          <div className="vai-panel rounded-[1.45rem] p-6 ring-1 ring-slate-200/60">
            <h2 className="text-base font-bold text-slate-900 font-heading">Colaboradores del workspace</h2>
            <p className="mt-1 text-xs text-slate-500">
              Los roles controlan quién puede administrar el espacio. La invitación se comparte por enlace seguro.
            </p>

            {canManageMembers ? (
            <form onSubmit={handleCreateInvite} className="mt-4 grid sm:grid-cols-[1fr_160px_auto] gap-2">
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="persona@empresa.com"
                className="px-3 py-2 rounded-xl ring-1 ring-slate-200 bg-slate-50/70 text-xs"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member' | 'viewer')}
                className="px-3 py-2 rounded-xl ring-1 ring-slate-200 bg-slate-50/70 text-xs bg-white"
              >
                <option value="admin">Administrador</option>
                <option value="member">Miembro</option>
                <option value="viewer">Solo lectura</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.985]"
              >
                Crear invitación
              </button>
            </form>
            ) : (
              <p className="mt-4 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
                Tu rol es de solo lectura. Solo owner o admin pueden crear invitaciones.
              </p>
            )}

            {inviteMessage && <p className="mt-2 text-xs font-semibold text-emerald-700">{inviteMessage}</p>}
            {inviteError && <p className="mt-2 text-xs font-semibold text-rose-600">{inviteError}</p>}
          </div>

          <div className="vai-panel rounded-[1.45rem] ring-1 ring-slate-200/60 overflow-hidden">
            <div className="p-4 border-b border-slate-200 font-bold text-sm text-slate-900">Miembros activos</div>
            <div className="divide-y divide-slate-100">
              {members.map((member) => {
                const isOwner = member.userId === workspace?.ownerUserId || member.role === 'owner';

                return (
                  <div key={member.userId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {member.fullName || member.email || member.userId}
                      </p>
                      <p className="text-slate-500 truncate">
                        {member.email || (isOwner ? 'Owner del workspace' : member.userId)}
                      </p>
                      {isOwner && member.email && (
                        <p className="text-[10px] font-semibold text-indigo-600 mt-0.5">
                          Owner del workspace
                        </p>
                      )}
                    </div>

                    {workspace?.role === 'owner' && !isOwner ? (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleMemberRoleChange(
                              member.userId,
                              e.target.value as 'admin' | 'member' | 'viewer'
                            )
                          }
                          className="px-2.5 py-2 rounded-lg bg-slate-50 ring-1 ring-slate-200 text-[11px] font-semibold text-slate-700"
                          aria-label="Cambiar rol del colaborador"
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.userId)}
                          className="px-3 py-2 rounded-lg text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100"
                        >
                          Quitar
                        </button>
                      </div>
                    ) : (
                      <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                        {member.role}
                      </span>
                    )}
                  </div>
                );
              })}
              {memberMessage && (
                <div className="px-4 py-3 text-xs font-semibold text-emerald-700 bg-emerald-50/60">
                  {memberMessage}
                </div>
              )}
              {memberError && (
                <div className="px-4 py-3 text-xs font-semibold text-rose-700 bg-rose-50/60">
                  {memberError}
                </div>
              )}
              {members.length === 0 && (
                <div className="p-5 text-xs text-slate-500">Todavía no hay miembros cargados.</div>
              )}
            </div>
          </div>

          <div className="vai-panel rounded-[1.45rem] ring-1 ring-slate-200/60 overflow-hidden">
            <div className="p-4 border-b border-slate-200 font-bold text-sm text-slate-900">Invitaciones</div>
            <div className="divide-y divide-slate-100">
              {invites.map((invite) => (
                <div key={invite.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <p className="font-semibold text-slate-900">{invite.email}</p>
                    <p className="text-slate-500">
                      {invite.role} · vence {new Date(invite.expiresAt).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded font-bold text-[10px] ${
                    invite.acceptedAt ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {invite.acceptedAt ? 'ACEPTADA' : 'PENDIENTE'}
                  </span>
                </div>
              ))}
              {invites.length === 0 && (
                <div className="p-5 text-xs text-slate-500">No hay invitaciones creadas.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: AI Usage */}
      {activeTab === 'ai-usage' && (
        <div className="vai-panel rounded-[1.45rem] p-6 ring-1 ring-slate-200/60 space-y-4">
          <h2 className="text-base font-bold text-slate-900 font-heading">
            Consumo y Auditoría de Modelos de IA
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 block">Modelo configurado</span>
              <span className="text-base font-bold text-slate-900 font-mono mt-1 block">gemini-3.8-flash</span>
              <span className="text-[11px] text-slate-400">Google GenAI SDK TypeScript</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 block">Consultas al Asistente</span>
              <span className="text-base font-bold text-slate-900 mt-1 block">Sin telemetría</span>
              <span className="text-[11px] text-emerald-600 font-medium">Medición pendiente</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 block">Contenidos Redactados</span>
              <span className="text-base font-bold text-slate-900 mt-1 block">Sin telemetría</span>
              <span className="text-[11px] text-slate-400">Medición pendiente</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Integrations */}
      {activeTab === 'integrations' && (
        <div className="vai-panel rounded-[1.45rem] p-6 ring-1 ring-slate-200/60 space-y-4">
          <h2 className="text-base font-bold text-slate-900 font-heading">
            Estado de Conectores y APIs Externas
          </h2>
          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-slate-900 block">Google Search Console API</span>
                <span className="text-slate-500">Métricas de indexación real y clicks</span>
              </div>
              <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                REAL AL CONECTAR
              </span>
            </div>

            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-slate-900 block">Google PageSpeed Insights API</span>
                <span className="text-slate-500">Velocidad móvil y Core Web Vitals reales</span>
              </div>
              <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                REAL / CONFIGURABLE
              </span>
            </div>

            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-slate-900 block">Google Business Profile API</span>
                <span className="text-slate-500">Fichas de Google Maps, horarios y opiniones</span>
              </div>
              <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
                SIMULADO (DEMO)
              </span>
            </div>

            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-slate-900 block">Google Gemini API (gemini-3.8-flash)</span>
                <span className="text-slate-500">Asistente empresarial y redactor inteligente</span>
              </div>
              <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                CONFIGURABLE
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
