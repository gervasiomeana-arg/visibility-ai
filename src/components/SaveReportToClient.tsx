import React, { useEffect, useRef, useState } from 'react';
import type { Business, Workspace } from '../types';
import type { ClientAccount } from '../../shared/clientLedger';
import { saveGeneratedClientReport, type GeneratedReportStore, type PreparedClientReport } from '../../shared/generatedClientReport';

export function SaveReportToClient({ workspace, business, prepare, store, onOpenClients }: {
  workspace: Workspace;
  business: Business;
  prepare: () => Promise<PreparedClientReport>;
  store: GeneratedReportStore;
  onOpenClients?: () => void;
}) {
  const [clients, setClients] = useState<ClientAccount[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [title, setTitle] = useState(`Informe de visibilidad · ${business.name}`.slice(0,160));
  const [period, setPeriod] = useState('');
  const alive = useRef(true);
  const pending = useRef(false);
  const currentPrepare = useRef(prepare);
  currentPrepare.current = prepare;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { setSaved(''); }, [prepare]);
  async function load() {
    if (pending.current) return;
    setLoading(true); setError(''); setSaved('');
    try {
      const rows = await store.list(workspace.id);
      if (!alive.current) return;
      const own = rows.filter(row => row.workspaceId === workspace.id && row.businessIds.includes(business.id));
      setClients(own); setSelected(own.length === 1 ? own[0].id : '');
    } catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : 'No se pudieron cargar los clientes.'); }
    finally { if (alive.current) setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current || loading || saved) return;
    pending.current = true; setBusy(true); setError('');
    const source = prepare;
    try {
      const result = await saveGeneratedClientReport({ workspaceId: workspace.id, clientId: selected, business, title, period }, source, () => alive.current && currentPrepare.current === source, store);
      if (alive.current && currentPrepare.current === source) setSaved(`Informe guardado y comprobado en la ficha de ${result.name}. Envío pendiente: descargalo desde Clientes y envialo manualmente.`);
    } catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : 'No se pudo guardar el informe.'); }
    finally { pending.current = false; if (alive.current) setBusy(false); }
  }
  return <section className="no-print vai-panel rounded-xl p-6 space-y-3" aria-label="Guardar informe en Clientes">
    <h2 className="text-lg font-bold">Guardar en Clientes</h2>
    <p className="text-sm text-slate-600">Guardá una copia privada del PDF de este informe en la ficha correspondiente. No necesitás descargarlo y volver a cargarlo.</p>
    <button type="button" disabled={loading || busy} className="vai-button vai-button-secondary" onClick={() => void load()}>{loading ? 'Cargando clientes…' : 'Recargar clientes asociados'}</button>
    {!loading && !clients.length && <p className="text-sm">No hay clientes asociados a este negocio. Creá o editá una ficha en Clientes para asociarlo.</p>}
    {!!clients.length && <form onSubmit={event => void save(event)} className="grid sm:grid-cols-2 gap-3">
      <label>Cliente asociado<select required disabled={busy || loading || !!saved} className="vai-input w-full" value={selected} onChange={event => setSelected(event.target.value)}><option value="">Elegí el cliente</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
      <label>Título del informe<input required maxLength={160} disabled={busy || !!saved} className="vai-input w-full" value={title} onChange={event => setTitle(event.target.value)} /></label>
      <label>Período / alcance del informe<input required maxLength={100} disabled={busy || !!saved} className="vai-input w-full" placeholder="Diagnóstico inicial · 17/10/2026" value={period} onChange={event => setPeriod(event.target.value)} /></label>
      <button disabled={busy || loading || !!saved} className="vai-button vai-button-primary self-end">{busy ? 'Guardando PDF…' : saved ? 'PDF guardado' : 'Guardar PDF en la ficha'}</button>
    </form>}
    <p className="text-xs text-slate-500">El período describe el alcance que acordaste; no cambia las fechas de medición del documento. Guardar no registra un envío.</p>
    {error && <p role="alert" className="rounded-xl bg-red-50 text-red-800 p-3">{error}</p>}
    {saved && <p role="status" className="rounded-xl bg-emerald-50 p-3">{saved}</p>}
    {onOpenClients && <button type="button" disabled={busy} className="vai-button vai-button-secondary" onClick={onOpenClients}>Abrir Clientes</button>}
  </section>;
}
