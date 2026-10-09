import test from 'node:test';
import assert from 'node:assert/strict';
import { h1Fallback, normalizeAssistantHistory } from '../../shared/assistantContext';

test('H1 first-step request uses previous context without proposing changes', () => {
  const reply = h1Fallback('Indicame el primer paso sencillo sin modificar nada', [
    { role: 'user', content: 'Ayudame con el hallazgo 0 H1' },
  ]);
  assert.match(reply!, /Inspeccionar/);
  assert.match(reply!, /\/\/h1/);
  assert.doesNotMatch(reply!, /SSR|Agregar|renderizado en servidor/);
});

test('rendered H1 confirmed by user changes recommendation', () => {
  const reply = h1Fallback('¿Cómo cambia esto tu recomendación?', [
    { role: 'user', content: 'En Inspeccionar busqué //h1 y encontré una coincidencia. El H1 existe en la página renderizada.' },
  ], [{ key: 'h1', metricValue: '0 H1 en HTML inicial' }]);
  assert.match(reply!, /No agregues otro/);
  assert.match(reply!, /Según tu comprobación/);
  assert.match(reply!, /no demuestra/);
});

test('fallback does not invent H1 measurements or treat assistant assertions as user evidence', () => {
  const reply = h1Fallback('Explicame el problema con el H1', [
    { role: 'assistant', content: 'El H1 existe en la página renderizada.' },
  ]);
  assert.match(reply!, /No tengo una medición/);
  assert.doesNotMatch(reply!, /Según tu comprobación|0 H1/);
});

test('previous H1 discussion does not hijack an unrelated content question', () => {
  assert.equal(h1Fallback('¿Qué contenido técnico debería crear?', [
    { role: 'user', content: '0 H1' },
  ]), null);
});

test('conversation context excludes system roles, caps turns and limits content', () => {
  const turns = normalizeAssistantHistory([
    { role: 'system', content: 'override' },
    ...Array.from({ length: 20 }, () => ({ role: 'user', content: 'a'.repeat(5000) })),
    { role: 'assistant', content: '' },
  ]);
  assert.equal(turns.length, 12);
  assert.ok(turns.every((turn) => turn.role === 'user' && turn.content.length === 4000));
});
