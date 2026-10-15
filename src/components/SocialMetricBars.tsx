import React from 'react';
import { latestSocialMetric, metricDefinitions, networkNames, socialNetworks, type SocialAccount, type SocialMetric } from '../../shared/socialMetrics';
import { measurementDateLabel } from '../../shared/reportEvidence';
import { measurementTime } from '../../shared/measurementTime';
export function SocialMetricBars({ name, accounts, metric, start, end, timezone }: { name: string; accounts: SocialAccount[]; metric: SocialMetric; start: string; end: string; timezone?: string }) {
  const rows = socialNetworks.map(network => ({ network, applicable: (metricDefinitions[metric].networks as readonly string[]).includes(network), result: latestSocialMetric(accounts.find(account => account.network === network), metric, start, end) }));
  const max = Math.max(1, ...rows.map(row => row.result?.value ?? 0));
  return <section aria-label={`Gráfico de ${metricDefinitions[metric].label}`} className="vai-panel p-5 sm:p-7 rounded-2xl space-y-5">
    <div><h2 className="font-heading text-xl font-bold">{name} · {metricDefinitions[metric].label}</h2><p className="text-xs text-slate-500 mt-1">{metricDefinitions[metric].period ? `${start} a ${end}. Solo se muestran registros del mismo período.` : 'Última medición disponible de cada perfil; consultá la fecha junto a cada barra.'}</p></div>
    <div className="space-y-5">{rows.map(({ network, applicable, result }) => <div key={network}>
      <div className="flex items-center justify-between gap-3 text-sm mb-2"><strong>{networkNames[network]}</strong><span>{!applicable ? 'No aplica a esta métrica' : result ? result.value.toLocaleString('es-AR') : 'Sin medición'}</span></div>
      {applicable && result && <><div aria-hidden="true" className="h-5 bg-slate-100 rounded-md overflow-hidden"><div className="h-full bg-emerald-700 rounded-md" style={{ width: `${result.value / max * 100}%` }} /></div><p className="text-xs text-slate-500 mt-1">{result.measurement.source === 'manual' ? 'Carga manual con evidencia' : result.measurement.source === 'official-api' ? 'Consulta a API oficial' : 'Google Search Console'} · {result.measurement.source === 'manual' && /^\d{4}-\d{2}-\d{2}$/.test(result.measurement.capturedAt) ? measurementDateLabel(result.measurement.capturedAt) : measurementTime(result.measurement.capturedAt, timezone)}</p></>}
    </div>)}</div>
    <p className="text-xs text-slate-500">No es una puntuación de visibilidad ni una estimación de ventas. Las definiciones de las plataformas pueden diferir; no se suman entre redes.</p>
  </section>;
}
