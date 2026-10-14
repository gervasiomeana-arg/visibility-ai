import React, { useState } from 'react';
import type { ClientReport } from '../../shared/clientLedger';

export function ClientReportDelivery({ report, busy, dateTime, onCorrect }: {
  report: ClientReport; busy: boolean; dateTime: (value: string) => string; onCorrect: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  return <div className="space-y-2">
    <p className="text-sm">{report.sentAt ? `Envío registrado manualmente · ${report.channel || 'Canal no registrado'} · ${dateTime(report.sentAt)}` : 'Preparado · envío pendiente'}</p>
    {report.sentRecordedAt && <p className="text-xs">Registro realizado: {dateTime(report.sentRecordedAt)}</p>}
    {report.sentAt && <details className="rounded-xl bg-slate-50 p-3 text-sm">
      <summary className="cursor-pointer font-semibold">Corregir un envío marcado por error</summary>
      <p className="text-xs text-slate-600 mt-2">Volverá a pendiente. Se conservarán el PDF y el registro anterior con el motivo de la corrección.</p>
      <form className="mt-3 space-y-2" onSubmit={event => { event.preventDefault(); onCorrect(reason); }}>
        <label className="block text-xs">Motivo de la corrección
          <textarea required minLength={12} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} disabled={busy}
            className="vai-input w-full mt-1" placeholder="Lo marqué como enviado durante una prueba; todavía no envié el PDF." />
        </label>
        <button type="submit" disabled={busy || reason.trim().length < 12} className="vai-button vai-button-secondary">Volver a pendiente y guardar corrección</button>
      </form>
    </details>}
    {!!report.deliveryCorrections?.length && <details className="text-xs text-slate-600">
      <summary className="cursor-pointer">Historial de correcciones ({report.deliveryCorrections.length})</summary>
      {report.deliveryCorrections.map((entry, index) => <div key={`${entry.correctedAt}-${index}`} className="border-l-2 border-slate-200 pl-2 mt-2">
        <p>Corrección registrada: {dateTime(entry.correctedAt)}.</p>
        <p>Registro anterior: {entry.previousChannel || 'Sin canal'} · {dateTime(entry.previousSentAt)}.</p>
        {entry.previousRecordedAt && <p>Cargado originalmente: {dateTime(entry.previousRecordedAt)}.</p>}
        <p>Motivo: {entry.reason}</p>
      </div>)}
    </details>}
  </div>;
}
