import { socialProfileUrl, validateSocialMeasurement, type SocialMeasurement, type SocialNetwork } from '../shared/socialMetrics';
import crypto from 'node:crypto';

export function validateSocialApiInput(input: any) {
  if (!input || !['facebook', 'instagram', 'tiktok'].includes(input.network) ||
    typeof input.accessToken !== 'string' || !input.accessToken.trim() || input.accessToken.length > 10000 || /[\r\n]/.test(input.accessToken) ||
    typeof input.accountId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(input.accountId)) throw new Error('Indicá la red, el identificador de cuenta y un token autorizado válido.');
  if (input.network !== 'tiktok' && !/^\d+$/.test(input.accountId)) throw new Error('Meta requiere el identificador numérico de la página o cuenta profesional.');
  return { network: input.network as SocialNetwork, profileUrl: socialProfileUrl(input.network, input.profileUrl), accountId: input.accountId, accessToken: input.accessToken.trim() };
}
export async function measureSocialAccount(input: ReturnType<typeof validateSocialApiInput>, fetcher: typeof fetch = fetch): Promise<SocialMeasurement> {
  let endpoint: URL;
  if (input.network === 'tiktok') {
    endpoint = new URL('https://open.tiktokapis.com/v2/user/info/');
    endpoint.searchParams.set('fields', 'open_id,follower_count,likes_count,video_count');
  } else {
    const version = process.env.META_GRAPH_API_VERSION;
    if (!version || !/^v\d+\.0$/.test(version)) throw new Error('Configurá META_GRAPH_API_VERSION con una versión habilitada en tu aplicación Meta.');
    endpoint = new URL(`https://graph.facebook.com/${version}/${input.accountId}`);
    endpoint.searchParams.set('fields', input.network === 'facebook' ? 'id,followers_count' : 'id,followers_count,media_count');
  }
  const response = await fetcher(endpoint.href, { headers: { authorization: `Bearer ${input.accessToken}`, accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error('La red no permitió consultar métricas. Revisá el token, sus permisos y el identificador de cuenta. No se guardó una medición nueva.');
  const data: any = await response.json();
  const provider = input.network === 'tiktok' ? data?.data?.user : data;
  if ((input.network === 'tiktok' ? data?.error?.code !== 'ok' : data?.error) || !provider ||
    (input.network === 'tiktok' ? provider.open_id : provider.id) !== input.accountId) throw new Error('La respuesta de la red no confirmó la cuenta solicitada. No se guardó una medición nueva.');
  const metrics = input.network === 'facebook' ? { followers: provider.followers_count }
    : input.network === 'instagram' ? { followers: provider.followers_count, posts: provider.media_count }
    : { followers: provider.follower_count, posts: provider.video_count, likes: provider.likes_count };
  return validateSocialMeasurement({ id: crypto.randomUUID(), network: input.network, profileUrl: input.profileUrl, accountId: input.accountId, capturedAt: new Date().toISOString(), source: 'official-api', evidence: input.network === 'tiktok' ? 'TikTok Display API · user/info · autorización de la cuenta' : `Meta Graph API · ${input.network} · cuenta autorizada`, metrics });
}
