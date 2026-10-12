import test from 'node:test';
import assert from 'node:assert/strict';
import { beginOAuthNavigation, type OAuthBrowser } from '../../shared/oauthNavigation';
const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=example&state=opaque';
function fixture(embedded = true, blocked = false) {
  const events: string[] = [];
  const popup = { location: { href: 'about:blank' }, opener: {} as unknown, closed: false, close() { this.closed = true; events.push('close'); } };
  const self = {};
  const browser = { self, top: embedded ? {} : self, location: { href: '/keywords' }, open() { events.push('open'); return blocked ? null : popup; } } as unknown as OAuthBrowser;
  return { browser, popup, events };
}
test('embedded OAuth reserves a detached tab before fetching and leaves the preview in place', async () => {
  const { browser, popup, events } = fixture();
  let release!: (value: string) => void;
  const result = beginOAuthNavigation(browser, () => { events.push('fetch'); return new Promise(resolve => { release = resolve; }); });
  assert.deepEqual(events, ['open', 'fetch']);
  assert.equal(popup.opener, null);
  assert.equal(popup.location.href, 'about:blank');
  release(authUrl);
  assert.equal(await result, 'new-tab');
  assert.equal(popup.location.href, authUrl);
  assert.equal(browser.location.href, '/keywords');
});
test('blocked popup fails before starting an OAuth session', async () => {
  const { browser, events } = fixture(true, true);
  await assert.rejects(beginOAuthNavigation(browser, async () => { events.push('fetch'); return authUrl; }), /pestañas emergentes/);
  assert.deepEqual(events, ['open']);
});
test('request failures close the reserved blank tab', async () => {
  const { browser, popup } = fixture();
  await assert.rejects(beginOAuthNavigation(browser, async () => { throw new Error('Servidor no disponible'); }), /Servidor no disponible/);
  assert.equal(popup.closed, true);
});
test('standalone OAuth redirects without opening a popup', async () => {
  const { browser, events } = fixture(false);
  assert.equal(await beginOAuthNavigation(browser, async () => authUrl), 'redirect');
  assert.deepEqual(events, []);
  assert.equal(browser.location.href, authUrl);
});
test('untrusted or missing authorization URLs never navigate', async () => {
  for (const url of [undefined, 'https://accounts.google.com.evil.example/o/oauth2/v2/auth', 'http://accounts.google.com/o/oauth2/v2/auth', 'https://accounts.google.com/other', 'javascript:alert(1)', 'https://user@accounts.google.com/o/oauth2/v2/auth']) {
    const { browser, popup } = fixture();
    await assert.rejects(beginOAuthNavigation(browser, async () => url));
    assert.equal(browser.location.href, '/keywords');
    assert.equal(popup.location.href, 'about:blank');
    assert.equal(popup.closed, true);
  }
});
test('closing the reserved tab provides a retry instruction', async () => {
  const { browser, popup } = fixture();
  await assert.rejects(beginOAuthNavigation(browser, async () => { popup.closed = true; return authUrl; }), /Volvé a pulsar/);
  assert.equal(popup.location.href, 'about:blank');
});
