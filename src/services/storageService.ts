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
};

export const storageService = {
  getBusinesses(): Business[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.BUSINESSES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return INITIAL_BUSINESSES;
  },

  getActiveBusinessId(): string {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_BUSINESS_ID);
      if (stored) return stored;
    } catch {
      // Fallback
    }
    return INITIAL_BUSINESSES[0].id;
  },

  setActiveBusinessId(id: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_BUSINESS_ID, id);
    } catch {
      // Ignore
    }
  },

  getActiveBusiness(): Business {
    const list = this.getBusinesses();
    const activeId = this.getActiveBusinessId();
    return list.find((b) => b.id === activeId) || list[0] || INITIAL_BUSINESSES[0];
  },

  addBusiness(newBiz: Omit<Business, 'id' | 'createdAt' | 'scores' | 'totalOpportunities' | 'problemsCount'>): Business {
    const businesses = this.getBusinesses();
    const id = `biz-${Date.now()}`;
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
      localStorage.setItem(STORAGE_KEYS.BUSINESSES, JSON.stringify(updated));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_BUSINESS_ID, id);
    } catch {
      // Ignore
    }
    return created;
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
      localStorage.setItem(STORAGE_KEYS.BUSINESSES, JSON.stringify(businesses));
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

  saveIssues(businessId: string, issues: ExecutiveIssue[]): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.EXECUTIVE_ISSUES);
      const parsed = stored ? JSON.parse(stored) : {};
      parsed[businessId] = issues;
      localStorage.setItem(STORAGE_KEYS.EXECUTIVE_ISSUES, JSON.stringify(parsed));
    } catch {
      // Ignore
    }
  },

  getIssues(businessId: string): ExecutiveIssue[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.EXECUTIVE_ISSUES);
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
      const stored = localStorage.getItem(STORAGE_KEYS.SEO_AUDITS);
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
      const stored = localStorage.getItem(STORAGE_KEYS.SEO_AUDITS);
      const parsed = stored ? JSON.parse(stored) : {};
      parsed[businessId] = items;
      localStorage.setItem(STORAGE_KEYS.SEO_AUDITS, JSON.stringify(parsed));

      if (meta !== undefined) {
        const storedMeta = localStorage.getItem(STORAGE_KEYS.SEO_AUDIT_META);
        const parsedMeta = storedMeta ? JSON.parse(storedMeta) : {};
        parsedMeta[businessId] = meta;
        localStorage.setItem(STORAGE_KEYS.SEO_AUDIT_META, JSON.stringify(parsedMeta));
      }
    } catch {
      // Ignore
    }
  },

  getSeoAuditMeta(businessId: string): any | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SEO_AUDIT_META);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      return parsed[businessId] || null;
    } catch {
      return null;
    }
  },

  getKeywords(businessId: string): KeywordItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.KEYWORDS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed[businessId]) return parsed[businessId];
      }
    } catch {
      // Fallback
    }
    return INITIAL_KEYWORDS[businessId] || [];
  },

  getCompetitors(businessId: string): Competitor[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.COMPETITORS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed[businessId]) return parsed[businessId];
      }
    } catch {
      // Fallback
    }
    return INITIAL_COMPETITORS[businessId] || [];
  },

  getOpportunities(businessId: string): Opportunity[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.OPPORTUNITIES);
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
      const stored = localStorage.getItem(STORAGE_KEYS.ACTION_TASKS);
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
      const stored = localStorage.getItem(STORAGE_KEYS.ACTION_TASKS);
      const allTasks = stored ? JSON.parse(stored) : { ...INITIAL_ACTION_TASKS };
      allTasks[businessId] = updated;
      localStorage.setItem(STORAGE_KEYS.ACTION_TASKS, JSON.stringify(allTasks));
    } catch {
      // Ignore
    }
    return updated;
  },

  getEvolution(businessId: string): MonthlyEvolution {
    return INITIAL_EVOLUTION[businessId] || {
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
