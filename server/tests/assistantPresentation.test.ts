import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AssistantMessage } from '../../src/components/AssistantMessage';
import { measurementTime } from '../../shared/measurementTime';

const render = (content: string) => renderToStaticMarkup(React.createElement(AssistantMessage, { content }));

test('assistant presents measured guidance, numbered steps and literal HTML code readably', () => {
  const html = render('### Dato medido\n**0 H1** en HTML inicial.\n\n1. Revisar `H1` en el navegador.\n2. No duplicar el encabezado.\n\n```html\n<h1>Open Voley</h1>\n```');
  assert.ok(html.includes('<strong>0 H1</strong>'));
  assert.ok(html.includes('<ol start="1"'));
  assert.ok(html.includes('&lt;h1&gt;Open Voley&lt;/h1&gt;'));
  assert.ok(!html.includes('<h1>Open Voley</h1>'));
  assert.ok(!html.includes('```'));
});

test('assistant treats generated HTML, event attributes and unsafe links as inert text', () => {
  const html = render('<script>alert(1)</script>\n<img src=x onerror=alert(1)>\n[abrir](javascript:alert(1))\n`<iframe src="https://example.com">`');
  for (const element of ['<script', '<img', '<iframe', '<a ']) assert.ok(!html.includes(element));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('javascript:alert(1)'));
});

test('unfinished code fences and Windows newlines preserve the supplied evidence', () => {
  const html = render('**Dato**\r\n```html\r\n<h1>Existe</h1>');
  assert.ok(html.includes('<strong>Dato</strong>'));
  assert.ok(html.includes('&lt;h1&gt;Existe&lt;/h1&gt;'));
});

test('measurement timestamps distinguish evening from morning and name the timezone', () => {
  const label = measurementTime('2026-10-14T00:35:00Z', 'America/Argentina/Buenos_Aires');
  assert.ok(label.includes('13/10/2026'));
  assert.ok(label.includes('21:35'));
  assert.ok(label.includes('(America/Argentina/Buenos_Aires)'));
  assert.ok(measurementTime('2026-10-14T00:35:00Z', 'invalid').includes('00:35 (UTC)'));
  assert.equal(measurementTime('not-a-date'), 'Sin fecha registrada');
});
