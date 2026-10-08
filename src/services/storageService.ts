import {
  Business,
  ExecutiveIssue,
  SeoAuditItem,
  KeywordItem,
  Competitor,
  Opportunity,
  ActionTask,
  MonthlyEvolution,
  TaskStatus,
} from '../types';
import {
  INITIAL_BUSINESSES,
  INITIAL_EXECUTIVE_ISSUES,
  INITIAL_SEO_AUDIT,
  INITIAL_KEYWORDS,
  INITIAL_COMPETITORS,
  INITIAL_OPPORTUNITIES,
  INITIAL_ACTION_TASKS,
  INITIAL_EVOLUTION,
} from '../data/mockData';

let activeStorageScope = 'local';

function scopedKey(key: string): string {
  return activeStorageScope === 'local' ? key : `${key}:${activeStorageScope}`;
}

const STORAGE_KEYS = {
  BUSINESSES: 'visibility_ai_businesses',
  ACTIVE_BUSINESS_ID: 'visibility_ai_active_id',
  EXECUTIVE_ISSUES: 'visibility_ai_issues',
  ACTION_TASKS: 'visibility_ai_tasks',
  KEYWORDS: 'visibility_ai_keywords',
  COMPETITORS: 'visibility_ai_competitors',
  OPPORTUNITIES: 'visibility_ai_opportunities',
  SEO_AUDITS: 'visibility_ai_seo_audits',
  SEO_AUDIT_META: 'visibility_ai_seo_audit_meta',
  AUDIT_HISTORY: 'visibility_ai_audit_history',
  SEARCH_CONSOLE_META: 'visibility_ai_search_console_meta',
  SEARCH_CONSOLE_HISTORY: 'visibility_ai_search_console_history',
};

export const storageService = {
  setScope(scope?: string): void {
    activeStorageScope = scope || 'local';
  },

  getScope(): string {
    return activeStorageScope;
  },

  getBusinesses(): Business[] {
    const normalize = (business: Business): Business => ({
      ...business,
      countryCode: business.countryCode || 'AR',
      currency: business.currency || 'USD',
      locale: business.locale || 'es-AR',
      timezone: business.timezone || 'America/Argentina/Buenos_Aires',
      subscriptionPlan: business.subscriptionPlan || 'growth',
    });

    try {
      const stored = localStorage.getItem(scopedKey(STORAGE_KEYS.BUSINESSES));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(normalize);
      }
    } catch {
      // Fallback
    }
    return INITIAL_BUSINESSES.map(normalize);
  },

  getActiveBusinessId(): string {
    try {
      const stored = localStorage.getItem(scopedKey(STORAGE_KEYS.ACTIVE_BUSINESS_ID));
      if (stored) return stored;
    } catch {
      // Fallback
    }
    return INITIAL_BUSINESSES[0].id;
  },

  setActiveBusinessId(id: string): void {
    try {
      localStorage.setItem(scopedKey(STORAGE_KEYS.ACTIVE_BUSINESS_ID), id);
    } catch {
      // Ignore
    }
  },

  getActiveBusiness(): Business {
    const list = this.getBusinesses();
    const activeId = this.getActiveBusinessId();
    return list.find((b) => b.id === activeId) || list[0] || INITIAL_BUSINESSES[0];
  },

  addBusiness(
    newBiz: Omit<Business, 'id' | 'createdAt' | 'scores' | 'totalOpportunities' | 'problemsCount'>,
    explicitId?: string
  ): Business {
    const businesses = this.getBusinesses();
    const id = explicitId || `biz-${Date.now()}`;
    // Phase 1: deterministic DEMO scores only.
    // Real scoring will replace this in Phase 2 once measured signals are available.
    const overall = 65;
    const google = 70;
    const seo = 62;
    const web = 68;
    const aiVisibility = 55;

    const created: Business = {
      ...newBiz,
      id,
      createdAt: new Date().toISOString().split('T')[0],
      scores: {
        overall,
        google,
        seo,
        web,
        aiVisibility,
      },
      scoreSources: {
        overall: 'demo',
        google: 'demo',
        seo: 'demo',
        web: 'demo',
        aiVisibility: 'demo',
      },
      totalOpportunities: 12,
      problemsCount: {
        high: 3,
        medium: 6,
        ok: 8,
      },
    };

    const updated = [created, ...businesses];
    try {
      localStorage.setItem(scopedKey(STORAGE_KEYS.BUSINESSES), JSON.stringify(updated));
      localStorage.setItem(scopedKey(STORAGE_KEYS.ACTIVE_BUSINESS_ID), id);
    } catch {
      // Ignore
    }
    return created;
  },

  syncBusinessesFromRemote(remoteBusinesses: Business[]): Business[] {
    const localBusinesses = this.getBusinesses();
    const localById = new Map(localBusinesses.map((business) => [business.id, business]));

    const merged = remoteBusinesses.map((remote) => {
      const local = localById.get(remote.id);
      return local
        ? {
            ...local,
            ...remote,
            scores: local.scores,
            scoreSources: local.scoreSources,
            totalOpportunities: local.totalOpportunities,
            problemsCount: local.problemsCount,
          }
        : remote;
    });

    try {
      localStorage.setItem(scopedKey(STORAGE_KEYS.BUSINESSES), JSON.stringify(merged));
      if (merged.length > 0) {
        const currentActive = this.getActiveBusinessId();
        if (!merged.some((business) => business.id === currentActive)) {
          localStorage.setItem(scopedKey(STORAGE_KEYS.ACTIVE_BUSINESS_ID), merged[0].id);
        }
      }
    } catch {
      // Ignore
    }

    return merged;
  },

  updateBusinessScores(
    businessId: string,
    patch: Partial<Business['scores']>,
    sourcePatch: Partial<NonNullable<Business['scoreSources']>>
  ): Business | null {
    const businesses = this.getBusinesses();
    const index = businesses.findIndex((business) => business.id === businessId);
    if (index === -1) return null;

    const current = businesses[index];
    const currentSources = current.scoreSources || {
      overall: 'demo' as const,
      google: 'demo' as const,
      seo: 'demo' as const,
      web: 'demo' as const,
      aiVisibility: 'demo' as const,
    };

    const updatedBusiness: Business = {
      ...current,
      scores: { ...current.scores, ...patch },
      scoreSources: { ...currentSources, ...sourcePatch },
    };

    businesses[index] = updatedBusiness;
    try {
      localStorage.setItem(scopedKey(STORAGE_KEYS.BUSINESSES), JSON.stringify(businesses));
    } catch {
      // Ignore
    }

    return updatedBusiness;
  },

  calculateSeoScore(items: SeoAuditItem[]): number | null {
    const realItems = items.filter((item) => item.source === 'real');
    if (!realItems.length) return null;

    const weightForImpact = (impact: SeoAuditItem['impact']) =>
      impact === 'Alto' ? 3 : impact === 'Medio' ? 2 : 1;
    const valueForStatus = (status: SeoAuditItem['status']) =>
      status === 'ok' ? 1 : status === 'warning' ? 0.5 : 0;

    let earned = 0;
    let possible = 0;
    for (const item of realItems) {
      const weight = weightForImpact(item.impact);
      possible += weight;
      earned += weight * valueForStatus(item.status);
    }

    return possible > 0 ? Math.round((earned / possible) * 100) : null;
  },

  buildIssuesFromSeoAudit(businessId: string, items: SeoAuditItem[]): ExecutiveIssue[] {
    const categoryFor = (item: SeoAuditItem): ExecutiveIssue['category'] => {
      if (item.category === 'Velocidad y Móvil') return 'Web';
      if (item.category === 'Seguridad y Datos') return item.key === 'https' || item.key === 'http-status' ? 'Web' : 'SEO';
      return 'SEO';
    };

    return items.map((item) => ({
      id: `issue-${businessId}-${item.key}`,
      businessId,
      name: item.title,
      simpleExplanation: item.simpleExplanation,
      severity: item.status === 'error' ? 'high' : item.status === 'warning' ? 'medium' : 'ok',
      possibleSolution: item.solution,
      category: categoryFor(item),
      impactText:
        item.impact === 'Alto'
          ? 'Este punto puede afectar de forma importante la visibilidad o la experiencia del sitio.'
          : item.impact === 'Medio'
          ? 'Conviene corregirlo para mejorar la calidad técnica y la visibilidad.'
          : 'Es una mejora de menor impacto, pero suma calidad y consistencia.',
      source: 'real',
      checkedAt: item.checkedAt,
    }));
  },

  buildActionTasksFromSeoAudit(businessId: string, items: SeoAuditItem[]): ActionTask[] {
    return items
      .filter((item) => item.status !== 'ok')
      .map((item) => ({
        id: `task-${businessId}-${item.key}`,
        businessId,
        title: item.title,
        priority: item.status === 'error' ? 'URGENTE' : item.impact === 'Alto' ? 'IMPORTANTE' : 'RECOMENDADO',
        status: 'pendiente',
        estimatedImpact: item.impact,
        difficulty: item.key === 'title' || item.key === 'meta-description' || item.key === 'h1' || item.key === 'lang'
          ? 'Fácil'
          : item.key === 'image-alt' || item.key === 'open-graph'
          ? 'Media'
          : 'Media',
        simpleExplanation: item.simpleExplanation,
        stepByStepSolution: [
          item.solution,
          'Aplicá el cambio primero en una página de prueba o entorno controlado.',
          'Volvé a ejecutar Visibility AI para confirmar que el problema quedó resuelto.',
        ],
        quickActionPrompt: `Ayudame a resolver este hallazgo real de SEO: ${item.title}. Dato detectado: ${item.metricValue || 'sin valor adicional'}.`,
        estimatedTimeToFix: item.impact === 'Alto' ? '15-45 min' : '15-30 min',
      }));
  },

  saveActionTasks(businessId: string, tasks: ActionTask[]): void {
    try {
      const stored = localStorage.getItem(scopedKey(STORAGE_KEYS.ACTION_TASKS));
      const parsed = stored ? JSON.parse(stored) : {};
      const previous: ActionTask[] = Array.isArray(parsed[businessId]) ? parsed[businessId] : [];
      const statusById = new Map(previous.map((task) => [task.id, task.status]));

      parsed[businessId] = tasks.map((task) => ({
        ...task,
        status: statusById.get(task.id) || task.status,
      }));
      localStorage.setItem(scopedKey(STORAGE_KEYS.ACTION_TASKS), JSON.stringify(parsed));
    } catch {
      // Ignore
    }
  },

  updateProblemCounts(businessId: string, issues: ExecutiveIssue[]): Business | null {
    const businesses = this.getBusinesses();
    const index = businesses.findIndex((business) => business.id === businessId);
    if (index === -1) return null;

    const current = businesses[index];
    const high = issues.filter((issue) => issue.severity === 'high').length;
    const medium = issues.filter((issue) => issue.severity === 'medium').length;
    const ok = issues.filter((issue) => issue.severity === 'ok').length;

    const updatedBusiness: Business = {
      ...current,
      problemsCount: { high, medium, ok },
      totalOpportunities: high + medium,
    };

    businesses[index] = updatedBusiness;
    try {
      localStorage.setItem(scopedKey(STORAGE_KEYS.BUSINESSES), JSON.stringify(businesses));
    } catch {
      // Ignore
    }
    return updatedBusiness;
  },

  saveIssues(businessId: string, issues: ExecutiveIssue[]): void {
    try {
      const stored = localStorage.getItem(scopedKey(STORAGE_KEYS.EXECUTIVE_ISSUES));
      const parsed = stored ? JSON.parse(stored) : {};
      parsed[businessId] = issues;
      localStorage.setItem(scopedKey(STORAGE_KEYS.EXECUTIVE_ISSUES), JSON.stringify(parsed));
    } catch {
      // Ignore
    }
  },

  getIssues(businessId: string): ExecutiveIssue[] {
    try {
      const stored = localStorage.getItem(scopedKey(STORAGE_KEYS.EXECUTIVE_ISSUES));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed[businessId]) return parsed[businessId];
      }
    } catch {
      // Fallback
    }
    return INITIAL_EXECUTIVE_ISSUES[businessId] || [];
  },

  getSeoAudit(businessId: string): SeoAuditItem[] {
    try {
      const stored = localStorage.getItem(scopedKey(STORAGE_KEYS.SEO_AUDITS));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed[businessId])) return parsed[businessId];
      }
    } catch {
      // Fallback
    }
    return INITIAL_SEO_AUDIT;
  },

  saveSeoAudit(businessId: string, items: SeoAuditItem[], meta?: unknown): void {
    try {
      const stored = localStorage.getItem(scopedKey(STORAGE_KEYS.SEO_AUDITS));
      const parsed = stored ? JSON.parse(stored) : {};
      parsed[businessId] = items;
      localStorage.setItem(scopedKey(STORAGE_KEYS.SEO_AUDITS), JSON.stringify(parsed));

      if (meta !== undefined) {
        const storedMeta = localStorage.getItem(scopedKey(STORAGE_KEYS.SEO_AUDIT_META));
        const parsedMeta = storedMeta ? JSON.parse(storedMeta) : {};
        parsedMeta[businessId] = meta;
        localStorage.setItem(scopedKey(STORAGE_KEYS.SEO_AUDIT_META), JSON.stringify(parsedMeta));
      }
    } catch {
      // Ignore
    }
  },

  getSeoAuditMeta(businessId: string): any | null {
    try {
      const stored = localStorage.getItem(scopedKey(STORAGE_KEYS.SEO_AUDIT_META));
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      return parsed[businessId] || null;
    } catch {
      return null;
    }
  },

  getKeywords(businessId: string): KeywordItem[] {
    try {
      const stored = localStorage.getItem(scopedKey(STORAGE_KEYS.KEYWORDS));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed[businessId]) return parsed[businessId];
      }
    } catch {
      // Fallback
    }
    return INITIAL_KEYWORDS[businessId] || [];
  },

  saveKeywords(businessId: string, keywords: KeywordItem[]): void {
    try {
      const stored = localStorage.getItem(scopedKey(STORAGE_KEYS.KEYWORDS));
      const parsed = stored ? JSON.parse(stored) : {};
      parsed[businessId] = keywords;
      localStorage.setItem(scopedKey(STORAGE_KEYS.KEYWORDS), JSON.stringify(parsed));
    } catch {
      // Ignore
    }
  },

  saveSearchConsoleMeta(
    businessId: string,
    meta: {
      siteUrl: string;
      startDate: string;
      endDate: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
      loadedAt: string;
    }
  ): void {
    try {
      const stored = localStorage.getItem(scopedKey(STORAGE_KEYS.SEARCH_CONSOLE_META));
      const parsed = stored ? JSON.parse(stored) : {};
      parsed[businessId] = meta;
      localStorage.setItem(scopedKey(STORAGE_KEYS.SEARCH_CONSOLE_META), JSON.stringify(parsed));
    } catch {
      // Ignore
    }
  },

  saveSearchConsoleHistoryPoint(
    businessId: string,
    point: {
      loadedAt: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }
  ): void {
    try {
      const stored = localStorage.getItem(scopedKey(STORAGE_KEYS.SEARCH_CONSOLE_HISTORY));
      const parsed = stored ? JSON.parse(stored) : {};
      const current = Array.isArray(parsed[businessId]) ? parsed[businessId] : [];
      const pointDay = new Date(point.loadedAt).toISOString().slice(0, 10);
      const withoutSameDay = current.filter(
        (entry: any) => new Date(entry.loadedAt).toISOString().slice(0, 10) !== pointDay
      );

      parsed[businessId] = [...withoutSameDay, point]
        .sort((a: any, b: any) => new Date(a.loadedAt).getTime() - new Date(b.loadedAt).getTime())
        .slice(-24);

      localStorage.setItem(scopedKey(STORAGE_KEYS.SEARCH_CONSOLE_HISTORY), JSON.stringify(parsed));
    } catch {
      // Ignore
    }
  },

  getSearchConsoleHistory(businessId: string): Array<{
    loadedAt: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }> {
    try {
      const stored = localStorage.getItem(scopedKey(STORAGE_KEYS.SEARCH_CONSOLE_HISTORY));
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed[businessId]) ? parsed[businessId] : [];
    } catch {
      return [];
    }
  },

  getSearchConsoleMeta(businessId: string): any | null {
    try {
      const stored = localStorage.getItem(scopedKey(STORAGE_KEYS.SEARCH_CONSOLE_META));
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      return parsed[businessId] || null;
    } catch {
      return null;
    }
  },

  getCompetitors(businessId: string): Competitor[] {
    try {
      const stored = localStorage.getItem(scopedKey(STORAGE_KEYS.COMPETITORS));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed[businessId]) return parsed[businessId];
      }
    } catch {
      // Fallback
    }
    return INITIAL_COMPETITORS[businessId] || [];
  },

  buildOpportunitiesFromSeoAudit(business: Business, items: SeoAuditItem[]): Opportunity[] {
    return items
      .filter((item) => item.status !== 'ok')
      .slice(0, 12)
      .map((item) => ({
        id: `seo-${business.id}-${item.key}`,
        businessId: business.id,
        detectedProblem: item.title,
        simpleExplanation: item.simpleExplanation,
        commercialAction: item.solution,
        suggestedPageTitle:
          item.key === 'title' || item.key === 'meta-description' || item.key === 'h1'
            ? `Mejorar la página principal de ${business.name}`
            : `Optimización técnica: ${item.title}`,
        potentialImpact: item.impact === 'Alto' ? 'Muy Alto' : item.impact === 'Medio' ? 'Alto' : 'Medio',
        searchDemand: 'Sin dato de demanda asociado',
        source: 'seo-audit',
        evidenceText: `Auditoría SEO real · ${item.statusLabel}${item.metricValue ? ` · ${item.metricValue}` : ''}`,
        contentParams: {
          contentType:
            item.key === 'meta-description' || item.key === 'title'
              ? 'seo_meta'
              : 'web_page',
          topic: item.title,
          keyword: '',
          city: business.city,
          businessType: business.category,
          goal: 'Resolver un hallazgo técnico verificado y mejorar la visibilidad',
        },
      }));
  },

  replaceOpportunitiesBySource(
    businessId: string,
    source: 'seo-audit' | 'search-console',
    incoming: Opportunity[]
  ): Opportunity[] {
    try {
      const stored = localStorage.getItem(scopedKey(STORAGE_KEYS.OPPORTUNITIES));
      const parsed = stored ? JSON.parse(stored) : {};
      const current: Opportunity[] = Array.isArray(parsed[businessId]) ? parsed[businessId] : [];
      const preserved = current.filter(
        (opp) => opp.source && opp.source !== source && opp.source !== 'demo'
      );
      const combined = [...incoming, ...preserved].slice(0, 20);
      parsed[businessId] = combined;
      localStorage.setItem(scopedKey(STORAGE_KEYS.OPPORTUNITIES), JSON.stringify(parsed));

      const businesses = this.getBusinesses();
      const index = businesses.findIndex((business) => business.id === businessId);
      if (index >= 0) {
        businesses[index] = { ...businesses[index], totalOpportunities: combined.length };
        localStorage.setItem(scopedKey(STORAGE_KEYS.BUSINESSES), JSON.stringify(businesses));
      }

      return combined;
    } catch {
      return incoming;
    }
  },

  buildOpportunitiesFromSearchConsole(business: Business, keywords: KeywordItem[]): Opportunity[] {
    const realRows = keywords
      .filter((kw) => kw.source === 'search-console' && (kw.impressions || 0) > 0)
      .sort((a, b) => (b.impressions || 0) - (a.impressions || 0));

    const opportunities: Opportunity[] = [];

    for (const kw of realRows) {
      const impressions = kw.impressions || 0;
      const ctr = kw.ctr || 0;
      const position = kw.position || 0;

      if (impressions >= 20 && position >= 8 && position <= 20) {
        opportunities.push({
          id: `gsc-near-top-${business.id}-${opportunities.length}`,
          businessId: business.id,
          detectedProblem: `“${kw.keyword}” está cerca de las primeras posiciones`,
          simpleExplanation: `Google mostró tu sitio ${impressions} veces para esta consulta en el período analizado y la posición media fue ${position.toFixed(1)}.`,
          commercialAction: 'Revisar la página que responde a esta búsqueda, reforzar título, encabezados y contenido útil para intentar ganar posiciones.',
          suggestedPageTitle: `Optimizar contenido para “${kw.keyword}”`,
          potentialImpact: impressions >= 100 ? 'Muy Alto' : 'Alto',
          searchDemand: `${impressions} impresiones verificadas`,
          source: 'search-console',
          evidenceText: `Search Console · posición media ${position.toFixed(1)} · ${impressions} impresiones`,
          contentParams: {
            contentType: 'web_page',
            topic: kw.keyword,
            keyword: kw.keyword,
            city: business.city,
            businessType: business.category,
            goal: 'Mejorar la relevancia de una consulta con impresiones reales y acercarla a mejores posiciones',
          },
        });
      }

      if (impressions >= 30 && ctr < 0.03 && position > 0 && position <= 15) {
        opportunities.push({
          id: `gsc-low-ctr-${business.id}-${opportunities.length}`,
          businessId: business.id,
          detectedProblem: `“${kw.keyword}” obtiene impresiones pero pocos clics`,
          simpleExplanation: `La consulta tuvo ${impressions} impresiones y un CTR de ${(ctr * 100).toFixed(1)}% con posición media ${position.toFixed(1)}.`,
          commercialAction: 'Probar un título SEO y una meta description más claros y atractivos, alineados con lo que busca el usuario.',
          suggestedPageTitle: `Mejorar CTR para “${kw.keyword}”`,
          potentialImpact: impressions >= 100 ? 'Muy Alto' : 'Alto',
          searchDemand: `${impressions} impresiones verificadas`,
          source: 'search-console',
          evidenceText: `Search Console · CTR ${(ctr * 100).toFixed(1)}% · ${impressions} impresiones`,
          contentParams: {
            contentType: 'seo_meta',
            topic: kw.keyword,
            keyword: kw.keyword,
            city: business.city,
            businessType: business.category,
            goal: 'Mejorar el porcentaje de clics de una consulta con visibilidad real en Google',
          },
        });
      }

      if (opportunities.length >= 12) break;
    }

    return opportunities.slice(0, 12);
  },

  saveOpportunities(businessId: string, opportunities: Opportunity[]): void {
    try {
      const stored = localStorage.getItem(scopedKey(STORAGE_KEYS.OPPORTUNITIES));
      const parsed = stored ? JSON.parse(stored) : {};
      parsed[businessId] = opportunities;
      localStorage.setItem(scopedKey(STORAGE_KEYS.OPPORTUNITIES), JSON.stringify(parsed));
    } catch {
      // Ignore
    }
  },

  getOpportunities(businessId: string): Opportunity[] {
    try {
      const stored = localStorage.getItem(scopedKey(STORAGE_KEYS.OPPORTUNITIES));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed[businessId]) return parsed[businessId];
      }
    } catch {
      // Fallback
    }
    return INITIAL_OPPORTUNITIES[businessId] || [];
  },

  getActionTasks(businessId: string): ActionTask[] {
    try {
      const stored = localStorage.getItem(scopedKey(STORAGE_KEYS.ACTION_TASKS));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed[businessId]) return parsed[businessId];
      }
    } catch {
      // Fallback
    }
    return INITIAL_ACTION_TASKS[businessId] || [];
  },

  updateTaskStatus(businessId: string, taskId: string, newStatus: TaskStatus): ActionTask[] {
    const currentTasks = this.getActionTasks(businessId);
    const updated = currentTasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t));
    try {
      const stored = localStorage.getItem(scopedKey(STORAGE_KEYS.ACTION_TASKS));
      const allTasks = stored ? JSON.parse(stored) : { ...INITIAL_ACTION_TASKS };
      allTasks[businessId] = updated;
      localStorage.setItem(scopedKey(STORAGE_KEYS.ACTION_TASKS), JSON.stringify(allTasks));
    } catch {
      // Ignore
    }
    return updated;
  },

  saveAuditHistoryPoint(
    businessId: string,
    point: {
      auditedAt: string;
      overallScore: number;
      seoScore: number | null;
      webScore: number | null;
      unresolvedIssues: number;
    }
  ): void {
    try {
      const stored = localStorage.getItem(scopedKey(STORAGE_KEYS.AUDIT_HISTORY));
      const parsed = stored ? JSON.parse(stored) : {};
      const current = Array.isArray(parsed[businessId]) ? parsed[businessId] : [];

      const pointDay = new Date(point.auditedAt).toISOString().slice(0, 10);
      const withoutSameDay = current.filter(
        (entry: any) => new Date(entry.auditedAt).toISOString().slice(0, 10) !== pointDay
      );

      parsed[businessId] = [...withoutSameDay, point]
        .sort((a: any, b: any) => new Date(a.auditedAt).getTime() - new Date(b.auditedAt).getTime())
        .slice(-24);

      localStorage.setItem(scopedKey(STORAGE_KEYS.AUDIT_HISTORY), JSON.stringify(parsed));
    } catch {
      // Ignore
    }
  },

  getAuditHistory(businessId: string): Array<{
    auditedAt: string;
    overallScore: number;
    seoScore: number | null;
    webScore: number | null;
    unresolvedIssues: number;
  }> {
    try {
      const stored = localStorage.getItem(scopedKey(STORAGE_KEYS.AUDIT_HISTORY));
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed[businessId]) ? parsed[businessId] : [];
    } catch {
      return [];
    }
  },

  getEvolution(businessId: string): MonthlyEvolution {
    const history = this.getAuditHistory(businessId);
    const searchHistory = this.getSearchConsoleHistory(businessId);
    if (history.length > 0 || searchHistory.length > 0) {
      const first = history[0];
      const last = history[history.length - 1];
      const visibilityChangePercent =
        first && last && first.overallScore > 0
          ? Math.round(((last.overallScore - first.overallScore) / first.overallScore) * 100)
          : 0;

      const labelDates = history.length > 0
        ? history.map((entry) => entry.auditedAt)
        : searchHistory.map((entry) => entry.loadedAt);

      return {
        source: 'real',
        months: labelDates.map((value) =>
          new Date(value).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: 'short',
          })
        ),
        visibility: history.map((entry) => entry.overallScore),
        googlePositions: [],
        estimatedVisits: [],
        consultations: [],
        fixedProblems: history.length > 0
          ? history.map((entry) => Math.max(0, first.unresolvedIssues - entry.unresolvedIssues))
          : [],
        searchImpressions: searchHistory.map((entry) => entry.impressions),
        searchClicks: searchHistory.map((entry) => entry.clicks),
        searchCtr: searchHistory.map((entry) => Number((entry.ctr * 100).toFixed(2))),
        searchPositions: searchHistory.map((entry) => entry.position),
        searchMonths: searchHistory.map((entry) =>
          new Date(entry.loadedAt).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: 'short',
          })
        ),
        monthComparison: {
          visibilityChangePercent,
          improvedPositionsCount:
            searchHistory.length > 1
              ? Math.max(0, Math.round(searchHistory[0].position - searchHistory[searchHistory.length - 1].position))
              : 0,
          solvedProblemsCount:
            history.length > 1 ? Math.max(0, first.unresolvedIssues - last.unresolvedIssues) : 0,
          newOpportunitiesCount: 0,
          consultationsTotal: 0,
        },
      };
    }

    const demo = INITIAL_EVOLUTION[businessId];
    if (demo) return { ...demo, source: 'demo' };

    return {
      source: 'real',
      months: [],
      visibility: [],
      googlePositions: [],
      estimatedVisits: [],
      consultations: [],
      fixedProblems: [],
      monthComparison: {
        visibilityChangePercent: 0,
        improvedPositionsCount: 0,
        solvedProblemsCount: 0,
        newOpportunitiesCount: 0,
        consultationsTotal: 0,
      },
    };
  },
};
