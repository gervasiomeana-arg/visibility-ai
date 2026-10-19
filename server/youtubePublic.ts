import crypto from 'node:crypto';
import { calendarDay, publicProfileUrl, validatePublicSnapshot } from '../shared/socialMetrics';

export function youtubeConfigured(key: string | undefined = process.env.YOUTUBE_API_KEY): key is string { return Boolean(key?.trim() && key.trim() !== 'MY_YOUTUBE_API_KEY'); }

/** Fixed Google endpoint; a caller-supplied URL is never fetched. Public channel statistics, not Analytics. */
export async function collectYouTube(profile: string, start: string, end: string, fetcher: typeof fetch = fetch, key = process.env.YOUTUBE_API_KEY?.trim()) {
  const profileUrl = publicProfileUrl('youtube', profile);
  if (!calendarDay(start) || !calendarDay(end) || start > end || end > new Date().toISOString().slice(0,10)) throw new Error('Período de YouTube inválido.');
  if (!youtubeConfigured(key)) throw new Error('Configurá YOUTUBE_API_KEY propia de Visibility en el servidor y habilitá YouTube Data API v3. No se necesita contraseña del cliente.');
  const parts = new URL(profileUrl).pathname.split('/').filter(Boolean);
  const query = new URLSearchParams({ part: 'id,statistics', key });
  query.set(parts[0].startsWith('@') ? 'forHandle' : parts[0] === 'channel' ? 'id' : 'forUsername', parts[0].startsWith('@') ? parts[0] : parts[1]);
  let response: Response;
  try { response = await fetcher(`https://www.googleapis.com/youtube/v3/channels?${query}`, { signal: AbortSignal.timeout(15000), redirect: 'error' }); }
  catch { throw new Error('No se pudo contactar con YouTube. No se guardaron recuentos nuevos.'); }
  if (!response.ok) throw new Error('YouTube rechazó la consulta. Revisá la API habilitada, restricciones de YOUTUBE_API_KEY y cuota. Los datos anteriores se conservan.');
  let body: any;
  try { body = await response.json(); } catch { throw new Error('YouTube devolvió una respuesta no válida.'); }
  const channel = body?.items?.length === 1 ? body.items[0] : null;
  if (!channel || !/^UC[A-Za-z0-9_-]{22}$/.test(channel.id || '') || (parts[0] === 'channel' && channel.id !== parts[1])) throw new Error('YouTube no confirmó un único canal para ese enlace.');
  const count = (value: unknown) => typeof value === 'string' && /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : undefined;
  const stats = channel.statistics || {};
  return validatePublicSnapshot('youtube', { id: crypto.randomUUID(), profileUrl, capturedAt: new Date().toISOString(), source: 'youtube-data-api',
    evidence: `YouTube Data API v3 · channels.list · canal ${channel.id} · suscriptores actuales redondeados hacia abajo a tres cifras significativas por YouTube; videos públicos acumulados. Sin historial, alcance ni visualizaciones del período.`,
    followers: stats.hiddenSubscriberCount === false ? count(stats.subscriberCount) : undefined, totalPosts: count(stats.videoCount), posts: [], periodStart: start, periodEnd: end });
}
