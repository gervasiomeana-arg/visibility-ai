type OAuthPopup = Pick<Window, 'location' | 'opener' | 'closed' | 'close'>;
export interface OAuthBrowser {
  self: unknown;
  top: unknown;
  location: { href: string };
  open(url: string, target: string): OAuthPopup | null;
}

// Reserve the tab within the click event, before fetching the authorization URL.
export async function beginOAuthNavigation(browser: OAuthBrowser, loadAuthUrl: () => Promise<string | undefined>): Promise<'new-tab' | 'redirect'> {
  const embedded = browser.self !== browser.top;
  const popup = embedded ? browser.open('about:blank', '_blank') : null;
  if (embedded && !popup) {
    throw new Error('Permití las pestañas emergentes o abrí la app en una pestaña independiente y volvé a conectar.');
  }
  try {
    if (popup) popup.opener = null;
    const value = await loadAuthUrl();
    if (!value) throw new Error('Search Console no devolvió una URL de autorización.');
    const url = new URL(value);
    if (url.origin !== 'https://accounts.google.com' || url.pathname !== '/o/oauth2/v2/auth' || url.username || url.password) {
      throw new Error('La URL de autorización de Google no es válida.');
    }
    if (popup) {
      if (popup.closed) throw new Error('La pestaña de conexión se cerró. Volvé a pulsar Conectar Google Search Console.');
      popup.location.href = url.href;
      return 'new-tab';
    }
    browser.location.href = url.href;
    return 'redirect';
  } catch (error) {
    if (popup && !popup.closed) popup.close();
    throw error;
  }
}
