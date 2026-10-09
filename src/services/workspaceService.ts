import { supabase } from './authService';
import type { LegacyBusinessBundle } from './storageService';
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
    const roleByWorkspace = new Map(
      memberships.map((item) => [item.workspace_id, item.role as Workspace['role']])
    );

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

  async importLegacyBundles(workspaceId: string, bundles: LegacyBusinessBundle[]): Promise<void> {
    for (const bundle of bundles) {
      let businessId: string;

      try {
        businessId = await this.createBusiness(workspaceId, {
          ...bundle.business,
          workspaceId,
        });
      } catch {
        const existing = await this.listBusinesses(workspaceId);
        const match = existing.find(
          (business) => business.url.trim().toLowerCase() === bundle.business.url.trim().toLowerCase()
        );
        if (!match) throw new Error(`No se pudo importar ${bundle.business.name}`);
        businessId = match.id;
      }

      const issues = bundle.issues.map((item: any) => ({ ...item, businessId }));
      const tasks = bundle.tasks.map((item: any) => ({ ...item, businessId }));
      const opportunities = bundle.opportunities.map((item: any) => ({ ...item, businessId }));
      const keywords = bundle.keywords.map((item: any) => ({ ...item, businessId }));

      const realAuditItems = bundle.seoAudit.filter((item) => item.source === 'real');
      if (realAuditItems.length > 0) {
        await this.saveSeoAudit({
          workspaceId,
          businessId,
          requestedUrl: bundle.seoMeta?.requestedUrl || bundle.business.url,
          finalUrl: bundle.seoMeta?.finalUrl || bundle.business.url,
          httpStatus: bundle.seoMeta?.httpStatus,
          responseTimeMs: bundle.seoMeta?.responseTimeMs,
          seoScore: bundle.business.scores?.seo ?? null,
          webScore: bundle.business.scores?.web ?? null,
          overallScore: bundle.business.scores?.overall ?? null,
          unresolvedIssues: issues.filter((issue: any) => issue.severity !== 'ok').length,
          payload: {
            items: realAuditItems,
            issues,
            meta: bundle.seoMeta,
            scores: bundle.business.scores,
            scoreSources: bundle.business.scoreSources,
            migratedFromLocal: true,
          },
        });
      }

      if (tasks.length > 0) {
        await this.upsertActionTasks(workspaceId, businessId, tasks);
      }

      if (opportunities.length > 0) {
        await this.upsertOpportunities(workspaceId, businessId, opportunities);
      }

      if (
        bundle.searchMeta?.siteUrl &&
        bundle.searchMeta?.startDate &&
        bundle.searchMeta?.endDate
      ) {
        await this.saveSearchConsoleSnapshot({
          workspaceId,
          businessId,
          siteUrl: bundle.searchMeta.siteUrl,
          periodStart: bundle.searchMeta.startDate,
          periodEnd: bundle.searchMeta.endDate,
          clicks: Number(bundle.searchMeta.clicks || 0),
          impressions: Number(bundle.searchMeta.impressions || 0),
          ctr: Number(bundle.searchMeta.ctr || 0),
          position: Number(bundle.searchMeta.position || 0),
          payload: {
            keywords,
            migratedFromLocal: true,
          },
        });
      }
    }
  },

  async updateWorkspaceName(
    workspace: Workspace,
    name: string
  ): Promise<Workspace> {
    if (!supabase) throw new Error('Supabase no está configurado.');

    const nextName = name.trim();
    if (!nextName) throw new Error('El nombre del workspace es obligatorio.');

    const { data, error } = await supabase
      .from('workspaces')
      .update({
        name: nextName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workspace.id)
      .select('*')
      .single();

    if (error) throw error;
    return mapWorkspace(data, workspace.role);
  },

  async listMembers(workspaceId: string): Promise<Array<{
    userId: string;
    role: 'owner' | 'admin' | 'member' | 'viewer';
  }>> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      userId: row.user_id,
      role: row.role,
    }));
  },

  async listInvites(workspaceId: string): Promise<Array<{
    id: string;
    email: string;
    role: 'admin' | 'member' | 'viewer';
    token: string;
    expiresAt: string;
    acceptedAt?: string | null;
  }>> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('workspace_invites')
      .select('id,email,role,token,expires_at,accepted_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      token: row.token,
      expiresAt: row.expires_at,
      acceptedAt: row.accepted_at,
    }));
  },

  async createInvite(
    workspaceId: string,
    email: string,
    role: 'admin' | 'member' | 'viewer'
  ): Promise<{ token: string; expiresAt: string }> {
    if (!supabase) throw new Error('Supabase no está configurado.');

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error('No hay usuario autenticado.');

    const { data, error } = await supabase
      .from('workspace_invites')
      .upsert(
        {
          workspace_id: workspaceId,
          email: email.trim().toLowerCase(),
          role,
          invited_by: user.id,
          accepted_at: null,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        { onConflict: 'workspace_id,email' }
      )
      .select('token,expires_at')
      .single();

    if (error) throw error;

    return {
      token: data.token,
      expiresAt: data.expires_at,
    };
  },

  async acceptInvite(token: string): Promise<string> {
    if (!supabase) throw new Error('Supabase no está configurado.');

    const { data, error } = await supabase.rpc('accept_workspace_invite', {
      invite_token: token,
    });

    if (error) throw error;
    return data as string;
  },

  async updateMemberRole(
    workspaceId: string,
    userId: string,
    role: 'admin' | 'member' | 'viewer'
  ): Promise<void> {
    if (!supabase) return;

    const { error } = await supabase
      .from('workspace_members')
      .update({ role })
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    if (!supabase) return;

    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  async saveSeoAudit(params: {
    workspaceId: string;
    businessId: string;
    requestedUrl: string;
    finalUrl?: string;
    httpStatus?: number;
    responseTimeMs?: number;
    seoScore?: number | null;
    webScore?: number | null;
    overallScore?: number | null;
    unresolvedIssues?: number;
    payload: unknown;
  }): Promise<void> {
    if (!supabase) return;

    const { error } = await supabase.from('seo_audits').insert({
      workspace_id: params.workspaceId,
      business_id: params.businessId,
      requested_url: params.requestedUrl,
      final_url: params.finalUrl || null,
      http_status: params.httpStatus ?? null,
      response_time_ms: params.responseTimeMs ?? null,
      seo_score: params.seoScore ?? null,
      web_score: params.webScore ?? null,
      overall_score: params.overallScore ?? null,
      unresolved_issues: params.unresolvedIssues ?? 0,
      payload: params.payload,
    });

    if (error) throw error;
  },

  async loadLatestSeoAudit(workspaceId: string, businessId: string): Promise<any | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('seo_audits')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  },

  async saveSearchConsoleSnapshot(params: {
    workspaceId: string;
    businessId: string;
    siteUrl: string;
    periodStart: string;
    periodEnd: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    payload: unknown;
  }): Promise<void> {
    if (!supabase) return;

    const { error } = await supabase.from('search_console_snapshots').insert({
      workspace_id: params.workspaceId,
      business_id: params.businessId,
      site_url: params.siteUrl,
      period_start: params.periodStart,
      period_end: params.periodEnd,
      clicks: params.clicks,
      impressions: params.impressions,
      ctr: params.ctr,
      position: params.position,
      payload: params.payload,
    });

    if (error) throw error;
  },

  async upsertActionTasks(workspaceId: string, businessId: string, tasks: any[]): Promise<void> {
    if (!supabase || tasks.length === 0) return;

    const rows = tasks.map((task) => ({
      workspace_id: workspaceId,
      business_id: businessId,
      source_key: task.id,
      title: task.title,
      priority: task.priority,
      status: task.status,
      payload: task,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('action_tasks')
      .upsert(rows, { onConflict: 'business_id,source_key' });

    if (error) throw error;
  },

  async upsertOpportunities(workspaceId: string, businessId: string, opportunities: any[]): Promise<void> {
    if (!supabase) return;

    const { error: deleteError } = await supabase
      .from('opportunities')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('business_id', businessId);

    if (deleteError) throw deleteError;
    if (opportunities.length === 0) return;

    const rows = opportunities.map((opportunity) => ({
      workspace_id: workspaceId,
      business_id: businessId,
      source_key: opportunity.id,
      source: opportunity.source || 'seo-audit',
      payload: opportunity,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('opportunities').insert(rows);
    if (error) throw error;
  },

  async loadBusinessState(workspaceId: string, businessId: string): Promise<{
    audit: any | null;
    auditHistory: any[];
    tasks: any[];
    opportunities: any[];
    searchConsole: any | null;
    searchHistory: any[];
    keywords: any[];
  }> {
    if (!supabase) {
      return {
        audit: null,
        auditHistory: [],
        tasks: [],
        opportunities: [],
        searchConsole: null,
        searchHistory: [],
        keywords: [],
      };
    }

    const [
      audit,
      auditHistoryResult,
      tasksResult,
      opportunitiesResult,
      searchResult,
      searchHistoryResult,
    ] = await Promise.all([
      this.loadLatestSeoAudit(workspaceId, businessId),
      supabase
        .from('seo_audits')
        .select('created_at,overall_score,seo_score,web_score,unresolved_issues')
        .eq('workspace_id', workspaceId)
        .eq('business_id', businessId)
        .order('created_at', { ascending: true })
        .limit(24),
      supabase
        .from('action_tasks')
        .select('payload')
        .eq('workspace_id', workspaceId)
        .eq('business_id', businessId)
        .order('updated_at', { ascending: true }),
      supabase
        .from('opportunities')
        .select('payload')
        .eq('workspace_id', workspaceId)
        .eq('business_id', businessId)
        .order('updated_at', { ascending: true }),
      supabase
        .from('search_console_snapshots')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('search_console_snapshots')
        .select('created_at,clicks,impressions,ctr,position')
        .eq('workspace_id', workspaceId)
        .eq('business_id', businessId)
        .order('created_at', { ascending: true })
        .limit(24),
    ]);

    if (auditHistoryResult.error) throw auditHistoryResult.error;
    if (tasksResult.error) throw tasksResult.error;
    if (opportunitiesResult.error) throw opportunitiesResult.error;
    if (searchResult.error) throw searchResult.error;
    if (searchHistoryResult.error) throw searchHistoryResult.error;

    const latestSearch: any = searchResult.data || null;

    return {
      audit,
      auditHistory: (auditHistoryResult.data || []).map((row: any) => ({
        auditedAt: row.created_at,
        overallScore: Number(row.overall_score || 0),
        seoScore: Number(row.seo_score || 0),
        webScore: Number(row.web_score || 0),
        unresolvedIssues: Number(row.unresolved_issues || 0),
      })),
      tasks: (tasksResult.data || []).map((row: any) => row.payload),
      opportunities: (opportunitiesResult.data || []).map((row: any) => row.payload),
      searchConsole: latestSearch,
      searchHistory: (searchHistoryResult.data || []).map((row: any) => ({
        loadedAt: row.created_at,
        clicks: Number(row.clicks || 0),
        impressions: Number(row.impressions || 0),
        ctr: Number(row.ctr || 0),
        position: Number(row.position || 0),
      })),
      keywords: Array.isArray(latestSearch?.payload?.keywords)
        ? latestSearch.payload.keywords
        : [],
    };
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
