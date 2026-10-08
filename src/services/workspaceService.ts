import { supabase } from './authService';
import {
  Business,
  SubscriptionPlanId,
  SupportedCountryCode,
  SupportedCurrency,
  SupportedLocale,
  Workspace,
} from '../types';

function mapWorkspace(row: any, role?: Workspace['role']): Workspace {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    ownerUserId: row.owner_user_id,
    planId: row.plan_id as SubscriptionPlanId,
    countryCode: row.country_code as SupportedCountryCode,
    currency: row.currency as SupportedCurrency,
    locale: row.locale as SupportedLocale,
    timezone: row.timezone,
    role,
  };
}

export const workspaceService = {
  async listWorkspaces(): Promise<Workspace[]> {
    if (!supabase) return [];

    const { data: memberships, error: membershipError } = await supabase
      .from('workspace_members')
      .select('workspace_id, role');

    if (membershipError) throw membershipError;
    if (!memberships?.length) return [];

    const ids = memberships.map((item) => item.workspace_id);
    const roleByWorkspace = new Map(memberships.map((item) => [item.workspace_id, item.role]));

    const { data: rows, error } = await supabase
      .from('workspaces')
      .select('*')
      .in('id', ids)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (rows || []).map((row) => mapWorkspace(row, roleByWorkspace.get(row.id)));
  },

  async createWorkspace(params: {
    name: string;
    slug?: string;
    countryCode: SupportedCountryCode;
    currency: SupportedCurrency;
    locale: SupportedLocale;
    timezone: string;
    planId: SubscriptionPlanId;
  }): Promise<string> {
    if (!supabase) throw new Error('Supabase no está configurado.');

    const { data, error } = await supabase.rpc('create_workspace_with_owner', {
      workspace_name: params.name,
      workspace_slug: params.slug || null,
      country_code: params.countryCode,
      currency: params.currency,
      locale: params.locale,
      timezone: params.timezone,
      plan_id: params.planId,
    });

    if (error) throw error;
    if (!data) throw new Error('No se pudo crear el espacio de trabajo.');
    return data as string;
  },

  async listBusinesses(workspaceId: string): Promise<Business[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      url: row.url,
      category: row.category,
      city: row.city,
      country: row.country,
      countryCode: row.country_code,
      currency: row.currency,
      locale: row.locale,
      timezone: row.timezone,
      subscriptionPlan: row.subscription_plan,
      createdAt: row.created_at?.slice(0, 10) || '',
      scores: {
        overall: 0,
        google: 0,
        seo: 0,
        web: 0,
        aiVisibility: 0,
      },
      scoreSources: {
        overall: 'demo',
        google: 'demo',
        seo: 'demo',
        web: 'demo',
        aiVisibility: 'demo',
      },
      totalOpportunities: 0,
      problemsCount: { high: 0, medium: 0, ok: 0 },
    }));
  },

  async createBusiness(workspaceId: string, business: Omit<Business, 'id' | 'createdAt' | 'scores' | 'scoreSources' | 'totalOpportunities' | 'problemsCount'>): Promise<string> {
    if (!supabase) throw new Error('Supabase no está configurado.');

    const { data, error } = await supabase
      .from('businesses')
      .insert({
        workspace_id: workspaceId,
        name: business.name,
        url: business.url,
        category: business.category,
        city: business.city,
        country: business.country,
        country_code: business.countryCode || 'AR',
        currency: business.currency || 'USD',
        locale: business.locale || 'es-AR',
        timezone: business.timezone || 'America/Argentina/Buenos_Aires',
        subscription_plan: business.subscriptionPlan || 'growth',
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  },
};
