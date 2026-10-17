import { publicProfileUrl, type PublicNetwork } from '../shared/socialMetrics';

function entity(value: string) {
  return value.replace(/&(?:amp|quot|apos|lt|gt|nbsp|#\d+|#x[0-9a-f]+);/gi, token => {
    const named: Record<string,string> = { '&amp;':'&', '&quot;':'"', '&apos;':"'", '&lt;':'<', '&gt;':'>', '&nbsp;':' ' };
    const lower = token.toLowerCase(); if (named[lower]) return named[lower];
    const n = lower.startsWith('&#x') ? parseInt(lower.slice(3,-1),16) : Number(lower.slice(2,-1));
    return Number.isInteger(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : token;
  });
}
function attrs(tag: string) {
  const values: Record<string,string> = {};
  for (const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) values[m[1].toLowerCase()] = entity(m[2] ?? m[3] ?? m[4]);
  return values;
}
/** Only exact integers. Never expand K, M, mil or decimal abbreviations. */
export function exactPublicCount(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
  if (typeof value !== 'string') return undefined;
  const text = value.trim().replace(/[\u00a0\u202f]/g,' ');
  if (!/^\d+$/.test(text) && !/^\d{1,3}([,. ])\d{3}(?:\1\d{3})*$/.test(text)) return undefined;
  const n = Number(text.replace(/[,. ]/g,''));
  return Number.isSafeInteger(n) && n >= 0 ? n : undefined;
}
export function publicMetadataCounts(network: PublicNetwork, profileUrl: string, html: string): {followers?: number; totalPosts?: number; method?: string} {
  // Metadata is accepted only from a head identifying this exact profile.
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i)?.[1];
  if (!head) return {};
  const clean = head.replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'');
  const tags = [...clean.matchAll(/<(?:meta|link)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi)].map(m => attrs(m[0]));
  const identities = tags.filter(t => t.property?.toLowerCase() === 'og:url' || t.rel?.toLowerCase().split(/\s+/).includes('canonical')).map(t => t.content || t.href);
  if (!identities.length || identities.some(value => { try { return publicProfileUrl(network,value) !== profileUrl; } catch { return true; } })) return {};
  const descriptions = tags.filter(t => t.property?.toLowerCase() === 'og:description' || t.name?.toLowerCase() === 'description').map(t => t.content || '');
  // Only profile metadata descriptions: no body-wide numbers, competitor cards, comments, or model summaries.
  const extract = (labels: string) => {
    const values = new Set<number>();
    for (const description of descriptions) {
      const re = new RegExp(`(?:^|[;·,]|\\s)([0-9][0-9,. \\u00a0\\u202f]*?)\\s+(?:${labels})(?=$|[\\s,;·])`,'giu');
      for (const m of description.matchAll(re)) { const n = exactPublicCount(m[1]); if (n !== undefined) values.add(n); }
    }
    return values.size === 1 ? [...values][0] : undefined;
  };
  const followers = extract('followers|seguidores|abonnés');
  const totalPosts = network === 'instagram' ? extract('posts|publicaciones|publicações|publications') : undefined;
  return { followers, totalPosts, ...(followers !== undefined || totalPosts !== undefined ? {method:'metadatos públicos del perfil identificado'} : {}) };
}
