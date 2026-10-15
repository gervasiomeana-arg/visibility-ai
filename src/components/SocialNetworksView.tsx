import React, { useEffect, useRef, useState } from 'react';
import { Business, ActiveTab, MonthlyEvolution } from '../types';
import { measurementDateLabel } from '../../shared/reportEvidence';
import { reportSearchEvidence } from '../../shared/reportEvidence';
import { calendarDay, socialNetworks, networkNames, metricDefinitions, socialProfileUrl, validateSocialMeasurement, type SocialAccount, type SocialMetric, type SocialNetwork } from '../../shared/socialMetrics';
import { socialMetricsService } from '../services/socialMetricsService';
import { SocialMetricBars } from './SocialMetricBars';
import { measurementTime } from '../../shared/measurementTime';

interface Props { business: Business; workspaceId: string; canEdit: boolean; evolution: MonthlyEvolution; setActiveTab: (tab: ActiveTab) => void }
function SocialNetworksForm({ business, workspaceId, canEdit, evolution, setActiveTab }: Props) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);
  const [network, setNetwork] = useState<SocialNetwork>('facebook');
  const [profile, setProfile] = useState('');
  const [accountId, setAccountId] = useState('');
  const profileSection = useRef<HTMLElement>(null);
  const profileInput = useRef<HTMLInputElement>(null);
  function openProfileEditor(nextNetwork: SocialNetwork) {
    setNetwork(nextNetwork);
    profileSection.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    profileSection.current?.focus({ preventScroll: true });
    profileInput.current?.focus({ preventScroll: true });
  }
  const [token, setToken] = useState('');
  const [values, setValues] = useState<Partial<Record<SocialMetric, string>>>({});
  const [evidence, setEvidence] = useState('');
  const [capturedAt, setCapturedAt] = useState(new Date().toISOString().slice(0, 10));
  const [metric, setMetric] = useState<SocialMetric>('followers');
  const search = reportSearchEvidence(evolution, business.url).latest;
  const [start, setStart] = useState(search?.period.startDate || new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10));
  const [end, setEnd] = useState(search?.period.endDate || new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const lock = useRef(false), live = useRef(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  useEffect(() => {
    let cancelled = false; setLoading(true); setLoadError('');
    socialMetricsService.list(workspaceId, business.id).then(result => { if (!cancelled) setAccounts(result); }).catch(reason => { if (!cancelled) setLoadError(reason.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [workspaceId, business.id, revision]);
  const selected = accounts.find(account => account.network === network);
  useEffect(() => { setProfile(selected?.profileUrl || ''); setAccountId(selected?.accountId || ''); setToken(''); setValues({}); setEvidence(''); }, [network, selected?.updatedAt]);
  useEffect(() => { setMessage(''); setError(''); }, [network]);
  async function save(mode: 'profile' | 'manual' | 'api') {
    if (!canEdit || loading || loadError || lock.current) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const profileUrl = socialProfileUrl(network, profile.trim());
      const next: SocialAccount = { workspaceId, businessId: business.id, network, profileUrl, accountId: accountId.trim(), measurements: selected?.measurements || [], updatedAt: selected?.updatedAt };
      let metricToShow: SocialMetric | undefined;
      if (mode !== 'profile') {
        let measurement;
        if (mode === 'api') {
          try { measurement = await socialMetricsService.measure(network, profileUrl, next.accountId, token); }
          finally { if (live.current) setToken(''); }
          if (!live.current) return;
        } else {
          if (!calendarDay(capturedAt)) throw new Error('Indicá una fecha real de medición.');
          const metrics = Object.fromEntries(Object.entries(values).filter(([, value]) => value?.trim()).map(([key, value]) => {
            if (!/^\d+$/.test(value!.trim())) throw new Error('Usá números enteros sin puntos ni comas; dejá vacío lo que no mediste.');
            return [key, Number(value)];
          }));
          measurement = validateSocialMeasurement({ id: crypto.randomUUID(), network, profileUrl, capturedAt, accountId: next.accountId || undefined, source: 'manual', evidence: evidence.trim(), metrics, periodStart: start, periodEnd: end });
        }
        next.measurements = [...next.measurements, measurement].slice(-100);
        metricToShow = Object.keys(measurement.metrics)[0] as SocialMetric;
      }
      const saved = await socialMetricsService.save(next);
      if (live.current) { if (metricToShow) setMetric(metricToShow); setAccounts(current => [...current.filter(account => account.network !== network), saved]); setMessage(mode === 'profile' ? 'Perfil guardado en el espacio de trabajo.' : 'Medición guardada. Ya podés verla en el gráfico y el historial.'); }
    } catch (reason) { if (live.current) setError(reason instanceof Error ? reason.message : 'No se confirmó el guardado.'); }
    finally { lock.current = false; if (live.current) setBusy(false); }
  }
  const google: SocialAccount | null = search ? { workspaceId, businessId: business.id, network: 'google', profileUrl: business.url, accountId: search.period.siteUrl || '', measurements: [{ id: 'current-search', accountId: search.period.siteUrl, network: 'google', profileUrl: business.url, capturedAt: search.period.loadedAt, source: 'google-search-console', evidence: `Search Console · ${search.period.siteUrl}`, periodStart: search.period.startDate, periodEnd: search.period.endDate, metrics: { clicks: search.clicks, impressions: search.impressions } }] } : null;
  const history = accounts.flatMap(account => account.measurements.map(measurement => ({ ...measurement, current: measurement.profileUrl === account.profileUrl && (!account.accountId || measurement.accountId === account.accountId) }))).sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt)).slice(0, 12);
  return <div className="space-y-6 pb-20">
    <header className="vai-panel p-6 rounded-2xl"><p className="vai-overline">Presencia digital por canal</p><h1 className="font-heading text-3xl font-bold mt-2">Redes · {business.name}</h1><p className="text-sm text-slate-600 mt-2">Registrá perfiles oficiales y mediciones con fuente. Google muestra búsquedas orgánicas de Search Console; no mide Google Maps ni reseñas.</p></header>
    {loading && <p role="status">Cargando los perfiles de este negocio…</p>}
    {loadError && <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{loadError}<button type="button" onClick={() => setRevision(value => value + 1)} className="underline ml-3">Reintentar carga</button></div>}
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">{socialNetworks.map(name => { const account = accounts.find(item => item.network === name); return <div key={name} className="vai-panel p-4 rounded-xl"><h2 className="font-semibold">{networkNames[name]}</h2><p className="text-xs text-slate-500 mt-2">{name === 'google' ? search ? 'Medición importada disponible' : 'Sin medición importada' : account ? `${account.measurements.length} mediciones guardadas` : 'Sin perfil registrado'}</p>{name === 'google' ? <button onClick={() => setActiveTab('keywords')} className="underline text-sm mt-3">Abrir Search Console</button> : account ? <a href={account.profileUrl} target="_blank" rel="noopener noreferrer" className="underline text-sm mt-3 block">Ver perfil</a> : <button type="button" aria-controls="social-profile-editor" onClick={() => openProfileEditor(name)} className="underline text-sm mt-3">Registrar perfil</button>}</div>; })}</div>
    <div className="vai-panel p-4 rounded-xl grid sm:grid-cols-3 gap-3"><label className="text-xs">Métrica<select className="w-full border rounded-lg p-2 mt-1" value={metric} onChange={event => setMetric(event.target.value as SocialMetric)}>{Object.entries(metricDefinitions).map(([key, definition]) => <option key={key} value={key}>{definition.label}</option>)}</select></label><label className="text-xs">Inicio del período<input type="date" className="w-full border rounded-lg p-2 mt-1" value={start} onChange={event => setStart(event.target.value)} /></label><label className="text-xs">Fin del período<input type="date" className="w-full border rounded-lg p-2 mt-1" value={end} onChange={event => setEnd(event.target.value)} /></label></div>
    <SocialMetricBars name={business.name} accounts={[...accounts, ...(google ? [google] : [])]} metric={metric} start={start} end={end} timezone={business.timezone} />
    {!search && <p className="text-xs text-slate-500">Para medir Google, conectá Search Console e importá una propiedad de este negocio en Búsquedas. Una cuenta conectada sin importación no aporta cifras a este gráfico.</p>}
    <section id="social-profile-editor" ref={profileSection} tabIndex={-1} aria-labelledby="social-profile-heading" className="vai-panel scroll-mt-44 p-6 rounded-2xl space-y-4"><h2 id="social-profile-heading" className="font-heading text-xl font-bold">Perfil y métricas · {networkNames[network]}</h2>
      {loadError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">No se puede guardar el perfil mientras falle la carga de Redes. {loadError}<button type="button" onClick={() => setRevision(value => value + 1)} className="underline ml-2">Reintentar carga</button></p>}<p className="text-xs text-slate-500">La URL identifica el perfil; no obtiene estadísticas por sí sola. Vacío significa sin medición, y 0 significa un cero observado.</p>
      <fieldset disabled={!canEdit || loading || Boolean(loadError) || busy} className="space-y-4 disabled:opacity-60">
        <div className="grid sm:grid-cols-3 gap-3"><label className="text-sm">Red<select value={network} onChange={event => setNetwork(event.target.value as SocialNetwork)} className="w-full border p-2 rounded-lg mt-1">{socialNetworks.filter(name => name !== 'google').map(name => <option key={name} value={name}>{networkNames[name]}</option>)}</select></label><label className="text-sm sm:col-span-2">URL del perfil oficial<input ref={profileInput} type="url" value={profile} onChange={event => setProfile(event.target.value)} className="w-full border p-2 rounded-lg mt-1" placeholder={`https://www.${network}.com/tu-perfil`} /></label></div>
        <label className="text-sm block">Identificador de cuenta para API (opcional al registrar perfil)<input value={accountId} onChange={event => setAccountId(event.target.value)} maxLength={128} className="w-full border p-2 rounded-lg mt-1" /></label>
        <button type="button" onClick={() => void save('profile')} className="vai-button vai-button-secondary">Guardar perfil</button>
        <details className="border rounded-xl p-4"><summary className="cursor-pointer font-semibold">Cargar medición manual con evidencia</summary><p className="text-xs text-slate-500 mt-3">Transcribí datos de la cuenta o de su informe exportado. No se presentan como una consulta automática. Las métricas acumuladas no son el resultado del período.</p><div className="grid sm:grid-cols-2 gap-3 mt-4">{Object.entries(metricDefinitions).filter(([, definition]) => (definition.networks as readonly string[]).includes(network)).map(([key, definition]) => <label key={key} className="text-xs">{definition.label}<input inputMode="numeric" value={values[key as SocialMetric] || ''} onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))} placeholder="Sin medición" className="w-full border rounded-lg p-2 mt-1" /></label>)}</div><label className="text-xs block mt-4">Fecha observada<input type="date" value={capturedAt} onChange={event => setCapturedAt(event.target.value)} className="border rounded-lg p-2 ml-2" /></label><label className="text-xs block mt-4">Evidencia / nombre del informe y procedencia<textarea value={evidence} onChange={event => setEvidence(event.target.value)} maxLength={2000} className="w-full border rounded-lg p-2 mt-1" placeholder="Ej.: exportación de Meta Business Suite del cliente, período indicado" /></label><p className="text-xs text-slate-500 my-3">Para alcance, visualizaciones e interacciones se usa el período elegido arriba.</p><button type="button" onClick={() => void save('manual')} className="vai-button vai-button-primary">Guardar medición manual</button></details>
        <details className="border rounded-xl p-4"><summary className="cursor-pointer font-semibold">Consultar API oficial · acceso autorizado</summary><p className="text-xs text-slate-500 mt-3">Requiere un token autorizado de la cuenta y sus permisos. Confirmá que el identificador pertenece al perfil que registraste. Facebook: página administrada. Instagram: cuenta profesional mediante Meta/Facebook Login. TikTok: Display API con user.info.basic y user.info.stats. El acceso con un clic mediante OAuth no está habilitado en este módulo.</p><p className="text-xs text-slate-500 mt-2">Se consultan seguidores y, cuando corresponda, publicaciones y Me gusta acumulados de TikTok. Alcance, visualizaciones e interacciones se cargan con evidencia. Meta requiere META_GRAPH_API_VERSION en el servidor.</p><label className="text-xs block mt-4">Token autorizado (solo para esta consulta)<input type="password" autoComplete="off" value={token} onChange={event => setToken(event.target.value)} className="w-full border rounded-lg p-2 mt-1" /></label><p className="text-xs text-slate-500 my-3">El token se envía al servidor para consultar al proveedor; no se guarda en la ficha ni en el historial y se borra de este campo al terminar.</p><button type="button" onClick={() => void save('api')} className="vai-button vai-button-primary">Consultar y guardar métricas oficiales</button></details>
      </fieldset>
      {!canEdit && <p className="text-xs">Acceso de lectura: solo el propietario puede registrar datos de redes.</p>}
      {busy && <p role="status">Comprobando y guardando…</p>}{message && <p role="status" className="text-emerald-800">{message}</p>}{error && <p role="alert" className="text-red-800 whitespace-pre-wrap">{error}</p>}
    </section>
    <section className="vai-panel p-6 rounded-2xl"><h2 className="font-heading text-xl font-bold">Últimas mediciones guardadas</h2>{!history.length ? <p className="text-sm mt-3 text-slate-500">Todavía no hay mediciones sociales guardadas para este negocio.</p> : <div className="overflow-x-auto mt-4"><table className="w-full text-xs text-left"><thead><tr><th className="p-2">Red / fecha</th><th className="p-2">Valores</th><th className="p-2">Fuente y evidencia</th></tr></thead><tbody>{history.map(row => <tr key={row.id} className="border-t"><td className="p-2">{networkNames[row.network]}<br />{row.source === 'manual' && /^\d{4}-\d{2}-\d{2}$/.test(row.capturedAt) ? measurementDateLabel(row.capturedAt, business.locale, business.timezone) : measurementTime(row.capturedAt, business.timezone)}{!row.current && <p>Perfil anterior · no se grafica como actual</p>}{row.periodStart && <p>{row.periodStart} a {row.periodEnd}</p>}</td><td className="p-2">{Object.entries(row.metrics).map(([key, value]) => <p key={key}>{metricDefinitions[key as SocialMetric].label}: {value?.toLocaleString('es-AR')}</p>)}</td><td className="p-2 whitespace-pre-wrap">{row.source === 'manual' ? 'Carga manual' : 'API oficial'}<br />{row.evidence}</td></tr>)}</tbody></table></div>}</section>
  </div>;
}
export function SocialNetworksView(props: Props) { return <SocialNetworksForm key={`${props.workspaceId}:${props.business.id}:${props.business.url}`} {...props} />; }
