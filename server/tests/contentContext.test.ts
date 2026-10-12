import test from 'node:test';
import assert from 'node:assert/strict';
import { buildContentPrompt, validateContentInput, validateContentOutput } from '../../shared/contentContext';
import { storageService } from '../../src/services/storageService';

const request = {
  topicRelation: 'La herramienta ofrece análisis de recepción para entrenadores', contentType: 'seo_meta' as const, topic: 'Análisis de recepción', keyword: 'scouting de voleibol',
  city: '', businessType: 'Software', goal: 'Consultar funciones', tone: 'Profesional',
  businessContext: { name: 'Open Voley', description: 'Scouting y estadísticas para entrenadores', url: 'https://openvoley.com' },
};

test('content accepts a confirmed digital business without imposing a city', () => {
  assert.equal(validateContentInput(request), null);
  assert.match(buildContentPrompt(request), /Scouting y estadísticas para entrenadores/);
  assert.match(buildContentPrompt(request), /no pruebas de servicios o ventajas/);
  assert.match(buildContentPrompt(request), /No inventes prestaciones/);
  assert.match(buildContentPrompt(request), /no inventes recuentos/);
});

test('content rejects blank, malformed, oversized and missing business data', () => {
  for (const changes of [
    { topic: '  ' }, { keyword: [] }, { contentType: 'unknown' },
    { topic: 'a'.repeat(2001) }, { businessContext: null },
    { businessContext: { name: 'Open Voley', description: { services: 'fake' } } },
  ]) assert.ok(validateContentInput({ ...request, ...changes }));
});

test('drafts survive retrieval and remain isolated by business and workspace', () => {
  const values = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } });
  const draft = { request, text: 'Texto revisado', approved: true };
  try {
    storageService.setScope('user-a:workspace-a');
    assert.equal(storageService.saveContentDraft('business-a', draft), true);
    assert.deepEqual(storageService.getContentDraft('business-a'), draft);
    assert.equal(storageService.getContentDraft('business-b'), null);
    storageService.setScope('user-a:workspace-b');
    assert.equal(storageService.getContentDraft('business-a'), null);
    storageService.setScope('user-b:workspace-a');
    assert.equal(storageService.getContentDraft('business-a'), null);
    storageService.setScope('user-a:workspace-a');
    assert.deepEqual(storageService.getContentDraft('business-a'), draft);
    values.set('visibility_content_draft:broken:user-a:workspace-a', '{');
    assert.equal(storageService.getContentDraft('broken'), null);
  } finally {
    storageService.setScope();
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete (globalThis as any).localStorage;
  }
});

test('blocked browser storage reports that the draft was not saved', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage blocked'); } });
  try {
    assert.equal(storageService.saveContentDraft('a', { request, text: 'Draft', approved: false }), false);
    assert.equal(storageService.getContentDraft('a'), null);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete (globalThis as any).localStorage;
  }
});

test('missing business facts and an unconfirmed query relationship stop generation', () => {
  assert.match(validateContentInput({ ...request, businessContext: { ...request.businessContext, name: 'Nuevohorizontehotel', description: '' }, topic: 'hotel balluk', keyword: 'hotel balluk' })!, /descripción confirmada/);
  assert.match(validateContentInput({ ...request, topicRelation: ' ' })!, /relación confirmada/);
  assert.match(buildContentPrompt(request), /no inventes asociaciones/i);
  assert.match(buildContentPrompt(request), /No conviertas el tono/);
});

test('placeholder pages are rejected instead of presented as usable copy', () => {
  assert.match(validateContentOutput('Servicios: [dato por confirmar]')!, /Completá el perfil/);
  assert.ok(validateContentOutput('Ubicación: [ DATOS POR CONFIRMAR ]'));
  assert.equal(validateContentOutput('Open Voley: scouting y estadísticas para entrenadores.'), null);
  assert.match(validateContentOutput('[ACLARACIÓN NECESARIA] ¿Qué servicio confirmado debe describir esta página?')!, /Antes de redactar:.*servicio confirmado/);
});
