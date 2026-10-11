import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRealSeoAudit } from '../seoAuditService';

async function auditImages(images: string) {
  const result = await buildRealSeoAudit('https://example.com', {
    fetchPage: async (url) => ({ finalUrl: url, response: new Response(`<html><body>${images}</body></html>`, { headers: { 'content-type': 'text/html' } }) }),
    fetchPageSpeed: async () => { throw new Error('Not part of this fixture'); },
  });
  return result.items.find((item) => item.key === 'image-alt')!;
}

test('decorative empty ALT is present and does not trigger a missing-ALT finding', async () => {
  for (const markup of [
    '<img src="background.jpg" alt="" aria-hidden="true">',
    "<IMG SRC='background.jpg' ALT='' ROLE='presentation'>",
    '<img src=background.jpg role=none alt="">',
    '<img src="background.jpg" alt aria-hidden="true">',
  ]) {
    const item = await auditImages(markup);
    assert.equal(item.status, 'ok');
    assert.match(item.detectedData!, /0 sin atributo ALT/);
    assert.match(item.detectedData!, /1 con ALT vacío y marca decorativa/);
    assert.match(item.proposedChange!, /Conservar alt=""/);
  }
});

test('missing attribute and empty ALT needing context are reported separately', async () => {
  const item = await auditImages('<img src="info.jpg"><img src="decoration.jpg" alt=""><img src="court.jpg" alt="Cancha de voleibol"><img src="bg.jpg" alt="" aria-hidden="true">');
  assert.equal(item.status, 'warning');
  assert.match(item.detectedData!, /1 sin atributo ALT/);
  assert.match(item.detectedData!, /1 con ALT descriptivo/);
  assert.match(item.detectedData!, /1 con ALT vacío y marca decorativa/);
  assert.match(item.detectedData!, /1 con ALT vacío para revisar/);
  const empty = await auditImages('<img src="image.jpg" alt="">');
  assert.equal(empty.statusLabel, 'Revisar contexto');
  assert.match(empty.simpleExplanation, /No se confirma un error/);
  assert.match(empty.detectedData!, /0 sin atributo ALT/);
});

test('ALT inside a different attribute does not count as an ALT attribute', async () => {
  const item = await auditImages('<img src="info.jpg" data-alt="description"><img src="other.jpg" title="alt=description">');
  assert.equal(item.status, 'warning');
  assert.match(item.detectedData!, /2 sin atributo ALT/);
});

test('no initial HTML images does not assert that the rendered page has no images', async () => {
  const item = await auditImages('<div id="root"></div>');
  assert.equal(item.status, 'ok');
  assert.match(item.simpleExplanation, /podrían existir en la página renderizada/);
});
