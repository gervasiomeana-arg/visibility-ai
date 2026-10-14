import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ClientReportDelivery } from '../../src/components/ClientReportDelivery';
import type { ClientReport } from '../../shared/clientLedger';

test('delivery status keeps a manual record visible with an explicit correction action', () => {
  const report = { id: 'r', sentAt: '2026-10-14T20:00:00Z', channel: 'WhatsApp' } as ClientReport;
  const html = renderToStaticMarkup(React.createElement(ClientReportDelivery, { report, busy: false, dateTime: value => value, onCorrect: () => { throw Error('No automatic correction'); } }));
  assert.match(html,/Envío registrado manualmente/); assert.match(html,/Corregir un envío marcado por error/);
  assert.match(html,/Volver a pendiente y guardar corrección/); assert.match(html,/conservarán el PDF/);
});

test('corrected pending reports retain the prior record and render correction text as inert content', () => {
  const report = { id: 'r', deliveryCorrections: [{ previousSentAt: '2026-10-14T20:00:00Z', previousChannel: 'WhatsApp', correctedAt: '2026-10-14T21:00:00Z', reason: '<script>alert(1)</script>' }] } as ClientReport;
  const html = renderToStaticMarkup(React.createElement(ClientReportDelivery, { report, busy: false, dateTime: value => value, onCorrect: () => {} }));
  assert.match(html,/Preparado · envío pendiente/); assert.match(html,/Historial de correcciones/);
  assert.match(html,/WhatsApp/); assert.match(html,/&lt;script&gt;/); assert.doesNotMatch(html,/<script>/);
  assert.doesNotMatch(html,/Volver a pendiente y guardar corrección/);
});
