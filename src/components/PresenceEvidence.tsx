import React from 'react';
import {presencePlatforms,type PresenceObservation} from '../../shared/presenceAnalysis';
import {researchWidgetDocument} from '../../shared/competitorResearch';
const resultNames={found:'Presencia observada por el operador','not-observed':'No observada en esta consulta',unreviewed:'Respuesta con fuentes · pendiente de revisión'};
export function PresenceEvidence({rows}:{rows:PresenceObservation[]}) {
 return <div className="space-y-4">{rows.map(r=><section key={r.id} data-pdf-block className="vai-panel rounded-xl p-5 text-sm space-y-3">
  <h3 className="font-semibold">{presencePlatforms[r.platform]} · {resultNames[r.result]}</h3>
  <p>Consulta: {r.query} · {r.market} · {r.language} · {r.device} · {r.observedAt}</p>
  <p>Fuente: {r.method==='manual'?'Comprobación manual aportada por el operador':`API Gemini (${r.model}); no equivale a la interfaz de Gemini ni a otros asistentes`}{r.position!==undefined?` · Posición orgánica observada: ${r.position}`:''}</p>
  <p className="whitespace-pre-wrap">{r.excerpt}</p><p><a href={r.evidenceUrl} target="_blank" rel="noopener noreferrer" className="underline break-all">Referencia de consulta: {r.evidenceUrl} · puede cambiar al abrirla</a></p>
  {!!r.sources?.length&&<ul className="space-y-1">{r.sources.map(s=><li key={s.url}><p><a className="underline break-all" href={s.url} target="_blank" rel="noopener noreferrer">{s.title} · {s.url}</a></p></li>)}</ul>}
  {!!r.queries?.length&&<p>Consultas realizadas por la herramienta: {r.queries.join(' · ')}</p>}
  {r.suggestionsHtml&&<iframe className="no-print w-full h-40 border-0" title="Referencias de Google Search" sandbox="allow-popups" referrerPolicy="no-referrer" srcDoc={researchWidgetDocument(r.suggestionsHtml)}/>}
  {r.recommendation&&<p><strong>Propuesta:</strong> {r.recommendation}</p>}
 </section>)}</div>;
}
