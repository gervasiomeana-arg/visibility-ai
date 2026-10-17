import React from 'react';
import type { MonthlyPoint } from '../../shared/socialMonthly';
const format = (n: number) => n.toLocaleString('es-AR');
export function MonthlyChart({ title, points }: { title: string; points: MonthlyPoint[] }) {
  const max = Math.max(1, ...points.map(p => p.value ?? 0));
  return <section className="vai-panel rounded-2xl p-5 min-w-0">
    <h3 className="font-heading text-lg font-bold">{title}</h3>
    <div className="overflow-x-auto mt-5"><div className="flex items-end gap-3" style={{ minWidth: Math.max(260, points.length * 94) }}>
      {points.map(p => <div key={p.month} className="flex-1 text-center text-xs" title={p.value === null ? 'Sin datos verificados' : `${p.source} · ${p.capturedAt} · ${p.evidence}`}>
        <div className="h-40 flex flex-col justify-end items-center">
          <span className="mb-2 text-slate-600">{p.value === null ? 'Sin datos' : format(p.value)}</span>
          {p.value !== null && <div aria-hidden="true" className="w-9 bg-emerald-700 rounded-t-md" style={{ height: Math.max(p.value === 0 ? 2 : 5, p.value / max * 124) }} />}
        </div>
        <p className="mt-3 font-medium">{new Date(`${p.month}-01T12:00:00Z`).toLocaleDateString('es-AR', { month: 'short', year: '2-digit', timeZone: 'UTC' })}</p>
      </div>)}
    </div></div>
    <details className="mt-5 text-xs text-slate-600"><summary className="cursor-pointer">Ver datos y fuentes</summary>
      <table className="w-full mt-3 text-left"><thead><tr><th>Mes</th><th>Valor</th><th>Fuente y fecha</th></tr></thead><tbody>{points.map(p => <tr key={p.month}><td className="py-2">{p.month}</td><td>{p.value === null ? 'Sin datos verificados' : format(p.value)}</td><td>{p.source && <>{p.source} · {p.capturedAt}<p className="break-words">{p.evidence}</p></>}</td></tr>)}</tbody></table>
    </details>
  </section>;
}
