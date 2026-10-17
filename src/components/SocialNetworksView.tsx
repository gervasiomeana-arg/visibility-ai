import React, { useEffect, useRef, useState } from 'react';
import type { ActiveTab, Business, MonthlyEvolution } from '../types';
import { MonthlyChart } from './SocialMonthlyChart';
import { socialMetricsService } from '../services/socialMetricsService';
import { publicProfileUrl, type PublicNetwork, type SocialAccount } from '../../shared/socialMetrics';
import { hasUnverifiedSeeds, monthlyMetrics, monthlySeries } from '../../shared/socialMonthly';

interface Props {
  business: Business; allBusinesses?: Business[]; workspaceId: string; canEdit: boolean;
  evolution: MonthlyEvolution; setActiveTab: (tab: ActiveTab) => void;
  onSelectBusiness?: (businessId: string) => void;
}
const names = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok' };
function SocialNetworksForm({ business, allBusinesses = [business], workspaceId, canEdit, onSelectBusiness }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [network, setNetwork] = useState<PublicNetwork>('instagram');
  const [start, setStart] = useState(`${today.slice(0,4)}-01-01`);
  const [end, setEnd] = useState(today);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [profile, setProfile] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [candidates, setCandidates] = useState<string[]>([]);
  const live = useRef(true), lock = useRef(false), version = useRef(0);
  useEffect(() => { live.current = true; return () => { live.current = false; version.current++; }; }, []);
  useEffect(() => {
    let cancelled = false;
    socialMetricsService.list(workspaceId, business.id).then(rows => { if (!cancelled) setAccounts(rows); })
      .catch(() => { if (!cancelled) setLoadError('No se pudieron cargar las mediciones guardadas. Revisá la conexión y volvé a abrir Redes.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [workspaceId, business.id]);
  const account = accounts.find(a => a.network === network);
  useEffect(() => { setProfile(account?.profileUrl || ''); }, [network, account?.profileUrl]);
  useEffect(() => { setCandidates([]); setError(''); setMessage(''); version.current++; }, [network]);
  let series: ReturnType<typeof monthlySeries>[] = [], periodError = '';
  try { series = (Object.keys(monthlyMetrics) as (keyof typeof monthlyMetrics)[]).map(metric => monthlySeries(account, network, metric, start, end)); }
  catch (reason) { periodError = reason instanceof Error ? reason.message : 'Período inválido.'; }
  async function run() {
    if (lock.current || !canEdit || loading || loadError || periodError) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    const request = ++version.current;
    const current = () => live.current && request === version.current;
    try {
      let url = profile.trim();
      if (!url) {
        const result = await socialMetricsService.discover(business.url);
        if (!current()) return;
        const urls = [...new Set(result.candidates.filter(c => c.network === network).map(c => c.profileUrl))];
        setCandidates(urls);
        setMessage(urls.length ? 'Confirmá el perfil del cliente para consultar sus datos públicos.' : `No se encontró un perfil verificable de ${names[network]} en la web del cliente. Podés indicar su enlace.`);
        return;
      }
      url = publicProfileUrl(network, url);
      let currentAccount = account;
      if (!currentAccount || currentAccount.profileUrl !== url || currentAccount.presence) {
        currentAccount = await socialMetricsService.save({ workspaceId, businessId: business.id, network, profileUrl: url, accountId: '', measurements: account?.measurements || [], updatedAt: account?.updatedAt, publicProfiles: [{ role: 'own', name: business.name, profileUrl: url, confirmed: true, snapshots: account?.publicProfiles?.find(p => p.role === 'own')?.snapshots || [] }, ...(account?.publicProfiles || []).filter(p => p.role !== 'own' && p.profileUrl !== url)] });
        if (!current()) return;
        setAccounts(rows => [...rows.filter(a => a.network !== network), currentAccount!]);
      }
      const result = await socialMetricsService.collectPublic(network, url, start, end);
      if (!current()) return;
      if (result.status !== 'measured' || !result.snapshot) { setMessage(`Sin datos verificados nuevos. ${result.message} Las mediciones anteriores se conservan.`); return; }
      const previous = currentAccount?.publicProfiles?.find(p => p.role === 'own' && p.profileUrl === url);
      const own = { role: 'own' as const, name: business.name, profileUrl: url, confirmed: true, snapshots: [...(previous?.snapshots || []), result.snapshot].slice(-120) };
      const updated: SocialAccount = { workspaceId, businessId: business.id, network, profileUrl: url, accountId: currentAccount?.profileUrl === url ? currentAccount.accountId : '', measurements: currentAccount?.measurements || [], updatedAt: currentAccount?.updatedAt, publicProfiles: [own, ...(currentAccount?.publicProfiles || []).filter(p => p.role !== 'own' && p.profileUrl !== url)], presence: undefined };
      const saved = await socialMetricsService.save(updated);
      if (current()) {
        setAccounts(rows => [...rows.filter(a => a.network !== network), saved]);
        setMessage('Lectura pública guardada con su fecha real. Solo se grafican métricas verificadas; no se reconstruyen meses anteriores ni totales a partir de muestras.');
      }
    } catch (reason) { if (current()) setError(reason instanceof Error ? reason.message : 'No se pudo confirmar la consulta o el guardado.'); }
    finally { lock.current = false; if (live.current) setBusy(false); }
  }
  return <div className="space-y-6">
    <header><h2 className="font-heading text-2xl font-bold">Redes</h2><p className="text-sm text-slate-500 mt-2">Elegí un cliente, una red y el período que querés revisar.</p></header>
    <section className="vai-panel rounded-2xl p-5 space-y-4">
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <label className="text-sm font-medium">Cliente<select disabled={busy} className="block border rounded-lg p-3 w-full mt-2" value={business.id} onChange={e => onSelectBusiness?.(e.target.value)}>{allBusinesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <label className="text-sm font-medium">Red<select disabled={busy} className="block border rounded-lg p-3 w-full mt-2" value={network} onChange={e => setNetwork(e.target.value as PublicNetwork)}>{Object.entries(names).map(([key,name]) => <option key={key} value={key}>{name}</option>)}</select></label>
        <label className="text-sm font-medium">Desde<input disabled={busy} type="date" value={start} max={end || today} className="block border rounded-lg p-3 w-full mt-2" onChange={e => { setStart(e.target.value); setMessage(''); }} /></label>
        <label className="text-sm font-medium">Hasta<input disabled={busy} type="date" value={end} min={start} max={today} className="block border rounded-lg p-3 w-full mt-2" onChange={e => { setEnd(e.target.value); setMessage(''); }} /></label>
      </div>
      <div className="flex flex-wrap gap-3 items-center"><button onClick={run} disabled={busy || loading || !!loadError || !!periodError || !canEdit} className="rounded-lg bg-emerald-800 text-white px-5 py-3 disabled:opacity-50">{busy ? 'Buscando…' : 'Buscar datos públicos'}</button><span className="text-xs text-slate-500">{loading ? 'Cargando historial…' : 'Los gráficos muestran las mediciones guardadas del período.'}</span></div>
      <details open={!account?.profileUrl} className="text-sm"><summary className="cursor-pointer">Perfil de {names[network]}</summary><label className="block mt-3">Enlace confirmado del cliente<input disabled={busy || !canEdit} type="url" value={profile} onChange={e => setProfile(e.target.value)} className="block border rounded-lg p-3 w-full mt-2" placeholder={`https://www.${network}.com/${network === 'tiktok' ? '@' : ''}perfil/`} /></label>{candidates.map(url => <button key={url} className="block underline mt-3 break-all text-left" onClick={() => { setProfile(url); setCandidates([]); setMessage('Perfil seleccionado. Confirmá que corresponde al cliente y pulsá Buscar datos públicos.'); }}>Usar {url}</button>)}</details>
      <p className="text-xs text-slate-500">Seguidores: última medición observada de cada mes. Visualizaciones y alcance: solo informes del período exacto. La consulta pública actual no recupera automáticamente el historial ni el alcance privado.</p>
    </section>
    {(loadError || error || periodError) && <p role="alert" className="border border-red-200 bg-red-50 p-4 rounded-xl">{loadError || error || periodError}</p>}
    {message && <p role="status" className="border bg-slate-50 p-4 rounded-xl">{message}</p>}
    {account && hasUnverifiedSeeds(account) && <p role="alert" className="border border-amber-200 bg-amber-50 p-4 rounded-xl text-sm">Se detectaron cifras precargadas sin evidencia real. Se excluyeron de los gráficos; no se borraron registros guardados.</p>}
    {!loading && !loadError && !periodError && <>
      {!series.some(points => points.some(p => p.value !== null)) && <p className="text-sm text-slate-600">Sin datos verificados para {names[network]} en este período.</p>}
      {account?.presence?.status === 'not-used' && <p className="text-sm">Sin cuenta · confirmado por el operador. No equivale a cero seguidores.</p>}
      <div className="grid xl:grid-cols-3 gap-5">{(Object.entries(monthlyMetrics)).map(([metric,title],i) => <MonthlyChart key={metric} title={title} points={series[i]} />)}</div>
    </>}
  </div>;
}
export function SocialNetworksView(props: Props) { return <SocialNetworksForm key={`${props.workspaceId}:${props.business.id}:${props.business.url}`} {...props} />; }
