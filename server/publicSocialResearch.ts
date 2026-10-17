import crypto from 'node:crypto';
import { fetchPublicProfileHtml } from './seoAuditService';
import { calendarDay, publicProfileUrl, validatePublicSnapshot, type PublicNetwork, type PublicPost, type PublicSnapshot } from '../shared/socialMetrics';

export interface PublicCandidate { network: PublicNetwork; profileUrl: string; foundOn: string }
type PageReader = typeof fetchPublicProfileHtml;
function decode(value: string) { return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'); }
export function discoverSocialLinks(html: string, base: string): PublicCandidate[] {
  const result = new Map<string, PublicCandidate>();
  // Only links and JSON-LD sameAs, not arbitrary model-generated or guessed usernames.
  const links = [...html.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)].map(m => decode(m[1]));
  // Static URL literals used by buttons/configuration are candidates too; scripts are never executed.
  const literals = decode(html).replace(/\\u002f/gi, '/').replace(/\\\//g, '/');
  links.push(...[...literals.matchAll(/["'](https?:\/\/(?:www\.)?(?:instagram\.com|facebook\.com|tiktok\.com)\/[^\s"'<>\\]*)["']/gi)].map(m => m[1]));
  for (const node of jsonNodes(html)) if (node['@type'] === 'Organization' || node['@type'] === 'LocalBusiness' || node['@type'] === 'Person') links.push(...(Array.isArray(node.sameAs) ? node.sameAs : typeof node.sameAs === 'string' ? [node.sameAs] : []).filter((s: unknown) => typeof s === 'string'));
  for (const link of links) for (const network of ['facebook', 'instagram', 'tiktok'] as const) {
    try { const target = new URL(link, base); if (target.protocol === 'http:' && /^(www\.)?(instagram|facebook|tiktok)\.com$/i.test(target.hostname)) target.protocol = 'https:'; const profileUrl = publicProfileUrl(network, target.href); result.set(profileUrl, { network, profileUrl, foundOn: base }); } catch { /* not a supported profile */ }
  }
  return [...result.values()].slice(0, 30);
}
function jsonNodes(html: string): any[] {
  const output: any[] = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (!/application\/(?:ld\+)?json|__UNIVERSAL_DATA_FOR_REHYDRATION__|SIGI_STATE/i.test(match[1])) continue;
    try {
      const root = JSON.parse(match[2]); const stack = [root]; let traversed = 0;
      while (stack.length && traversed++ < 15000) { const item = stack.pop(); if (!item || typeof item !== 'object') continue; output.push(item); stack.push(...Object.values(item).filter(value => value && typeof value === 'object')); }
    } catch { /* Scripts are never executed; malformed/unsupported data is not a measurement. */ }
  }
  return output;
}
const count = (value: unknown): number | undefined => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
function identity(network: PublicNetwork, value: unknown, expected: string) {
  if (typeof value !== 'string') return false;
  try { return publicProfileUrl(network, value) === expected; } catch { return false; }
}
function actionCounts(node: any) {
  const output: { likes?: number; comments?: number; views?: number; followers?: number } = {};
  for (const item of Array.isArray(node.interactionStatistic) ? node.interactionStatistic : node.interactionStatistic ? [node.interactionStatistic] : []) {
    const type = typeof item.interactionType === 'string' ? item.interactionType : item.interactionType?.['@type'];
    const value = count(item.userInteractionCount); if (value === undefined) continue;
    const action = String(type || '').split(/[\/#]/).at(-1);
    if (action === 'FollowAction' || action === 'SubscribeAction') output.followers = value;
    if (action === 'LikeAction') output.likes = value;
    if (action === 'CommentAction') output.comments = value;
    if (action === 'WatchAction' || action === 'ViewAction') output.views = value;
  }
  return output;
}
export function parsePublicSocialHtml(network: PublicNetwork, profile: string, html: string, start: string, end: string, capturedAt = new Date().toISOString()): PublicSnapshot | null {
  const profileUrl = publicProfileUrl(network, profile), nodes = jsonNodes(html);
  const username = new URL(profileUrl).pathname.split('/').filter(Boolean)[0].replace(/^@/, '');
  let followers: number | undefined, totalPosts: number | undefined;
  const posts = new Map<string, PublicPost>();
  function addPost(url: unknown, publishedAt: unknown, values: Pick<PublicPost, 'likes' | 'comments' | 'views'>) {
    if (typeof url !== 'string' || typeof publishedAt !== 'string' || !calendarDay(publishedAt.slice(0, 10))) return;
    const day = publishedAt.slice(0, 10); if (day < start || day > end || posts.size >= 100) return;
    try { const parsed = new URL(url); parsed.search = ''; parsed.hash = ''; if (parsed.protocol !== 'https:' || parsed.hostname.replace(/^www\./, '') !== `${network}.com` || parsed.username || parsed.password || parsed.port) return;
      posts.set(parsed.href, { url: parsed.href, publishedAt: day, ...values }); } catch { /* no identifiable post */ }
  }
  for (const node of nodes) {
    // TikTok embeds public data associated with a specific, verified username.
    if (network === 'tiktok' && typeof node.user?.uniqueId === 'string' && node.user.uniqueId.toLowerCase() === username && node.stats) {
      followers = count(node.stats.followerCount); totalPosts = count(node.stats.videoCount);
    }
    if (network === 'tiktok' && typeof node.author?.uniqueId === 'string' && node.author.uniqueId.toLowerCase() === username && node.stats && typeof node.id === 'string' && /^\d+$/.test(node.id)) {
      const stamp = Number(node.createTime) * 1000;
      if (Number.isFinite(stamp) && stamp > 0 && stamp <= 8640000000000000) addPost(`https://www.tiktok.com/@${username}/video/${node.id}`, new Date(stamp).toISOString(), { likes: count(node.stats.diggCount), comments: count(node.stats.commentCount), views: count(node.stats.playCount) });
    }
    // Some public Instagram responses include exact account counts and its own timeline.
    if (network === 'instagram' && typeof node.username === 'string' && node.username.toLowerCase() === username) {
      followers = count(node.edge_followed_by?.count) ?? count(node.follower_count) ?? followers; totalPosts = count(node.edge_owner_to_timeline_media?.count) ?? count(node.media_count) ?? totalPosts;
      for (const edge of Array.isArray(node.edge_owner_to_timeline_media?.edges) ? node.edge_owner_to_timeline_media.edges : []) {
        const post = edge.node; if (!post || !/^[A-Za-z0-9_-]+$/.test(post.shortcode || '')) continue;
        const stamp = Number(post.taken_at_timestamp) * 1000;
        if (Number.isFinite(stamp) && stamp > 0 && stamp <= 8640000000000000) addPost(`https://www.instagram.com/p/${post.shortcode}/`, new Date(stamp).toISOString(), { likes: count(post.edge_media_preview_like?.count), comments: count(post.edge_media_to_comment?.count), views: count(post.video_view_count) });
      }
    }
    if (['Person', 'Organization', 'ProfilePage', 'LocalBusiness'].includes(node['@type']) && identity(network, node.url, profileUrl)) followers = actionCounts(node).followers ?? followers;
    if (['SocialMediaPosting', 'VideoObject'].includes(node['@type']) && identity(network, node.author?.url, profileUrl)) {
      const values = actionCounts(node); addPost(node.url || node['@id'], node.datePublished || node.uploadDate, { likes: values.likes, comments: values.comments, views: values.views });
    }
  }
  if (followers === undefined && totalPosts === undefined && !posts.size) return null;
  return validatePublicSnapshot(network, { id: crypto.randomUUID(), profileUrl, capturedAt, source: 'public-web', evidence: `HTML público sin sesión · ${profileUrl} · muestra disponible; no acredita cobertura completa`, followers, totalPosts, posts: [...posts.values()], periodStart: start, periodEnd: end });
}
export async function discoverPublicProfiles(domain: string, reader: PageReader = fetchPublicProfileHtml) {
  const page = await reader(domain);
  return { candidates: discoverSocialLinks(page.html, page.finalUrl), checkedAt: page.fetchedAt, finalUrl: page.finalUrl, note: 'Enlaces encontrados en el HTML del sitio. Confirmá que cada perfil pertenece al negocio; no se asignan por similitud de nombre.' };
}
export function publicResearchInput(body: any) {
  if (!body || !['facebook', 'instagram', 'tiktok'].includes(body.network) || typeof body.profileUrl !== 'string' || !calendarDay(body.start) || !calendarDay(body.end) || body.start > body.end || body.end > new Date().toISOString().slice(0, 10)) throw new Error('Indicá un perfil y un período válido que no termine en el futuro.');
  return { network: body.network as PublicNetwork, profileUrl: publicProfileUrl(body.network, body.profileUrl), start: body.start as string, end: body.end as string };
}
export async function collectPublicProfile(input: ReturnType<typeof publicResearchInput>, reader: PageReader = fetchPublicProfileHtml) {
  try {
    const page = await reader(input.profileUrl);
    if (publicProfileUrl(input.network, page.finalUrl) !== input.profileUrl) return { status: 'unavailable' as const, message: 'La red redirigió a otra página. No se confirmó la identidad del perfil ni se guardaron cifras.' };
    const snapshot = parsePublicSocialHtml(input.network, input.profileUrl, page.html, input.start, input.end, page.fetchedAt);
    return snapshot ? { status: 'measured' as const, snapshot, message: 'Datos públicos identificados. La muestra puede ser parcial; revisala antes de guardar.' } : { status: 'unavailable' as const, message: 'La página no entregó recuentos públicos verificables sin sesión. Abrí el perfil y cargá los valores visibles con evidencia; los datos anteriores se conservan.' };
  } catch { return { status: 'unavailable' as const, message: 'No se pudo leer el perfil público sin sesión. Puede requerir JavaScript, bloquear consultas o no estar disponible. No se estimaron cifras; podés registrar lo observado manualmente.' }; }
}
