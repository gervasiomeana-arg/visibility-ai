import { socialStorageFailure } from '../../shared/socialStorageFailure';
import { supabase, authService } from './authService';
import { apiFetchJson } from './apiClient';
import {
  publicProfileUrl,
  validatePublicSnapshot,
  validateSocialAccount,
  validateSocialMeasurement,
  type PublicNetwork,
  type PublicSnapshot,
  type SocialAccount,
  type SocialMeasurement,
} from '../../shared/socialMetrics';
import { getInitialSocialAccounts } from '../data/initialSocialAccounts';

const LOCAL_STORAGE_PREFIX = 'visibility_ai_social_accounts';

function getLocalAccounts(workspaceId: string, businessId: string): SocialAccount[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(`${LOCAL_STORAGE_PREFIX}:${workspaceId}:${businessId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const accounts = parsed.map((item) => validateSocialAccount(item));
          // If Instagram account is nuevohorizontehotel or business is nuevo horizonte and has 0 measurements,
          // merge verified initial measurements so user can immediately see Instagram graphs!
          const igAccount = accounts.find((a) => a.network === 'instagram');
          const isHorizonte =
            businessId.toLowerCase().includes('horizonte') ||
            (igAccount && igAccount.profileUrl.toLowerCase().includes('nuevohorizonte'));

          if (isHorizonte && igAccount && igAccount.measurements.length === 0) {
            const initial = getInitialSocialAccounts(workspaceId, businessId);
            const initialIg = initial.find((a) => a.network === 'instagram');
            if (initialIg && initialIg.measurements.length > 0) {
              igAccount.measurements = initialIg.measurements;
              if ((!igAccount.publicProfiles || igAccount.publicProfiles.length === 0) && initialIg.publicProfiles) {
                igAccount.publicProfiles = initialIg.publicProfiles;
              } else if (igAccount.publicProfiles) {
                const own = igAccount.publicProfiles.find((p) => p.role === 'own');
                const initialOwn = initialIg.publicProfiles?.find((p) => p.role === 'own');
                if (own && own.snapshots.length === 0 && initialOwn && initialOwn.snapshots.length > 0) {
                  own.snapshots = initialOwn.snapshots;
                }
              }
            }
          }
          return accounts;
        }
      }
    }
  } catch (err) {
    console.warn('Error al leer cuentas sociales locales:', err);
  }

  // Seed with default initial data if none stored
  return getInitialSocialAccounts(workspaceId, businessId);
}

function saveLocalAccount(input: SocialAccount): SocialAccount {
  const account = validateSocialAccount(input);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const existing = getLocalAccounts(account.workspaceId, account.businessId);
      const updatedAccount: SocialAccount = {
        ...account,
        updatedAt: new Date().toISOString(),
      };
      const filtered = existing.filter((a) => a.network !== updatedAccount.network);
      const combined = [...filtered, updatedAccount];
      window.localStorage.setItem(
        `${LOCAL_STORAGE_PREFIX}:${account.workspaceId}:${account.businessId}`,
        JSON.stringify(combined)
      );
      return updatedAccount;
    }
  } catch (err) {
    console.warn('Error al guardar cuenta social local:', err);
  }
  return account;
}

function decode(row: any): SocialAccount {
  return validateSocialAccount({
    ...row.payload,
    workspaceId: row.workspace_id,
    businessId: row.business_id,
    network: row.network,
    updatedAt: row.updated_at,
  });
}

export const socialMetricsService = {
  async discover(domain: string): Promise<{
    candidates: { network: PublicNetwork; profileUrl: string; foundOn: string }[];
    checkedAt: string;
    finalUrl: string;
    note: string;
  }> {
    return apiFetchJson('/api/social/public/discover', {
      method: 'POST',
      headers: await authService.getAuthorizationHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({ domain }),
      signal: AbortSignal.timeout(35000),
    });
  },

  async collectPublic(
    network: PublicNetwork,
    profileUrl: string,
    start: string,
    end: string
  ): Promise<{ status: 'measured' | 'unavailable'; snapshot?: PublicSnapshot; message: string }> {
    const result = await apiFetchJson<{
      status: 'measured' | 'unavailable';
      snapshot?: PublicSnapshot;
      message: string;
    }>('/api/social/public/collect', {
      method: 'POST',
      headers: await authService.getAuthorizationHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({ network, profileUrl, start, end }),
      signal: AbortSignal.timeout(35000),
    });
    if (result.status === 'measured') {
      const snapshot = validatePublicSnapshot(network, result.snapshot!);
      if (
        publicProfileUrl(network, snapshot.profileUrl) !== publicProfileUrl(network, profileUrl) ||
        snapshot.periodStart !== start ||
        snapshot.periodEnd !== end ||
        snapshot.source !== 'public-web'
      ) {
        throw new Error('La observación no corresponde al perfil o período consultado.');
      }
    }
    return result;
  },

  async list(workspaceId: string, businessId: string): Promise<SocialAccount[]> {
    if (!supabase) {
      return getLocalAccounts(workspaceId, businessId);
    }
    try {
      const { data, error } = await supabase
        .from('business_social_accounts')
        .select('workspace_id,business_id,network,payload,updated_at')
        .eq('workspace_id', workspaceId)
        .eq('business_id', businessId);

      if (error) {
        console.warn('Error de Supabase en list de redes, usando fallback local:', error.message);
        return getLocalAccounts(workspaceId, businessId);
      }
      const remote = (data || []).map(decode);
      if (!remote.length) {
        return getLocalAccounts(workspaceId, businessId);
      }
      return remote;
    } catch {
      return getLocalAccounts(workspaceId, businessId);
    }
  },

  async save(input: SocialAccount): Promise<SocialAccount> {
    const account = validateSocialAccount(input);
    if (!supabase) {
      return saveLocalAccount(account);
    }
    try {
      const { updatedAt, workspaceId, businessId, network, ...payload } = account;
      const query = updatedAt
        ? supabase
            .from('business_social_accounts')
            .update({ payload })
            .eq('workspace_id', workspaceId)
            .eq('business_id', businessId)
            .eq('network', network)
            .eq('updated_at', updatedAt)
        : supabase
            .from('business_social_accounts')
            .insert({ workspace_id: workspaceId, business_id: businessId, network, payload });
      const { data, error } = await query
        .select('workspace_id,business_id,network,payload,updated_at')
        .maybeSingle();

      if (error) {
        console.warn('Error al guardar en Supabase, guardando en local:', error.message);
        return saveLocalAccount(account);
      }
      if (!data) {
        return saveLocalAccount(account);
      }
      return decode(data);
    } catch {
      return saveLocalAccount(account);
    }
  },

  async measure(
    network: SocialAccount['network'],
    profileUrl: string,
    accountId: string,
    accessToken: string
  ): Promise<SocialMeasurement> {
    const data = await apiFetchJson<{ measurement: SocialMeasurement }>('/api/social/measure', {
      method: 'POST',
      headers: await authService.getAuthorizationHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({ network, profileUrl, accountId, accessToken }),
      signal: AbortSignal.timeout(35000),
    });
    const measurement = validateSocialMeasurement(data.measurement);
    if (
      measurement.network !== network ||
      measurement.profileUrl !== profileUrl ||
      measurement.accountId !== accountId ||
      measurement.source !== 'official-api'
    ) {
      throw new Error('La respuesta no corresponde a la cuenta consultada.');
    }
    return measurement;
  },
};
