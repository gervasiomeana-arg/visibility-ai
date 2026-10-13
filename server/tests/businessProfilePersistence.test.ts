import test from 'node:test';
import assert from 'node:assert/strict';
import { persistBusinessProfile } from '../../shared/businessProfilePersistence';
import { getMarket, MARKET_CONFIGS } from '../../src/config/markets';
import { storageService } from '../../src/services/storageService';
import type { Business } from '../../src/types';
const business = { id: 'neomed', workspaceId: 'agency', name: 'Neomed', url: 'https://www.neomed.com.uy/', category: 'Tecnología médica', city: 'Montevideo', description: 'Descripción confirmada', ...getMarket('UY') } as Business;
test('Uruguay is selectable and profiles preserve its locale and timezone', () => {
  assert.equal(MARKET_CONFIGS.some(m => m.countryCode === 'UY'), true);
  assert.equal(getMarket('UY').country, 'Uruguay');
  assert.equal(getMarket('UY').locale, 'es-UY');
  assert.equal(getMarket('UY').timezone, 'America/Montevideo');
});
test('profile persistence maps confirmed fields and applies both business and workspace filters', async () => {
  await persistBusinessProfile('agency', business, async (fields, workspace, id) => {
    assert.equal(workspace, 'agency');assert.equal(id, 'neomed');
    assert.equal(fields.country_code, 'UY');assert.equal(fields.description, business.description);
    assert.equal(fields.locale, 'es-UY');assert.equal(fields.timezone, 'America/Montevideo');
    assert.equal('scores' in fields, false);assert.equal('workspace_id' in fields, false);
    return { error: null, data: { id } };
  });
});
test('no returned row, remote errors and another workspace cannot be reported as saved', async () => {
  await assert.rejects(persistBusinessProfile('agency', business, async () => ({ error: null, data: null })), /No se confirmó/);
  await assert.rejects(persistBusinessProfile('agency', business, async () => ({ error: new Error('RLS denied'), data: null })), /RLS denied/);
  let writes = 0;
  await assert.rejects(persistBusinessProfile('other', business, async () => { writes++;return { error: null, data: business }; }), /no corresponde/);
  assert.equal(writes, 0);
});
test('clearing a confirmed description persists null instead of silently retaining old cloud text', async () => {
  await persistBusinessProfile('agency', { ...business, description: undefined }, async fields => {
    assert.equal(fields.description, null);return { error: null, data: { id: business.id } };
  });
});
test('blocked browser storage cannot confirm profile changes and other businesses stay intact', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map<string, string>();let blocked = false;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { if (blocked) throw new Error('blocked'); values.set(key, value); } } });
  const scope = storageService.getScope();storageService.setScope('profile-test:agency');
  values.set('visibility_ai_businesses:profile-test:agency', JSON.stringify([business, { ...business, id: 'other' }]));
  try {
    assert.equal(storageService.updateBusinessProfile('neomed', { city: '' })?.city, '');
    assert.equal(storageService.getBusinesses().find(b => b.id === 'other')?.city, 'Montevideo');
    blocked = true;
    assert.equal(storageService.updateBusinessProfile('neomed', { name: 'Unsaved' }), null);
    assert.equal(storageService.getBusinesses().find(b => b.id === 'neomed')?.name, 'Neomed');
  } finally { storageService.setScope(scope);if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);else delete (globalThis as any).localStorage; }
});
