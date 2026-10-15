export const socialNetworks = ['facebook', 'instagram', 'tiktok', 'google'] as const;
export type SocialNetwork = typeof socialNetworks[number];
export const networkNames: Record<SocialNetwork, string> = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', google: 'Google · Search Console' };
export const metricDefinitions = {
  followers: { label: 'Seguidores', period: false, networks: ['facebook', 'instagram', 'tiktok'] },
  posts: { label: 'Publicaciones / videos acumulados', period: false, networks: ['instagram', 'tiktok'] },
  likes: { label: 'Me gusta acumulados de videos', period: false, networks: ['tiktok'] },
  views: { label: 'Visualizaciones del período', period: true, networks: ['facebook', 'instagram', 'tiktok'] },
  reach: { label: 'Alcance del período', period: true, networks: ['facebook', 'instagram'] },
  interactions: { label: 'Interacciones del período', period: true, networks: ['facebook', 'instagram', 'tiktok'] },
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
  const allowed: Record<SocialNetwork, string[]> = { facebook: ['facebook.com', 'm.facebook.com'], instagram: ['instagram.com'], tiktok: ['tiktok.com'], google: [] };
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
  if (!account) return null;
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
    typeof account.accountId !== 'string' || account.accountId.length > 128 || !Array.isArray(account.measurements) || account.measurements.length > 100) throw new Error('La ficha de la red no es válida.');
  socialProfileUrl(account.network, account.profileUrl);
  for (const measurement of account.measurements) {
    validateSocialMeasurement(measurement);
    if (measurement.network !== account.network) throw new Error('La medición corresponde a otra red.');
  }
  return account;
}
