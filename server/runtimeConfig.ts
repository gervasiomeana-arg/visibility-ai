export function getSupabaseConfig() {
  const url = process.env.VITE_SUPABASE_URL || '';
  const publishableKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';

  return {
    url,
    publishableKey,
    configured: Boolean(
      url &&
      publishableKey &&
      url !== 'MY_SUPABASE_URL' &&
      publishableKey !== 'MY_SUPABASE_PUBLISHABLE_KEY' &&
      publishableKey !== 'MY_SUPABASE_ANON_KEY'
    ),
  };
}

export function getSearchConsoleTokenKey(): Buffer | null {
  const encoded = process.env.SEARCH_CONSOLE_TOKEN_KEY || '';
  if (!encoded || encoded === 'MY_32_BYTE_BASE64_KEY') return null;

  try {
    const key = Buffer.from(encoded, 'base64');
    return key.length === 32 ? key : null;
  } catch {
    return null;
  }
}

export function durableSearchConsoleConfigured(): boolean {
  return getSupabaseConfig().configured && Boolean(getSearchConsoleTokenKey());
}

export function searchConsoleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.APP_URL
  );
}

export function getSearchConsoleRedirectUri(): string {
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error('APP_URL is not configured');

  return new URL('/api/search-console/oauth/callback', appUrl).toString();
}
