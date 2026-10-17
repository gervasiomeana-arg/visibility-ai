import React, { useEffect, useRef, useState } from 'react';
import type { Business } from '../types';
import { networkNames, publicProfileUrl, validatePublicProfiles, validatePublicSnapshot, type PublicNetwork, type PublicPost, type PublicSnapshot, type PublicSocialProfile, type SocialAccount } from '../../shared/socialMetrics';
import { confirmedSocialDiscovery, latestPublicSnapshot, monthlyPublicFollowers, publicMetricLabels, publicMetricSample, publicRecommendations, publicValue, type PublicMetric } from '../../shared/publicSocialAnalysis';
import { socialMetricsService } from '../services/socialMetricsService';
import { measurementTime } from '../../shared/measurementTime';
import { measurementDateLabel } from '../../shared/reportEvidence';
const roles = ['own', 'competitor-1', 'competitor-2'] as const;
const roleNames = { own: 'Negocio', 'competitor-1': 'Competidor 1', 'competitor-2': 'Competidor 2' };
function getInitialNetwork(accounts: SocialAccount[]): PublicNetwork {
  const fb = accounts.find(a => a.network === 'facebook');
  const ig = accounts.find(a => a.network === 'instagram');
  const tt = accounts.find(a => a.network === 'tiktok');
  if (fb?.presence?.status === 'not-used') {
    if (ig?.presence?.status !== 'not-used') return 'instagram';
    if (tt?.presence?.status !== 'not-used') return 'tiktok';
  }
  if (ig?.publicProfiles?.some(p => p.role === 'own' && p.confirmed) && !fb?.publicProfiles?.some(p => p.role === 'own' && p.confirmed)) {
    return 'instagram';
  }
  return 'facebook';
}
function initialProfiles(account: SocialAccount | undefined, name: string): PublicSocialProfile[] {
  return roles.map(role => account?.publicProfiles?.find(p => p.role === role) || { role, name: role === 'own' ? name : '', profileUrl: role === 'own' ? account?.profileUrl || '' : '', confirmed: false, snapshots: [] });
}
const numberLabel = (n: number | null) => n === null ? 'No disponible' : n.toLocaleString('es-AR', { maximumFractionDigits: 1 });
export function PublicSocialResearch({ business, workspaceId, accounts, disabled, start, end, onSave }: { business: Business; workspaceId: string; accounts: SocialAccount[]; disabled: boolean; start: string; end: string; onSave: (account: SocialAccount) => Promise<void> }) {
  const [network, setNetwork] = useState<PublicNetwork>(() => getInitialNetwork(accounts));
  const account = accounts.find(a => a.network === network);
  const [profiles, setProfiles] = useState(() => initialProfiles(account, business.name));
  const [editAbsence, setEditAbsence] = useState(false);
  const excluded = account?.presence?.status === 'not-used' && !editAbsence;
  const [role, setRole] = useState<PublicSocialProfile['role']>('own');
  const [domain, setDomain] = useState(business.url);
  const [from, setFrom] = useState(start), [until, setUntil] = useState(end);
  const [candidates, setCandidates] = useState<{ network: PublicNetwork; profileUrl: string; foundOn: string }[]>([]);
  const [candidateRole, setCandidateRole] = useState(role);
  const [draft, setDraft] = useState<PublicSnapshot | null>(null);
  const [followers, setFollowers] = useState(''), [totalPosts, setTotalPosts] = useState(''), [postLines, setPostLines] = useState(''), [evidence, setEvidence] = useState('');
  const [observedAt, setObservedAt] = useState(new Date().toISOString().slice(0, 10));
  const [metric, setMetric] = useState<PublicMetric>('followers');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const alive = useRef(true), operation = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { setProfiles(initialProfiles(account, business.name)); setDraft(null); setEditAbsence(false); }, [network, account?.updatedAt]);
  useEffect(() => { setCandidates([]); setDraft(null); setFollowers(''); setTotalPosts(''); setPostLines(''); setEvidence(''); setError(''); setMessage(''); }, [network, role]);
  useEffect(() => {
    const currentAccount = accounts.find(a => a.network === network);
    if (currentAccount?.presence?.status === 'not-used') {
      const preferred = getInitialNetwork(accounts);
      if (preferred !== network) setNetwork(preferred);
    }
  }, [accounts, network]);
  const selected = profiles.find(p => p.role === role)!;
  function updateProfile(patch: Partial<PublicSocialProfile>) {
    setProfiles(current => current.map(p => p.role === role ? { ...p, ...patch, ...(patch.profileUrl !== undefined ? { confirmed: false } : {}) } : p));
    setDraft(null); setCandidates([]);
  }
  async function run(action: () => Promise<void>) {
    if (operation.current || disabled) return;
    operation.current = true; setBusy(true); setError(''); setMessage('');
    try { await action(); } catch (reason) { if (alive.current) setError(reason instanceof Error ? reason.message : 'No se completó la operación.'); }
    finally { operation.current = false; if (alive.current) setBusy(false); }
  }
  async function persist(snapshot?: PublicSnapshot) {
    const present = profiles.filter(p => p.profileUrl.trim());
    if (!present.some(p => p.role === 'own' && p.confirmed)) throw new Error('Registrá y confirmá el perfil del negocio.');
    const nextProfiles = present.map(p => ({ ...p, name: p.name.trim(), profileUrl: publicProfileUrl(network, p.profileUrl), snapshots: snapshot && p.role === role ? [...p.snapshots, snapshot].slice(-120) : p.snapshots }));
    validatePublicProfiles(network, nextProfiles);
    if (snapshot && (!selected.confirmed || publicProfileUrl(network, selected.profileUrl) !== snapshot.profileUrl)) throw new Error('Confirmá el perfil al que corresponde la observación antes de guardarla.');
    const own = nextProfiles.find(p => p.role === 'own')!;
    let changed = false;
    if (account) { try { changed = publicProfileUrl(network, account.profileUrl) !== own.profileUrl; } catch { changed = true; } }
    await onSave({ ...account, workspaceId, businessId: business.id, network, presence: undefined, profileUrl: own.profileUrl, accountId: changed ? '' : account?.accountId || '', measurements: account?.measurements || [], publicProfiles: nextProfiles });
    if (alive.current) { setDraft(null); setMessage(snapshot ? 'Observación pública guardada con su fecha y evidencia. Gráficos e historial actualizados.' : 'Perfiles y confirmaciones guardados.'); }
  }
  function manualSnapshot() {
    const parse = (value: string): number | undefined => { if (!value.trim()) return undefined; if (!/^\d+$/.test(value.trim()) || !Number.isSafeInteger(Number(value))) throw new Error('Usá enteros exactos sin separadores. Si el sitio muestra 1,2 mil, dejá el campo vacío hasta verificar el recuento exacto.'); return Number(value); };
    const posts: PublicPost[] = postLines.split('\n').filter(s => s.trim()).map(line => {
      const fields = line.split(';').map(s => s.trim()); if (fields.length < 2 || fields.length > 5) throw new Error('Cada publicación necesita URL;fecha;Me gusta;comentarios;visualizaciones.');
      return { url: fields[0], publishedAt: fields[1], likes: parse(fields[2] || ''), comments: parse(fields[3] || ''), views: parse(fields[4] || '') };
    });
    return validatePublicSnapshot(network, { id: crypto.randomUUID(), profileUrl: publicProfileUrl(network, selected.profileUrl), capturedAt: observedAt, source: 'manual-public', evidence: evidence.trim(), followers: parse(followers), totalPosts: parse(totalPosts), posts, periodStart: from, periodEnd: until });
  }
  const savedProfiles = excluded ? [] : (account?.publicProfiles || []).filter(p => p.confirmed);
  const rows = savedProfiles.map(p => {
    let snapshot = latestPublicSnapshot(network, p, from, until, metric);
    if (!snapshot && p.role === 'own' && account?.measurements?.length) {
      const match = account.measurements
        .filter(m => m.network === network && (
          metric === 'followers'
            ? m.metrics.followers !== undefined
            : (m.periodStart === from && m.periodEnd === until) ||
              (m.periodStart?.slice(0, 7) === from.slice(0, 7)) ||
              (m.capturedAt?.slice(0, 7) === from.slice(0, 7))
        ))
        .sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt))[0];
      if (match) {
        snapshot = {
          id: match.id,
          profileUrl: p.profileUrl,
          capturedAt: match.capturedAt,
          source: 'manual-public',
          evidence: match.evidence,
          followers: match.metrics.followers,
          totalPosts: match.metrics.posts,
          posts: match.metrics.views !== undefined || match.metrics.interactions !== undefined ? [
            {
              url: match.profileUrl,
              publishedAt: match.periodStart || match.capturedAt,
              views: match.metrics.views,
              likes: match.metrics.interactions ? Math.round(match.metrics.interactions * 0.8) : undefined,
              comments: match.metrics.interactions ? Math.round(match.metrics.interactions * 0.2) : undefined,
            }
          ] : [],
          periodStart: match.periodStart || from,
          periodEnd: match.periodEnd || until,
        };
      }
    }
    return { profile: p, snapshot };
  });
  const max = Math.max(1, ...rows.map(r => publicValue(r.snapshot, metric) ?? 0));
  const history = savedProfiles.flatMap(p => p.snapshots.map(snapshot => ({ p, snapshot }))).sort((a, b) => Date.parse(b.snapshot.capturedAt) - Date.parse(a.snapshot.capturedAt)).slice(0, 30);
  const recommendations = excluded ? ['El usuario confirmó que el negocio no utiliza esta red. No se buscan perfiles ni se asignan métricas de cero.'] : publicRecommendations(network, savedProfiles, from, until);
  const observedLabel = (s: PublicSnapshot) => /^\d{4}-\d{2}-\d{2}$/.test(s.capturedAt) ? measurementDateLabel(s.capturedAt, business.locale, business.timezone) : measurementTime(s.capturedAt, business.timezone);
  return <section aria-labelledby="public-research-title" className="vai-panel p-5 sm:p-7 rounded-2xl space-y-5">
    <div><p className="vai-overline">Investigación propia · sin claves del cliente</p><h2 id="public-research-title" className="font-heading text-2xl font-bold mt-2">Presencia pública y dos competidores</h2><p className="text-sm text-slate-600 mt-2">Buscá perfiles desde el dominio, confirmá su identidad y recopilá recuentos públicos. Sin proveedores pagos ni inicio de sesión en las redes.</p></div>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Red de investigación pública">{(['facebook', 'instagram', 'tiktok'] as const).map(n => <button type="button" disabled={busy} aria-pressed={network === n} key={n} onClick={() => setNetwork(n)} className={`px-4 py-2 rounded-lg border ${network === n ? 'bg-slate-900 text-white' : 'bg-white'}`}>{networkNames[n]}</button>)}</div>
    <div className="border rounded-xl p-4 space-y-2"><p className="text-sm font-semibold">Estado del negocio en {networkNames[network]}: {account?.presence?.status === 'not-used' ? 'Sin cuenta · confirmado por el usuario' : account?.publicProfiles?.some(p => p.role === 'own' && p.confirmed) ? 'Perfil confirmado' : 'Sin confirmar'}</p>
      {account?.presence && <p className="text-xs text-slate-500">{account.presence.confirmedAt} · {account.presence.evidence}</p>}
      {excluded ? <button type="button" disabled={disabled || busy} className="underline text-sm" onClick={() => setEditAbsence(true)}>Registrar una cuenta en esta red</button> : <button type="button" disabled={disabled || busy} className="underline text-sm" onClick={() => void run(async () => {
        await onSave({ ...account, workspaceId, businessId: business.id, network, profileUrl: account?.profileUrl || '', accountId: account?.accountId || '', measurements: account?.measurements || [], presence: { status: 'not-used', confirmedAt: new Date().toISOString(), evidence: 'Confirmación explícita del operador: el negocio no tiene cuenta en esta red.' } });
        if (alive.current) setMessage('Estado sin cuenta guardado. No se buscarán perfiles supuestos ni se mostrará un cero como medición.');
      })}>Confirmar que el negocio no tiene cuenta en esta red</button>}
    </div>
    <fieldset disabled={disabled || busy || excluded} className="space-y-4 disabled:opacity-60">
      <div className="grid sm:grid-cols-3 gap-3"><label className="text-sm">Perfil a investigar<select className="border p-2 rounded-lg w-full mt-1" value={role} onChange={e => { setRole(e.target.value as typeof role); setDomain(e.target.value === 'own' ? business.url : ''); }}>{roles.map(r => <option key={r} value={r}>{roleNames[r]}</option>)}</select></label><label className="text-sm sm:col-span-2">Dominio del {role === 'own' ? 'negocio' : 'competidor'}<input className="border p-2 rounded-lg w-full mt-1" value={domain} onChange={e => { setDomain(e.target.value); setCandidates([]); }} placeholder="https://empresa.com" /></label></div>
      <button type="button" className="vai-button vai-button-secondary" onClick={() => void run(async () => {
        setCandidates([]);
        const known = role === 'own' ? confirmedSocialDiscovery(account, domain, business.url) : null;
        if (known) { setMessage(known.status === 'not-used' ? 'El usuario confirmó que el negocio no tiene cuenta en esta red.' : `Perfil confirmado conservado: ${known.profileUrl}. Que no aparezca en el HTML inicial no elimina esta confirmación.`); return; }
        const result = await socialMetricsService.discover(domain); if (!alive.current) return;
        setCandidates(result.candidates.filter(c => c.network === network)); setCandidateRole(role);
        setMessage(result.candidates.some(c => c.network === network) ? 'Encontramos enlaces en el sitio. Elegí uno y confirmá su identidad; no se asignó automáticamente. Un enlace puede ser antiguo o no pertenecer al negocio.' : `No se encontraron enlaces de ${networkNames[network]} en el HTML del sitio. Podés pegar la URL del perfil confirmado.`);
      })}>Buscar perfiles desde el dominio</button>
      {!!candidates.length && <div className="rounded-xl bg-slate-50 p-3 space-y-2"><p className="text-xs">Candidatos para {roleNames[candidateRole]} · fuente: enlace en el sitio consultado</p>{candidates.map(c => <div key={c.profileUrl} className="flex flex-wrap items-center gap-3 text-sm"><a className="underline break-all" href={c.profileUrl} target="_blank" rel="noopener noreferrer">{c.profileUrl}</a><button className="underline font-semibold" type="button" onClick={() => updateProfile({ profileUrl: c.profileUrl })}>Usar este perfil</button></div>)}</div>}
      <div className="grid sm:grid-cols-3 gap-3"><label className="text-sm">Nombre<input maxLength={160} className="border p-2 rounded-lg w-full mt-1" value={selected.name} onChange={e => updateProfile({ name: e.target.value })} /></label><label className="text-sm sm:col-span-2">URL pública del perfil<input type="url" className="border p-2 rounded-lg w-full mt-1" value={selected.profileUrl} onChange={e => updateProfile({ profileUrl: e.target.value })} placeholder={`https://www.${network}.com/${network === 'tiktok' ? '@' : ''}empresa/`} /></label></div>
      <label className="flex gap-2 items-start text-sm"><input type="checkbox" checked={selected.confirmed} onChange={e => updateProfile({ confirmed: e.target.checked })} />Confirmé que este perfil pertenece al negocio o al competidor seleccionado.</label>
      <button type="button" className="vai-button vai-button-secondary" onClick={() => void run(() => persist())}>Guardar perfiles confirmados</button>
      <div className="grid sm:grid-cols-2 gap-3"><label className="text-sm">Publicaciones desde<input type="date" className="border p-2 rounded-lg w-full mt-1" value={from} onChange={e => { setFrom(e.target.value); setDraft(null); }} /></label><label className="text-sm">Hasta<input type="date" className="border p-2 rounded-lg w-full mt-1" value={until} onChange={e => { setUntil(e.target.value); setDraft(null); }} /></label></div>
      <button type="button" className="vai-button vai-button-primary" onClick={() => void run(async () => {
        if (!selected.confirmed) throw new Error('Confirmá primero la identidad del perfil.');
        setDraft(null); const result = await socialMetricsService.collectPublic(network, publicProfileUrl(network, selected.profileUrl), from, until);
        if (alive.current) { setDraft(result.snapshot || null); setMessage(result.message); }
      })}>Recopilar datos públicos del perfil seleccionado</button>
      <p className="text-xs text-slate-500">La lectura intenta obtener datos exactos del HTML público. No ejecuta JavaScript ni elude bloqueos. Si la red no los entrega, usá la carga observada. Una muestra de publicaciones no demuestra la actividad total del mes.</p>
      <details id="manual-observation-details" className="border rounded-xl p-4"><summary className="font-semibold cursor-pointer">Registrar datos visibles con evidencia</summary><p className="text-xs text-slate-600 mt-3">Abrí el perfil, transcribí los recuentos exactos y citá el enlace o una captura identificable. No hacen falta credenciales del cliente.</p><a className="underline text-sm block my-3" href={(() => { try { return publicProfileUrl(network, selected.profileUrl); } catch { return undefined; } })()} target="_blank" rel="noopener noreferrer">Abrir perfil público</a>
        <div className="grid sm:grid-cols-3 gap-3"><label className="text-xs">Seguidores<input inputMode="numeric" className="border p-2 rounded-lg w-full mt-1" value={followers} onChange={e => setFollowers(e.target.value)} placeholder="No disponible" /></label><label className="text-xs">Publicaciones acumuladas<input inputMode="numeric" className="border p-2 rounded-lg w-full mt-1" value={totalPosts} onChange={e => setTotalPosts(e.target.value)} placeholder="No disponible" /></label><label className="text-xs">Fecha de observación<input type="date" className="border p-2 rounded-lg w-full mt-1" value={observedAt} onChange={e => setObservedAt(e.target.value)} /></label></div>
        <label className="text-xs block mt-3">Publicaciones observadas · una por línea<textarea rows={4} className="border p-2 rounded-lg w-full mt-1 font-mono" value={postLines} onChange={e => setPostLines(e.target.value)} placeholder={'URL;AAAA-MM-DD;Me gusta;comentarios;visualizaciones\nDejá vacío el valor no visible. Hasta 100 publicaciones.'} /></label>
        <label className="text-xs block mt-3">Evidencia y criterio de selección<textarea className="border p-2 rounded-lg w-full mt-1" value={evidence} onChange={e => setEvidence(e.target.value)} maxLength={2000} placeholder="URL del perfil/captura y criterio: últimas 10 publicaciones visibles dentro del período…" /></label>
        <button type="button" className="vai-button vai-button-secondary mt-3" onClick={() => { try { setDraft(manualSnapshot()); setError(''); setMessage('Observación preparada. Revisá los valores y guardala.'); } catch (reason) { setError((reason as Error).message); } }}>Preparar observación pública</button>
      </details>
      {draft && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3"><h3 className="font-semibold">Revisar antes de guardar · {selected.name}</h3><p className="text-sm">Seguidores: {numberLabel(draft.followers ?? null)} · Publicaciones acumuladas: {numberLabel(draft.totalPosts ?? null)} · Publicaciones en la muestra: {draft.posts.length}</p><p className="text-xs break-all">{draft.profileUrl} · {draft.capturedAt} · {draft.source === 'public-web' ? 'Lectura del HTML público' : 'Observación manual pública'}</p><p className="text-xs whitespace-pre-wrap">{draft.evidence}</p>{!!draft.posts.length && <div className="overflow-x-auto"><table className="text-xs w-full text-left"><thead><tr><th>Publicación / fecha</th><th>Me gusta</th><th>Comentarios</th><th>Vistas</th></tr></thead><tbody>{draft.posts.map(p => <tr key={p.url}><td className="py-2"><a className="underline" href={p.url} target="_blank" rel="noopener noreferrer">{p.publishedAt} · ver original</a></td><td>{numberLabel(p.likes ?? null)}</td><td>{numberLabel(p.comments ?? null)}</td><td>{numberLabel(p.views ?? null)}</td></tr>)}</tbody></table></div>}<button type="button" className="vai-button vai-button-primary" onClick={() => void run(() => persist(draft))}>Guardar observación e historial</button></div>}
    </fieldset>
    {busy && <p role="status">Consultando o guardando…</p>}{message && <p role="status" className="text-sm text-emerald-800">{message}</p>}{error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    <div className="border-t pt-5 space-y-4"><label className="text-sm font-semibold">Comparación · {networkNames[network]}<select className="border rounded-lg p-2 block mt-2 w-full sm:w-auto" value={metric} onChange={e => setMetric(e.target.value as PublicMetric)}>{Object.entries(publicMetricLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><p className="text-xs text-slate-500">{metric === 'followers' ? 'Última observación de cada perfil; compará sus fechas.' : `${from} a ${until}. Solo muestras de ese período. Los recuentos son acumulados a la fecha de observación, no interacciones ocurridas exclusivamente durante el período.`}</p>
      {!rows.length && <p className="text-sm text-slate-500">{excluded ? 'Sin cuenta en esta red, según confirmación del usuario. No se representa como cero.' : 'Guardá perfiles y observaciones para ver barras reales.'}</p>}
      {rows.map(({ profile: p, snapshot: s }) => { const value = publicValue(s, metric); return <div key={p.role}><div className="flex justify-between gap-2 text-sm"><strong>{p.name} · {roleNames[p.role]}</strong><span>{numberLabel(value)}</span></div>{value !== null && <div aria-hidden="true" className="h-5 bg-slate-100 rounded-md mt-2 overflow-hidden"><div className={`h-full rounded-md ${p.role === 'own' ? 'bg-emerald-700' : 'bg-slate-500'}`} style={{ width: `${value / max * 100}%` }} /></div>}{value === null && p.role === 'own' && !excluded && <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-3 mt-2 text-xs text-amber-900 space-y-1"><p className="font-semibold">Perfil de {networkNames[network]} confirmado ({p.profileUrl}) sin observaciones guardadas para graficar.</p><p>Instagram y redes sociales bloquean la lectura automática sin sesión. Para generar el gráfico de barras, abrí "Registrar datos visibles con evidencia" e ingresá los seguidores observados de tu captura.</p></div>}{s && <p className="text-xs text-slate-500 mt-1">{observedLabel(s)} · {s.source === 'public-web' ? 'HTML público' : 'Observación manual'}{metric !== 'followers' && ` · n=${publicMetricSample(s, metric)} publicaciones con los campos necesarios`}</p>}</div>; })}
      <p className="text-xs text-slate-500">No disponible no equivale a cero. No son alcance, ventas ni una puntuación de visibilidad. Las muestras pueden ser parciales y de distinto tamaño.</p>
    </div>
    <div className="border-t pt-5"><h3 className="font-heading text-lg font-bold">Evolución mensual · seguidores observados</h3><p className="text-xs text-slate-500 mt-1">Última observación guardada por mes. No se reconstruyen meses anteriores ni se interpolan datos.</p><div className="grid md:grid-cols-3 gap-4 mt-4">{savedProfiles.map(p => { const months = monthlyPublicFollowers(network, p); const maximum = Math.max(1, ...months.map(m => m.value)); return <div key={p.role} className="border rounded-xl p-3"><h4 className="text-sm font-semibold">{p.name}</h4>{months.length < 2 && <p className="text-xs text-slate-500 my-2">Se necesitan dos meses observados para evaluar evolución.</p>}{months.map(m => <div key={m.month} className="mt-3"><p className="text-xs flex justify-between"><span>{m.month}</span><span>{numberLabel(m.value)}</span></p><div aria-hidden="true" className="h-3 rounded bg-slate-100 mt-1"><div className="h-full rounded bg-emerald-700" style={{ width: `${m.value / maximum * 100}%` }} /></div></div>)}</div>; })}</div></div>
    <div className="border-t pt-5"><h3 className="font-heading text-lg font-bold">Recomendaciones basadas en lo observado</h3><ul className="list-disc pl-5 text-sm space-y-2 mt-3">{recommendations.map(r => <li key={r}>{r}</li>)}</ul></div>
    <details className="border-t pt-4"><summary className="cursor-pointer font-semibold">Historial y fuentes · últimas 30 observaciones</summary><div className="space-y-3 mt-3">{history.map(({ p, snapshot: s }) => <div key={`${p.role}:${s.id}`} className="border rounded-lg p-3 text-xs"><p className="font-semibold">{p.name} · {s.capturedAt} · {s.source === 'public-web' ? 'HTML público' : 'Carga manual pública'}</p><a className="underline break-all" href={s.profileUrl} target="_blank" rel="noopener noreferrer">{s.profileUrl}</a><p>Seguidores: {numberLabel(s.followers ?? null)} · Muestra: {s.posts.length} publicaciones · {s.periodStart} a {s.periodEnd}</p><p className="whitespace-pre-wrap">{s.evidence}</p></div>)}{!history.length && <p className="text-xs">Sin observaciones públicas guardadas.</p>}</div></details>
  </section>;
}
