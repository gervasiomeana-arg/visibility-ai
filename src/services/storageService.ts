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
};

export const storageService = {
  getBusinesses(): Business[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.BUSINESSES);
      if (stored) return JSON.parse(stored);
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
    return INITIAL_EXECUTIVE_ISSUES[businessId] || INITIAL_EXECUTIVE_ISSUES['biz-hotel-mdp'];
  },

  getSeoAudit(): SeoAuditItem[] {
    return INITIAL_SEO_AUDIT;
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
    return INITIAL_KEYWORDS[businessId] || INITIAL_KEYWORDS['biz-hotel-mdp'];
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
    return INITIAL_COMPETITORS[businessId] || INITIAL_COMPETITORS['biz-hotel-mdp'];
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
    return INITIAL_OPPORTUNITIES[businessId] || INITIAL_OPPORTUNITIES['biz-hotel-mdp'];
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
    return INITIAL_ACTION_TASKS[businessId] || INITIAL_ACTION_TASKS['biz-hotel-mdp'];
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
    return INITIAL_EVOLUTION[businessId] || INITIAL_EVOLUTION['biz-hotel-mdp'];
  },
};
