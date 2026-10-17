/** Isolated, anonymous experiment. No persisted browser profile, login, retries or anti-detection. */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const username = process.argv[2];
if (!/^[a-zA-Z0-9_.]{1,30}$/.test(username || '')) throw new Error('Provide only the Instagram username.');
const expected = `https://www.instagram.com/${username}/`;
const base = { method: 'playwright-anonymous', profileUrl: expected, checkedAt: new Date().toISOString(), authenticated: false };
let browser;
let result;
try {
  const { chromium } = require('playwright-core');
  browser = await chromium.launch({ headless: true, timeout: 15000 });
  const context = await browser.newContext(); // No storageState, userDataDir, cookies or account session.
  const page = await context.newPage();
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    const host = url.hostname;
    // Explicit public destination and static assets only, never localhost or arbitrary outgoing hosts.
    if (url.protocol !== 'https:' || url.username || url.password || url.port ||
        !(host === 'www.instagram.com' || host === 'instagram.com' || host.endsWith('.cdninstagram.com') || host.endsWith('.fbcdn.net'))) return route.abort();
    if (request.isNavigationRequest() && request.frame() === page.mainFrame() &&
        !(host === 'www.instagram.com' || host === 'instagram.com')) return route.abort();
    return route.continue();
  });
  const response = await page.goto(expected, { waitUntil: 'domcontentloaded', timeout: 20000 });
  const status = response?.status();
  if (status && status >= 400) result = { ...base, status: 'unavailable', reason: status === 429 ? 'rate-limited' : 'http-error', httpStatus: status };
  else if (/\/accounts\/login|\/challenge|\/checkpoint/i.test(page.url())) result = { ...base, status: 'unavailable', reason: 'login-or-verification-required' };
  else {
    try { await page.locator('header').first().waitFor({ state: 'visible', timeout: 6000 }); } catch { /* no retry */ }
    const data = await page.evaluate(() => ({ canonical: document.querySelector('meta[property="og:url"]')?.getAttribute('content') || document.querySelector('link[rel="canonical"]')?.getAttribute('href'), text: document.querySelector('header')?.innerText || '', body: (document.body?.innerText || '').slice(0, 1500) }));
    if (/verify (?:that )?you are human|unusual traffic|checking your browser/i.test(data.body)) result = { ...base, status: 'unavailable', reason: 'verification-required' };
    else {
      const canonical = data.canonical && new URL(data.canonical);
      const identity = canonical && ['instagram.com', 'www.instagram.com'].includes(canonical.hostname) && canonical.pathname.replace(/\/$/, '').toLowerCase() === `/${username.toLowerCase()}`;
      const exact = label => {
        const match = data.text.match(new RegExp(`(?<![\\w.,])([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)\\s+${label}\\b`, 'i'));
        const value = match ? Number(match[1].replaceAll(',', '')) : undefined;
        return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
      };
      const followers = identity ? exact('followers') : undefined, totalPosts = identity ? exact('posts') : undefined;
      result = followers !== undefined || totalPosts !== undefined ? { ...base, status: 'measured', metrics: { followers, totalPosts }, posts: [], note: 'Exact visible counters only; no private insights or interaction sample.' } : { ...base, status: 'unavailable', reason: identity ? 'no-visible-exact-counters' : 'identity-not-confirmed' };
    }
  }
} catch (error) {
  result = { ...base, status: 'unavailable', reason: !browser ? 'browser-unavailable' : 'navigation-failed', errorType: error.name || 'Error' };
} finally {
  if (browser) await browser.close();
}
console.log(JSON.stringify(result));
