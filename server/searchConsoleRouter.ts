import crypto from 'crypto';
import express from 'express';
import {
  durableSearchConsoleConfigured,
  getSearchConsoleRedirectUri,
  getSearchConsoleTokenKey,
  getSupabaseConfig,
  searchConsoleConfigured,
} from './runtimeConfig';
import {
  bearerToken,
  getSupabaseUserFromToken,
  requireSupabaseAuth,
} from './supabaseAuth';
import { recordUsageEventSafe } from './usageTelemetry';

type SearchConsoleSession = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
};

type PendingOAuthState = {
  createdAt: number;
  returnTo: string;
  userId?: string;
  supabaseAccessToken?: string;
};

type DurableOAuthState = {
  createdAt: number;
  returnTo: string;
  userId: string;
  supabaseAccessToken: string;
  nonce: string;
};

const router = express.Router();
const searchConsoleSessions = new Map<string, SearchConsoleSession>();
const searchConsoleStates = new Map<string, PendingOAuthState>();

function encryptToken(value: string): string {
  const key = getSearchConsoleTokenKey();
  if (!key) throw new Error('Search Console token encryption is not configured');

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv, tag, encrypted].map((part) => part.toString('base64url')).join('.');
}

function decryptToken(value: string): string {
  const key = getSearchConsoleTokenKey();
  if (!key) throw new Error('Search Console token encryption is not configured');

  const [ivPart, tagPart, dataPart] = value.split('.');
  if (!ivPart || !tagPart || !dataPart) throw new Error('Invalid encrypted token');

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivPart, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

function createDurableOAuthState(
  payload: Omit<DurableOAuthState, 'nonce'>
): string {
  return encryptToken(
    JSON.stringify({
      ...payload,
      nonce: crypto.randomBytes(16).toString('hex'),
    })
  );
}

async function readDurableOAuthState(
  state: string
): Promise<DurableOAuthState | null> {
  try {
    const parsed = JSON.parse(decryptToken(state)) as DurableOAuthState;

    if (
      !parsed ||
      typeof parsed.createdAt !== 'number' ||
      typeof parsed.returnTo !== 'string' ||
      typeof parsed.userId !== 'string' ||
      typeof parsed.supabaseAccessToken !== 'string' ||
      Date.now() - parsed.createdAt > 10 * 60 * 1000
    ) {
      return null;
    }

    if (!parsed.returnTo.startsWith('/') || parsed.returnTo.startsWith('//')) {
      return null;
    }

    const user = await getSupabaseUserFromToken(parsed.supabaseAccessToken);
    if (!user || user.id !== parsed.userId) return null;

    return parsed;
  } catch {
    return null;
  }
}

async function supabaseConnectionRequest(
  accessToken: string,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const config = getSupabaseConfig();
  if (!config.configured) throw new Error('Supabase is not configured');

  const headers = new Headers(init.headers || {});
  headers.set('apikey', config.anonKey);
  headers.set('authorization', `Bearer ${accessToken}`);
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  return fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers,
  });
}

async function saveDurableSearchConsoleSession(
  userId: string,
  supabaseAccessToken: string,
  session: SearchConsoleSession
): Promise<void> {
  const response = await supabaseConnectionRequest(
    supabaseAccessToken,
    'search_console_connections?on_conflict=user_id',
    {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        user_id: userId,
        access_token_ciphertext: encryptToken(session.accessToken),
        refresh_token_ciphertext: session.refreshToken
          ? encryptToken(session.refreshToken)
          : null,
        expires_at: new Date(session.expiresAt).toISOString(),
        updated_at: new Date().toISOString(),
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Could not persist Search Console connection (HTTP ${response.status})`
    );
  }
}

async function loadDurableSearchConsoleSession(
  userId: string,
  supabaseAccessToken: string
): Promise<SearchConsoleSession | null> {
  const response = await supabaseConnectionRequest(
    supabaseAccessToken,
    `search_console_connections?user_id=eq.${encodeURIComponent(
      userId
    )}&select=access_token_ciphertext,refresh_token_ciphertext,expires_at&limit=1`
  );

  if (!response.ok) {
    throw new Error('Could not load Search Console connection');
  }

  const rows: any[] = await response.json();
  const row = rows[0];
  if (!row) return null;

  return {
    accessToken: decryptToken(row.access_token_ciphertext),
    refreshToken: row.refresh_token_ciphertext
      ? decryptToken(row.refresh_token_ciphertext)
      : undefined,
    expiresAt: new Date(row.expires_at).getTime(),
  };
}

async function deleteDurableSearchConsoleSession(
  userId: string,
  supabaseAccessToken: string
): Promise<void> {
  const response = await supabaseConnectionRequest(
    supabaseAccessToken,
    `search_console_connections?user_id=eq.${encodeURIComponent(userId)}`,
    { method: 'DELETE' }
  );

  if (!response.ok) {
    throw new Error('Could not delete Search Console connection');
  }
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};

  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const index = part.indexOf('=');
    if (index === -1) return acc;

    const key = part.slice(0, index).trim();
    const value = decodeURIComponent(part.slice(index + 1).trim());
    acc[key] = value;
    return acc;
  }, {});
}

function setSearchConsoleSessionCookie(
  res: express.Response,
  sessionId: string
) {
  const appUrl = process.env.APP_URL || '';
  const secure = appUrl.startsWith('https://') ? '; Secure' : '';

  res.setHeader(
    'Set-Cookie',
    `visibility_gsc_session=${encodeURIComponent(
      sessionId
    )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`
  );
}

async function refreshSearchConsoleToken(
  session: SearchConsoleSession
): Promise<SearchConsoleSession> {
  if (session.expiresAt > Date.now() + 60_000) return session;
  if (!session.refreshToken) {
    throw new Error('Search Console session expired');
  }

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
    refresh_token: session.refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!response.ok) {
    throw new Error('Could not refresh Search Console access');
  }

  const data: any = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: session.refreshToken,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000,
  };
}

async function getSearchConsoleSession(
  req: express.Request
): Promise<{
  id: string;
  session: SearchConsoleSession;
  userId?: string;
  supabaseAccessToken?: string;
} | null> {
  const authToken = bearerToken(req);

  if (durableSearchConsoleConfigured() && authToken) {
    const user = await getSupabaseUserFromToken(authToken);
    if (!user) return null;

    try {
      const existing = await loadDurableSearchConsoleSession(
        user.id,
        authToken
      );
      if (!existing) return null;

      const refreshed = await refreshSearchConsoleToken(existing);
      if (
        refreshed.accessToken !== existing.accessToken ||
        refreshed.expiresAt !== existing.expiresAt
      ) {
        await saveDurableSearchConsoleSession(
          user.id,
          authToken,
          refreshed
        );
      }

      return {
        id: user.id,
        session: refreshed,
        userId: user.id,
        supabaseAccessToken: authToken,
      };
    } catch {
      return null;
    }
  }

  const sessionId =
    parseCookies(req.headers.cookie).visibility_gsc_session;
  if (!sessionId) return null;

  const existing = searchConsoleSessions.get(sessionId);
  if (!existing) return null;

  try {
    const refreshed = await refreshSearchConsoleToken(existing);
    if (refreshed !== existing) {
      searchConsoleSessions.set(sessionId, refreshed);
    }

    return { id: sessionId, session: refreshed };
  } catch {
    searchConsoleSessions.delete(sessionId);
    return null;
  }
}

router.get('/status', requireSupabaseAuth, async (req, res) => {
  const active = await getSearchConsoleSession(req);

  return res.json({
    configured: searchConsoleConfigured(),
    connected: Boolean(active),
    persistence: durableSearchConsoleConfigured()
      ? 'supabase-encrypted'
      : 'session',
  });
});

router.post('/auth/start', requireSupabaseAuth, async (req, res) => {
  try {
    if (!searchConsoleConfigured()) {
      return res.status(503).json({
        error: 'Google Search Console OAuth is not configured',
        required: [
          'GOOGLE_CLIENT_ID',
          'GOOGLE_CLIENT_SECRET',
          'APP_URL',
        ],
      });
    }

    let userId: string | undefined;
    let supabaseAccessToken: string | undefined;

    if (durableSearchConsoleConfigured()) {
      const authToken = bearerToken(req);
      if (!authToken) {
        return res
          .status(401)
          .json({ error: 'Supabase authentication is required' });
      }

      const user = await getSupabaseUserFromToken(authToken);
      if (!user) {
        return res
          .status(401)
          .json({ error: 'Invalid Supabase session' });
      }

      userId = user.id;
      supabaseAccessToken = authToken;
    }

    const returnToRaw =
      typeof req.body?.returnTo === 'string' ? req.body.returnTo : '/';
    const returnTo =
      returnToRaw.startsWith('/') && !returnToRaw.startsWith('//')
        ? returnToRaw
        : '/';

    let state: string;

    if (
      durableSearchConsoleConfigured() &&
      userId &&
      supabaseAccessToken
    ) {
      state = createDurableOAuthState({
        createdAt: Date.now(),
        returnTo,
        userId,
        supabaseAccessToken,
      });
    } else {
      state = crypto.randomBytes(24).toString('hex');
      searchConsoleStates.set(state, {
        createdAt: Date.now(),
        returnTo,
      });
    }

    const authUrl = new URL(
      'https://accounts.google.com/o/oauth2/v2/auth'
    );
    authUrl.searchParams.set(
      'client_id',
      process.env.GOOGLE_CLIENT_ID || ''
    );
    authUrl.searchParams.set(
      'redirect_uri',
      getSearchConsoleRedirectUri()
    );
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set(
      'scope',
      'https://www.googleapis.com/auth/webmasters.readonly'
    );
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    return res.json({ authUrl: authUrl.toString() });
  } catch (error: any) {
    return res.status(500).json({
      error:
        error.message ||
        'Could not start Search Console OAuth',
    });
  }
});

router.get('/oauth/callback', async (req, res) => {
  const code =
    typeof req.query.code === 'string' ? req.query.code : '';
  const state =
    typeof req.query.state === 'string' ? req.query.state : '';

  let pending: PendingOAuthState | undefined;

  if (durableSearchConsoleConfigured() && state) {
    const durableState = await readDurableOAuthState(state);
    if (durableState) pending = durableState;
  } else if (state) {
    pending = searchConsoleStates.get(state);
    if (pending) searchConsoleStates.delete(state);
  }

  if (
    !code ||
    !pending ||
    Date.now() - pending.createdAt > 10 * 60 * 1000
  ) {
    return res
      .status(400)
      .send(
        'Search Console authorization could not be validated.'
      );
  }

  try {
    const params = new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: getSearchConsoleRedirectUri(),
      grant_type: 'authorization_code',
    });

    const tokenResponse = await fetch(
      'https://oauth2.googleapis.com/token',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: params,
      }
    );

    if (!tokenResponse.ok) {
      throw new Error('Google token exchange failed');
    }

    const tokenData: any = await tokenResponse.json();
    let refreshToken: string | undefined =
      tokenData.refresh_token;

    if (
      durableSearchConsoleConfigured() &&
      pending.userId &&
      pending.supabaseAccessToken &&
      !refreshToken
    ) {
      try {
        const previousSession =
          await loadDurableSearchConsoleSession(
            pending.userId,
            pending.supabaseAccessToken
          );
        refreshToken = previousSession?.refreshToken;
      } catch {
        // Previous connection is optional.
      }
    }

    const session: SearchConsoleSession = {
      accessToken: tokenData.access_token,
      refreshToken,
      expiresAt:
        Date.now() +
        Number(tokenData.expires_in || 3600) * 1000,
    };

    if (
      durableSearchConsoleConfigured() &&
      pending.userId &&
      pending.supabaseAccessToken
    ) {
      await saveDurableSearchConsoleSession(
        pending.userId,
        pending.supabaseAccessToken,
        session
      );
    } else {
      const sessionId =
        crypto.randomBytes(24).toString('hex');
      searchConsoleSessions.set(sessionId, session);
      setSearchConsoleSessionCookie(res, sessionId);
    }

    const target = new URL(
      pending.returnTo,
      process.env.APP_URL
    ).toString();

    return res.redirect(target);
  } catch (error: any) {
    console.error(
      'Search Console OAuth callback failed:',
      error
    );
    return res
      .status(502)
      .send('Could not connect Google Search Console.');
  }
});

router.post('/disconnect', requireSupabaseAuth, async (req, res) => {
  const authToken = bearerToken(req);

  if (durableSearchConsoleConfigured() && authToken) {
    const user = await getSupabaseUserFromToken(authToken);
    if (!user) {
      return res
        .status(401)
        .json({ error: 'Invalid Supabase session' });
    }

    try {
      await deleteDurableSearchConsoleSession(
        user.id,
        authToken
      );
    } catch (error: any) {
      return res.status(502).json({
        error:
          error.message ||
          'Could not disconnect Search Console',
      });
    }
  } else {
    const cookies = parseCookies(req.headers.cookie);
    if (cookies.visibility_gsc_session) {
      searchConsoleSessions.delete(
        cookies.visibility_gsc_session
      );
    }
  }

  const appUrl = process.env.APP_URL || '';
  const secure = appUrl.startsWith('https://')
    ? '; Secure'
    : '';

  res.setHeader(
    'Set-Cookie',
    `visibility_gsc_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
  );

  return res.json({ connected: false });
});

router.get('/sites', requireSupabaseAuth, async (req, res) => {
  try {
    const active = await getSearchConsoleSession(req);
    if (!active) {
      return res
        .status(401)
        .json({ error: 'Search Console is not connected' });
    }

    const response = await fetch(
      'https://www.googleapis.com/webmasters/v3/sites',
      {
        headers: {
          authorization: `Bearer ${active.session.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Search Console sites returned HTTP ${response.status}`
      );
    }

    const data: any = await response.json();
    const sites = Array.isArray(data.siteEntry)
      ? data.siteEntry.map((site: any) => ({
          siteUrl: site.siteUrl,
          permissionLevel: site.permissionLevel,
        }))
      : [];

    return res.json({ sites });
  } catch (error: any) {
    return res.status(502).json({
      error:
        error.message ||
        'Could not load Search Console sites',
    });
  }
});

router.post('/query', requireSupabaseAuth, async (req, res) => {
  try {
    const active = await getSearchConsoleSession(req);
    if (!active) {
      return res
        .status(401)
        .json({ error: 'Search Console is not connected' });
    }

    const {
      siteUrl,
      startDate,
      endDate,
      rowLimit,
      workspaceId,
      businessId,
    } = req.body;
    if (!siteUrl || typeof siteUrl !== 'string') {
      return res
        .status(400)
        .json({ error: 'siteUrl is required' });
    }

    const safeStart =
      typeof startDate === 'string' ? startDate : '';
    const safeEnd =
      typeof endDate === 'string' ? endDate : '';

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(safeStart) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(safeEnd)
    ) {
      return res.status(400).json({
        error: 'Valid startDate and endDate are required',
      });
    }

    const limit = Math.min(
      Math.max(Number(rowLimit) || 100, 1),
      500
    );

    const endpoint =
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
        siteUrl
      )}/searchAnalytics/query`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${active.session.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        startDate: safeStart,
        endDate: safeEnd,
        dimensions: ['query'],
        rowLimit: limit,
        dataState: 'final',
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(
        `Search Console query returned HTTP ${response.status}: ${details.slice(
          0,
          300
        )}`
      );
    }

    const data: any = await response.json();
    const rows = Array.isArray(data.rows)
      ? data.rows.map((row: any) => ({
          query: row.keys?.[0] || '',
          clicks: Number(row.clicks || 0),
          impressions: Number(row.impressions || 0),
          ctr: Number(row.ctr || 0),
          position: Number(row.position || 0),
        }))
      : [];

    recordUsageEventSafe(req, {
      workspaceId:
        typeof workspaceId === 'string' ? workspaceId : undefined,
      businessId:
        typeof businessId === 'string' ? businessId : undefined,
      userId: res.locals.authUser?.id,
      eventType: 'search_console_query',
      units: 1,
      metadata: {
        rowsReturned: rows.length,
      },
    });

    return res.json({
      rows,
      startDate: safeStart,
      endDate: safeEnd,
      source: 'google-search-console',
    });
  } catch (error: any) {
    return res.status(502).json({
      error:
        error.message ||
        'Could not query Search Console',
    });
  }
});

export default router;
