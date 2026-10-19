import { socialStorageFailure } from '../../shared/socialStorageFailure';
import { supabase, authService } from './authService';
import { apiFetchJson } from './apiClient';
import { publicProfileUrl, validatePublicSnapshot, validateSocialAccount, validateSocialMeasurement, type PublicNetwork, type PublicSnapshot, type SocialAccount, type SocialMeasurement } from '../../shared/socialMetrics';
function db() { if (!supabase) throw new Error('Redes necesita Supabase configurado.'); return supabase; }
function decode(row: any): SocialAccount {
  return validateSocialAccount({ ...row.payload, workspaceId: row.workspace_id, businessId: row.business_id, network: row.network, updatedAt: row.updated_at });
}
export const socialMetricsService = {
  async instagramDiscoveryStatus(): Promise<{ configured: boolean; missing: string[]; operatorAllowed: boolean }> { return apiFetchJson('/api/social/instagram/discovery/status', { headers: await authService.getAuthorizationHeaders(), signal: AbortSignal.timeout(10000) }); },
  async discover(domain: string): Promise<{ candidates: { network: PublicNetwork; profileUrl: string; foundOn: string }[]; checkedAt: string; finalUrl: string; note: string }> {
    return apiFetchJson('/api/social/public/discover', { method: 'POST', headers: await authService.getAuthorizationHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ domain }), signal: AbortSignal.timeout(35000) });
  },
  async collectPublic(network: PublicNetwork, profileUrl: string, start: string, end: string): Promise<{ status: 'measured' | 'unavailable'; snapshot?: PublicSnapshot; message: string }> {
    const result = await apiFetchJson<{ status: 'measured' | 'unavailable'; snapshot?: PublicSnapshot; message: string }>('/api/social/public/collect', { method: 'POST', headers: await authService.getAuthorizationHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ network, profileUrl, start, end }), signal: AbortSignal.timeout(35000) });
    if (result.status === 'measured') {
      const snapshot = validatePublicSnapshot(network, result.snapshot!);
      if (publicProfileUrl(network, snapshot.profileUrl) !== publicProfileUrl(network, profileUrl) || snapshot.periodStart !== start || snapshot.periodEnd !== end || !['public-web', 'official-public-api', 'youtube-data-api'].includes(snapshot.source)) throw new Error('La observación no corresponde al perfil o período consultado.');
    }
    return result;
  },
  async list(workspaceId: string, businessId: string): Promise<SocialAccount[]> {
    const { data, error } = await db().from('business_social_accounts').select('workspace_id,business_id,network,payload,updated_at').eq('workspace_id', workspaceId).eq('business_id', businessId);
    if (error) throw new Error(socialStorageFailure(error));
    return (data || []).map(decode);
  },
  async save(input: SocialAccount): Promise<SocialAccount> {
    const account = validateSocialAccount(input);
    const { updatedAt, workspaceId, businessId, network, ...payload } = account;
    const query = updatedAt
      ? db().from('business_social_accounts').update({ payload }).eq('workspace_id', workspaceId).eq('business_id', businessId).eq('network', network).eq('updated_at', updatedAt)
      : db().from('business_social_accounts').insert({ workspace_id: workspaceId, business_id: businessId, network, payload });
    const { data, error } = await query.select('workspace_id,business_id,network,payload,updated_at').maybeSingle();
    if (error) throw new Error(socialStorageFailure(error));
    if (!data) throw new Error('No se confirmó el guardado. La ficha puede haber cambiado en otra pestaña; recargá Redes antes de reintentar.');
    return decode(data);
  },
  async measure(network: SocialAccount['network'], profileUrl: string, accountId: string, accessToken: string): Promise<SocialMeasurement> {
    const data = await apiFetchJson<{ measurement: SocialMeasurement }>('/api/social/measure', {
      method: 'POST', headers: await authService.getAuthorizationHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({ network, profileUrl, accountId, accessToken }), signal: AbortSignal.timeout(35000),
    });
    const measurement = validateSocialMeasurement(data.measurement);
    if (measurement.network !== network || measurement.profileUrl !== profileUrl || measurement.accountId !== accountId || measurement.source !== 'official-api') throw new Error('La respuesta no corresponde a la cuenta consultada.');
    return measurement;
  },
};
