export const socialNetworks = ['facebook', 'instagram', 'tiktok', 'youtube', 'google'] as const;
export type SocialNetwork = typeof socialNetworks[number];
export const networkNames: Record<SocialNetwork, string> = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', google: 'Google · Search Console' };
export const metricDefinitions = {
  followers: { label: 'Seguidores', period: false, networks: ['facebook', 'instagram', 'tiktok', 'youtube'] },
  posts: { label: 'Publicaciones / videos acumulados', period: false, networks: ['instagram', 'tiktok', 'youtube'] },
  likes: { label: 'Me gusta acumulados de videos', period: false, networks: ['tiktok'] },
  views: { label: 'Visualizaciones del período', period: true, networks: ['facebook', 'instagram', 'tiktok', 'youtube'] },
  reach: { label: 'Alcance del período', period: true, networks: ['facebook', 'instagram'] },
  interactions: { label: 'Interacciones del período', period: true, networks: ['facebook', 'instagram', 'tiktok', 'youtube'] },
  clicks: { label: 'Clics de consultas recuperadas', period: true, networks: ['google'] },
  impressions: { label: 'Impresiones de consultas recuperadas', period: true, networks: ['google'] },
} as const;
export type SocialMetric = keyof typeof metricDefinitions;
export interface SocialMeasurement {
  id: string; network: SocialNetwork; profileUrl: string; capturedAt: string;
  source: 'manual' | 'official-api' | 'google-search-console';
  evidence: string; accountId?: string; periodStart?: string; periodEnd?: string;
  metrics: Partial<Record<SocialMetric, number>>;
}
export interface SocialAccount {
  workspaceId: string; businessId: string; network: SocialNetwork;
  profileUrl: string; accountId: string; measurements: SocialMeasurement[]; updatedAt?: string;
  publicProfiles?: PublicSocialProfile[];
  presence?: { status: 'not-used'; confirmedAt: string; evidence: string };
}
export type PublicNetwork = Exclude<SocialNetwork, 'google'>;
export interface PublicPost {
  url: string; publishedAt: string; likes?: number; comments?: number; views?: number;
}
export interface PublicSnapshot {
  id: string; profileUrl: string; capturedAt: string; source: 'public-web' | 'manual-public' | 'official-public-api' | 'youtube-data-api';
  evidence: string; followers?: number; totalPosts?: number; posts: PublicPost[];
  periodStart: string; periodEnd: string;
  coverage?: { status: 'partial' | 'complete-available'; reason: 'exhausted' | 'page-limit' | 'time-limit' | 'provider-error' | 'invalid-media' | 'missing-media' | 'invalid-cursor' | 'count-mismatch'; pages: number; examined: number; rejected: number };
}
export interface PublicSocialProfile {
  role: 'own' | 'competitor-1' | 'competitor-2'; name: string; profileUrl: string;
  confirmed: boolean; snapshots: PublicSnapshot[];
}
/** Canonical identity, excluding share links, login screens and individual posts. */
export function publicProfileUrl(network: PublicNetwork, value: string): string {
  const url = new URL(socialProfileUrl(network, value));
  if (url.port) throw new Error('El perfil no debe incluir un puerto.');
  const parts = url.pathname.split('/').filter(Boolean);
  if (network === 'youtube') {
    if (parts.length === 1 && /^@[A-Za-z0-9_.%~-]+$/.test(parts[0])) return `https://www.youtube.com/${parts[0].toLowerCase()}/`;
    if (parts.length === 2 && ((parts[0] === 'channel' && /^UC[A-Za-z0-9_-]{22}$/.test(parts[1])) || (parts[0] === 'user' && /^[A-Za-z0-9_.-]+$/.test(parts[1])))) return `https://www.youtube.com/${parts.join('/')}/`;
    throw new Error('Usá el enlace del canal de YouTube: /@identificador, /channel/UC… o /user/nombre.');
  }
  const reserved = /^(p|reel|reels|stories|explore|accounts|login|share|sharer|watch|video|videos|search|hashtag|intent|help|privacy|legal|plugins|dialog)$/i;
  if (network === 'facebook' && parts[0] === 'profile.php' && /^\d+$/.test(url.searchParams.get('id') || '')) return `https://www.facebook.com/profile.php?id=${url.searchParams.get('id')}`;
  if (parts.length !== 1 || reserved.test(parts[0]) || !/^[A-Za-z0-9_.@-]+$/.test(parts[0]) || (network === 'tiktok' && !/^@[A-Za-z0-9_.]+$/.test(parts[0]))) throw new Error('Usá la dirección del perfil, no una publicación ni un enlace para compartir.');
  return `https://www.${network}.com/${parts[0].toLowerCase()}/`;
}
export function validatePublicSnapshot(network: PublicNetwork, value: PublicSnapshot): PublicSnapshot {
  if (!value || typeof value.id !== 'string' || !value.id || typeof value.capturedAt !== 'string' || !Number.isFinite(Date.parse(value.capturedAt)) ||
    !['public-web', 'manual-public', 'official-public-api', 'youtube-data-api'].includes(value.source) || typeof value.evidence !== 'string' || value.evidence.trim().length < 8 || value.evidence.length > 2000 ||
    !calendarDay(value.periodStart) || !calendarDay(value.periodEnd) || value.periodStart > value.periodEnd || !Array.isArray(value.posts) || value.posts.length > 500) throw new Error('La observación pública necesita fecha, período y evidencia.');
  if(value.coverage){
    const c=value.coverage;
    if(value.source!=='official-public-api'||network!=='instagram'||!['partial','complete-available'].includes(c.status)||!['exhausted','page-limit','time-limit','provider-error','invalid-media','missing-media','invalid-cursor','count-mismatch'].includes(c.reason)||![c.pages,c.examined,c.rejected].every(n=>Number.isSafeInteger(n)&&n>=0)||c.pages<1||c.pages>5||c.examined>500||c.rejected>c.examined||value.posts.length>c.examined||
      (c.status==='complete-available'&&(c.reason!=='exhausted'||c.rejected!==0||value.totalPosts!==c.examined)))throw new Error('La cobertura de publicaciones no tiene respaldo verificable.');
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value.capturedAt) && !calendarDay(value.capturedAt)) throw new Error('Fecha observada inválida.');
  if (value.source === 'official-public-api' && network !== 'instagram') throw new Error('Esta fuente oficial pública corresponde únicamente a Instagram Business Discovery.');
  if (value.source === 'youtube-data-api' && network !== 'youtube') throw new Error('La fuente YouTube Data API solo corresponde a YouTube.');
  publicProfileUrl(network, value.profileUrl);
  const observedDay = value.capturedAt.slice(0, 10);
  if (!calendarDay(observedDay) || observedDay > new Date().toISOString().slice(0, 10) || value.periodEnd > new Date().toISOString().slice(0, 10)) throw new Error('No se guardan observaciones ni períodos futuros.');
  const validCount = (count: unknown) => typeof count === 'number' && Number.isSafeInteger(count) && count >= 0;
  for (const count of [value.followers, value.totalPosts]) if (count !== undefined && !validCount(count)) throw new Error('Los recuentos deben ser enteros observados; un dato desconocido se deja vacío.');
  if (value.followers === undefined && value.totalPosts === undefined && !value.posts.length) throw new Error('No se guardan observaciones vacías.');
  const seen = new Set<string>();
  for (const post of value.posts) {
    const url = new URL(socialProfileUrl(network, post.url));
    if (url.port || url.search || url.hash || seen.has(url.href) || !calendarDay(post.publishedAt) || post.publishedAt < value.periodStart || post.publishedAt > value.periodEnd || post.publishedAt > observedDay) throw new Error('Revisá la URL, fecha, período o duplicación de la publicación.');
    seen.add(url.href);
    for (const count of [post.likes, post.comments, post.views]) if (count !== undefined && !validCount(count)) throw new Error('Los recuentos de la publicación no son válidos.');
  }
  return value;
}
export function validatePublicProfiles(network: PublicNetwork, profiles: PublicSocialProfile[]) {
  if (!Array.isArray(profiles) || profiles.length > 3) throw new Error('Registrá el negocio y hasta dos competidores.');
  const roles = new Set<string>(), urls = new Set<string>();
  for (const profile of profiles) {
    const url = publicProfileUrl(network, profile.profileUrl);
    if (!['own', 'competitor-1', 'competitor-2'].includes(profile.role) || roles.has(profile.role) || urls.has(url) || typeof profile.name !== 'string' || !profile.name.trim() || profile.name.length > 160 || typeof profile.confirmed !== 'boolean' || !Array.isArray(profile.snapshots) || profile.snapshots.length > 120) throw new Error('Los perfiles deben ser distintos y tener nombre y rol válidos.');
    roles.add(profile.role); urls.add(url);
    for (const snapshot of profile.snapshots) validatePublicSnapshot(network, snapshot);
  }
  return profiles;
}
export function calendarDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function socialProfileUrl(network: SocialNetwork, value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('Ingresá la URL HTTPS completa del perfil.'); }
  if (url.protocol !== 'https:' || url.username || url.password || value.length > 2048) throw new Error('El perfil debe ser una URL HTTPS sin credenciales.');
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const allowed: Record<SocialNetwork, string[]> = { facebook: ['facebook.com', 'm.facebook.com'], instagram: ['instagram.com'], tiktok: ['tiktok.com'], youtube: ['youtube.com'], google: [] };
  if (network !== 'google' && (!allowed[network]?.includes(host) || url.pathname === '/')) throw new Error(`Ingresá un perfil de ${networkNames[network]}.`);
  if (network === 'google' && !host.includes('.')) throw new Error('Ingresá el sitio del negocio.');
  url.hash = ''; return url.href;
}
export function validateSocialMeasurement(value: SocialMeasurement): SocialMeasurement {
  if (!value || !socialNetworks.includes(value.network) || typeof value.id !== 'string' || !value.id ||
    typeof value.capturedAt !== 'string' || !Number.isFinite(Date.parse(value.capturedAt)) || (/^\d{4}-\d{2}-\d{2}$/.test(value.capturedAt) && !calendarDay(value.capturedAt)) ||
    !['manual', 'official-api', 'google-search-console'].includes(value.source) ||
    typeof value.evidence !== 'string' || value.evidence.trim().length < 8 || value.evidence.length > 2000) throw new Error('La medición necesita fuente, fecha y evidencia identificable.');
  socialProfileUrl(value.network, value.profileUrl);
  const entries = Object.entries(value.metrics || {});
  if (!entries.length || entries.some(([key, number]) => !(key in metricDefinitions) ||
    !(metricDefinitions[key as SocialMetric].networks as readonly string[]).includes(value.network) ||
    !Number.isSafeInteger(number) || number < 0)) throw new Error('Cargá métricas numéricas enteras, no negativas y correspondientes a esta red.');
  if (entries.some(([key]) => metricDefinitions[key as SocialMetric].period) &&
    (!calendarDay(value.periodStart) || !calendarDay(value.periodEnd) || value.periodStart > value.periodEnd)) throw new Error('Indicá un período válido para estas métricas.');
  if ((value.periodStart || value.periodEnd) && (!calendarDay(value.periodStart) || !calendarDay(value.periodEnd) || value.periodStart > value.periodEnd)) throw new Error('El período de medición no es válido.');
  if (value.source === 'official-api' && !value.accountId?.trim()) throw new Error('Falta la cuenta confirmada por la API.');
  if ((value.network === 'google') !== (value.source === 'google-search-console')) throw new Error('Google utiliza exclusivamente mediciones importadas de Search Console.');
  return value;
}
export function latestSocialMetric(account: SocialAccount | undefined, metric: SocialMetric, start: string, end: string): { value: number; measurement: SocialMeasurement } | null {
  if (!account || account.presence?.status === 'not-used') return null;
  const definition = metricDefinitions[metric];
  const measurements = account.measurements.filter(measurement => {
    try { validateSocialMeasurement(measurement); } catch { return false; }
    return measurement.network === account.network && measurement.profileUrl === account.profileUrl &&
      (!account.accountId || measurement.accountId === account.accountId) &&
      typeof measurement.metrics[metric] === 'number' && (!definition.period || measurement.periodStart === start && measurement.periodEnd === end);
  }).sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt));
  return measurements[0] ? { value: measurements[0].metrics[metric]!, measurement: measurements[0] } : null;
}
export function validateSocialAccount(account: SocialAccount): SocialAccount {
  if (!account || !account.workspaceId || !account.businessId || !socialNetworks.includes(account.network) || account.network === 'google' ||
    typeof account.profileUrl !== 'string' || typeof account.accountId !== 'string' || account.accountId.length > 128 || !Array.isArray(account.measurements) || account.measurements.length > 100) throw new Error('La ficha de la red no es válida.');
  if (account.presence !== undefined && (account.presence.status !== 'not-used' || typeof account.presence.confirmedAt !== 'string' || !Number.isFinite(Date.parse(account.presence.confirmedAt)) || Date.parse(account.presence.confirmedAt) > Date.now() || typeof account.presence.evidence !== 'string' || account.presence.evidence.trim().length < 8 || account.presence.evidence.length > 2000)) throw new Error('La ausencia de cuenta debe tener confirmación, fecha y procedencia.');
  if (account.profileUrl || account.presence?.status !== 'not-used') socialProfileUrl(account.network, account.profileUrl);
  if (account.publicProfiles !== undefined) validatePublicProfiles(account.network as PublicNetwork, account.publicProfiles);
  for (const measurement of account.measurements) {
    validateSocialMeasurement(measurement);
    if (measurement.network !== account.network) throw new Error('La medición corresponde a otra red.');
  }
  return account;
}

export function publicSourceLabel(source: PublicSnapshot['source']) { return source === 'youtube-data-api' ? 'YouTube Data API · suscriptores redondeados por YouTube' : source === 'official-public-api' ? 'Meta · Business Discovery' : source === 'public-web' ? 'Lectura pública' : 'Observación manual'; }
