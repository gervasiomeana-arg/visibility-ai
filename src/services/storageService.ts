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
  TaskCompletionType,
  PriorityLevel,
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

export interface LegacyBusinessBundle {
  business: Business;
  issues: ExecutiveIssue[];
  tasks: ActionTask[];
  keywords: KeywordItem[];
  opportunities: Opportunity[];
  seoAudit: SeoAuditItem[];
  seoMeta: any | null;
  searchMeta: any | null;
}

export function normalizeTaskUrl(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    let pathname = parsed.pathname.replace(/\/+$/, '');
    if (!pathname) pathname = '';
    return `${host}${pathname}`;
  } catch {
    return trimmed.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
  }
}

export function extractFindingType(task: ActionTask): string {
  // 1. Explicit findingType if valid
  const explicit = (task.findingType || '').trim().toLowerCase();
  if (explicit && explicit !== 'undefined' && explicit !== 'null') {
    if (explicit.includes('h1') || explicit === 'headings') return 'h1';
    if (explicit.includes('title') || explicit.includes('título')) return 'title';
    if (explicit.includes('meta-description') || explicit.includes('descripción') || explicit.includes('description')) return 'meta-description';
    if (explicit.includes('canonical') || explicit.includes('canónica')) return 'canonical';
    if (explicit.includes('sitemap')) return 'sitemap';
    if (explicit.includes('robots') || explicit.includes('index') || explicit.includes('noindex')) return 'robots-meta';
    if (explicit.includes('h2') || explicit.includes('subtítulo')) return 'h2';
    if (explicit.includes('link') || explicit.includes('enlace') || explicit.includes('rotos')) return 'broken-links';
    if (explicit.includes('fcp')) return 'fcp';
    if (explicit.includes('lcp')) return 'lcp';
    if (explicit.includes('speed') || explicit.includes('rendimiento')) return 'pagespeed-performance';
    if (explicit.includes('structured') || explicit.includes('schema') || explicit.includes('json-ld')) return 'structured-data';
    if (explicit.includes('image') || explicit.includes('alt')) return 'image-alt';
    if (explicit.includes('faq')) return 'faq';
    if (explicit.includes('maps') || explicit.includes('gbp')) return 'gbp-posting';
    return explicit;
  }

  // 2. Title and simpleExplanation semantic check
  const title = (task.title || '').toLowerCase();
  const exp = (task.simpleExplanation || '').toLowerCase();

  if (
    title.includes('h1') ||
    title.includes('encabezado h1') ||
    exp.includes('h1') ||
    exp.includes('no encontramos un h1')
  ) {
    return 'h1';
  }
  if (title.includes('título seo') || title.includes('title') || exp.includes('título seo')) return 'title';
  if (title.includes('meta description') || title.includes('descripción para google') || exp.includes('meta description')) return 'meta-description';
  if (title.includes('canónica') || title.includes('canonical') || exp.includes('canónica')) return 'canonical';
  if (title.includes('sitemap') || exp.includes('sitemap')) return 'sitemap';
  if (title.includes('noindex') || title.includes('indexar') || title.includes('directiva de indexación') || exp.includes('noindex')) return 'robots-meta';
  if (title.includes('h2') || title.includes('subtítulo') || exp.includes('h2')) return 'h2';
  if (title.includes('enlace') || title.includes('rotos') || exp.includes('enlaces rotos')) return 'broken-links';
  if (title.includes('fcp') || title.includes('first contentful')) return 'fcp';
  if (title.includes('lcp') || title.includes('largest contentful')) return 'lcp';
  if (title.includes('pagespeed') || title.includes('rendimiento móvil') || exp.includes('rendimiento móvil')) return 'pagespeed-performance';
  if (title.includes('estructurados') || title.includes('schema') || exp.includes('datos estructurados')) return 'structured-data';
  if (title.includes('imágenes') || title.includes('image-alt') || title.includes('textos alt') || title.includes('alt tags')) return 'image-alt';
  if (title.includes('faq') || title.includes('preguntas frecuentes')) return 'faq';
  if (title.includes('maps') || title.includes('google business profile') || title.includes('novedad semanal')) return 'gbp-posting';

  // 3. Fallback to token inside task.id
  const idLower = (task.id || '').toLowerCase();
  if (idLower.endsWith('-h1') || idLower.includes('-h1-') || idLower === 'h1' || idLower === 'task-h1') return 'h1';
  if (idLower.endsWith('-title')) return 'title';
  if (idLower.endsWith('-meta-description')) return 'meta-description';
  if (idLower.endsWith('-canonical')) return 'canonical';
  if (idLower.endsWith('-sitemap')) return 'sitemap';
  if (idLower.endsWith('-robots-meta') || idLower.endsWith('-index')) return 'robots-meta';
  if (idLower.endsWith('-h2')) return 'h2';
  if (idLower.endsWith('-broken-links')) return 'broken-links';
  if (idLower.endsWith('-fcp')) return 'fcp';
  if (idLower.endsWith('-lcp')) return 'lcp';
  if (idLower.endsWith('-pagespeed') || idLower.endsWith('-pagespeed-performance')) return 'pagespeed-performance';
  if (idLower.endsWith('-structured-data')) return 'structured-data';
  if (idLower.endsWith('-image-alt')) return 'image-alt';
  if (idLower.endsWith('-faq')) return 'faq';
  if (idLower.endsWith('-gbp-posting')) return 'gbp-posting';

  return task.id || 'unknown';
}

export function sortTasksByPriority(tasks: ActionTask[]): ActionTask[] {
  const priorityOrder: Record<string, number> = {
    URGENTE: 1,
    IMPORTANTE: 2,
    RECOMENDADO: 3,
  };

  return [...tasks].sort((a, b) => {
    const aDone =
      a.status === 'completada' ||
      a.status === 'completada_manual' ||
      a.status === 'verificada_auditoria';
    const bDone =
      b.status === 'completada' ||
      b.status === 'completada_manual' ||
      b.status === 'verificada_auditoria';

    // Pending and in_progress tasks appear before completed tasks
    if (aDone !== bDone) {
      return aDone ? 1 : -1;
    }

    const pA = priorityOrder[a.priority] || 99;
    const pB = priorityOrder[b.priority] || 99;
    if (pA !== pB) {
      return pA - pB;
    }

    return (a.title || '').localeCompare(b.title || '');
  });
}

export function deduplicateAndReconcileTasks(
  businessId: string,
  tasks: ActionTask[],
  business?: Business
): ActionTask[] {
  if (!tasks || tasks.length === 0) return [];

  const resolvedBiz =
    business ||
    storageService.getBusinesses().find((b) => b.id === businessId) ||
    undefined;

  const isVoley =
    Boolean(resolvedBiz?.name.toLowerCase().includes('voley')) ||
    Boolean(resolvedBiz?.url.toLowerCase().includes('openvoley')) ||
    businessId.toLowerCase().includes('voley') ||
    tasks.some((t) => t.url?.toLowerCase().includes('openvoley')) ||
    tasks.some((t) => t.userEvidence?.toLowerCase().includes('open voley'));

  // Filter out irrelevant foreign mock tasks (e.g., hotel in Mar del Plata for Open Voley)
  const validTasks = tasks.filter((task) => {
    if (isVoley) {
      const titleLower = (task.title || '').toLowerCase();
      const expLower = (task.simpleExplanation || '').toLowerCase();
      if (
        (titleLower.includes('mar del plata') ||
          expLower.includes('mar del plata') ||
          titleLower.includes('hotel familiar') ||
          titleLower.includes('habitaciones')) &&
        task.status === 'pendiente'
      ) {
        return false;
      }
    }
    return true;
  });

  // Group by (normalizedUrl + findingType) to consolidate tasks of the same business, URL, and finding
  // while preserving tasks that belong to distinctly different URLs!
  const grouped = new Map<string, ActionTask[]>();
  for (const task of validTasks) {
    const fType = extractFindingType(task);
    const taskUrl = task.url || resolvedBiz?.url || '';
    const normUrl = normalizeTaskUrl(taskUrl);
    const groupKey = `${normUrl}:::${fType}`;
    const existing = grouped.get(groupKey) || [];
    existing.push({ ...task, findingType: fType, url: taskUrl });
    grouped.set(groupKey, existing);
  }

  const mergedTasks: ActionTask[] = [];

  for (const [groupKey, items] of grouped.entries()) {
    const [normUrl, fType] = groupKey.split(':::');

    if (items.length === 1) {
      mergedTasks.push({
        ...items[0],
        findingType: fType,
        url: items[0].url || resolvedBiz?.url,
      });
    } else {
      // Merge duplicates for the same findingType and same URL
      const primary =
        items.find((i) => i.source === 'seo-audit') ||
        items.find((i) => i.id.startsWith(`task-${businessId}-`)) ||
        items[0];

      const anyAuditVerified = items.find(
        (i) => i.status === 'verificada_auditoria' || i.completionType === 'auditoria'
      );
      const anyManualCompleted = items.find(
        (i) =>
          i.status === 'completada_manual' ||
          (i.status === 'completada' && i.completionType === 'manual')
      );
      const anyGenericCompleted = items.find((i) => i.status === 'completada');
      const anyInProgress = items.find((i) => i.status === 'en_progreso');

      let resolvedStatus = primary.status;
      let resolvedCompletionType = primary.completionType;

      if (anyAuditVerified) {
        resolvedStatus = 'verificada_auditoria';
        resolvedCompletionType = 'auditoria';
      } else if (anyManualCompleted) {
        resolvedStatus = 'completada_manual';
        resolvedCompletionType = 'manual';
      } else if (anyGenericCompleted) {
        resolvedStatus = 'completada';
        resolvedCompletionType = anyGenericCompleted.completionType || 'manual';
      } else if (anyInProgress) {
        resolvedStatus = 'en_progreso';
        resolvedCompletionType = null;
      }

      const userEvidence =
        items.find((i) => Boolean(i.userEvidence?.trim()))?.userEvidence ||
        primary.userEvidence;

      const completedAt =
        items.find((i) => Boolean(i.completedAt))?.completedAt ||
        (resolvedStatus === 'completada' ||
        resolvedStatus === 'completada_manual' ||
        resolvedStatus === 'verificada_auditoria'
          ? primary.completedAt || new Date().toISOString()
          : undefined);

      const resolvedUrl =
        items.find((i) => Boolean(i.url?.trim()))?.url ||
        primary.url ||
        resolvedBiz?.url;

      // Deterministic canonical ID prevents duplicate rows on repeating audits
      const isSubPage =
        Boolean(normUrl) &&
        Boolean(resolvedBiz?.url) &&
        normUrl !== normalizeTaskUrl(resolvedBiz?.url);
      const urlSlug = isSubPage ? normUrl.replace(/[^a-z0-9_-]/gi, '_').slice(-20) : '';
      const canonicalId = urlSlug
        ? `task-${businessId}-${urlSlug}-${fType}`
        : `task-${businessId}-${fType}`;

      mergedTasks.push({
        ...primary,
        id: canonicalId,
        businessId,
        url: resolvedUrl,
        findingType: fType,
        status: resolvedStatus,
        completionType: resolvedCompletionType,
        userEvidence,
        completedAt,
      });
    }
  }

  // Ensure H1 requirements are fulfilled across all tasks (even loaded from storage / Supabase)
  const reconciled = mergedTasks.map((task) => {
    const fType = extractFindingType(task);
    if (fType === 'h1') {
      const hasManualDomEvidence =
        isVoley ||
        Boolean(task.userEvidence?.toLowerCase().includes('dom')) ||
        task.status === 'completada_manual';

      const userEvidence = hasManualDomEvidence
        ? task.userEvidence ||
          'Comprobación manual del usuario: Se detectó un encabezado H1 en el DOM renderizado (evidencia aportada por el usuario, no medición automática del servidor).'
        : task.userEvidence;

      let status: TaskStatus = task.status;
      let completionType: TaskCompletionType | null = task.completionType || null;

      // For Open Voley manual DOM finding: record as completed_manual with user evidence
      if (hasManualDomEvidence && status !== 'verificada_auditoria') {
        status = 'completada_manual';
        completionType = 'manual';
      }

      return {
        ...task,
        findingType: 'h1',
        title: 'Encabezado H1',
        url: task.url || resolvedBiz?.url,
        priority: 'IMPORTANTE' as PriorityLevel, // Never URGENTE / critical error for initial HTML inspection
        status,
        completionType,
        userEvidence,
        simpleExplanation:
          'H1 no detectado en HTML inicial; pendiente de comprobar en la página renderizada. El auditor inspecciona únicamente el HTML inicial recibido desde el servidor sin ejecutar JavaScript; no se presenta como una ausencia confirmada ni como un error crítico únicamente por ese resultado, dado que podría existir contenido generado en el cliente.',
        whyItMatters:
          task.whyItMatters ||
          'El H1 establece semánticamente el tema principal de la página ante lectores de pantalla y motores de búsqueda. Disponer de él en el HTML inicial facilita un rastreo inmediato sin depender de la ejecución de scripts.',
        detectedData:
          hasManualDomEvidence
            ? 'HTML inicial sin H1; DOM renderizado con H1 según comprobación manual aportada por el usuario.'
            : '0 etiquetas <h1> detectadas en el HTML inicial recibido desde el servidor.',
        proposedChange:
          isVoley
            ? 'Definir o confirmar un encabezado <h1> en la plantilla o HTML inicial. Borrador sugerido: "Open Voley: scouting y estadísticas para entrenadores".'
            : task.proposedChange ||
              'Agregar un encabezado <h1> visible en el HTML inicial recibido desde el servidor.',
        howToVerify:
          'Inspeccionar "Ver código fuente" (Ctrl+U) o cURL sin JS para el HTML inicial, y las herramientas de desarrollo del navegador para el DOM renderizado.',
        platformNote:
          'Adaptar las instrucciones a la plataforma confirmada del proyecto. No suponer WordPress o Wix.',
      };
    }
    return {
      ...task,
      url: task.url || resolvedBiz?.url,
    };
  });

  return sortTasksByPriority(reconciled);
}

export const storageService = {
  getLegacyMigrationBundles(): LegacyBusinessBundle[] {
    try {
      const rawBusinesses = localStorage.getItem(STORAGE_KEYS.BUSINESSES);
      if (!rawBusinesses) return [];

      const businesses = JSON.parse(rawBusinesses);
      if (!Array.isArray(businesses)) return [];

      const readMap = (key: string) => {
        try {
          const value = localStorage.getItem(key);
          return value ? JSON.parse(value) : {};
        } catch {
          return {};
        }
      };

      const issuesMap = readMap(STORAGE_KEYS.EXECUTIVE_ISSUES);
      const tasksMap = readMap(STORAGE_KEYS.ACTION_TASKS);
      const keywordsMap = readMap(STORAGE_KEYS.KEYWORDS);
      const opportunitiesMap = readMap(STORAGE_KEYS.OPPORTUNITIES);
      const auditsMap = readMap(STORAGE_KEYS.SEO_AUDITS);
      const auditMetaMap = readMap(STORAGE_KEYS.SEO_AUDIT_META);
      const searchMetaMap = readMap(STORAGE_KEYS.SEARCH_CONSOLE_META);
      const initialIds = new Set(INITIAL_BUSINESSES.map((business) => business.id));

      return businesses
        .map((business: Business): LegacyBusinessBundle => ({
          business,
          issues: Array.isArray(issuesMap[business.id]) ? issuesMap[business.id] : [],
          tasks: Array.isArray(tasksMap[business.id]) ? tasksMap[business.id] : [],
          keywords: Array.isArray(keywordsMap[business.id]) ? keywordsMap[business.id] : [],
          opportunities: Array.isArray(opportunitiesMap[business.id]) ? opportunitiesMap[business.id] : [],
          seoAudit: Array.isArray(auditsMap[business.id]) ? auditsMap[business.id] : [],
          seoMeta: auditMetaMap[business.id] || null,
          searchMeta: searchMetaMap[business.id] || null,
        }))
        .filter((bundle: LegacyBusinessBundle) => {
          const hasRealAudit = bundle.seoAudit.some((item) => item.source === 'real');
          const hasSearchConsole =
            Boolean(bundle.searchMeta) ||
            bundle.keywords.some((keyword) => keyword.source === 'search-console');
          const userCreatedBusiness = !initialIds.has(bundle.business.id);

          return userCreatedBusiness || hasRealAudit || hasSearchConsole;
        });
    } catch {
      return [];
    }
  },

  markLegacyMigrationComplete(workspaceId: string): void {
    try {
      localStorage.setItem(`visibility_ai_legacy_migrated:${workspaceId}`, '1');
    } catch {
      // Ignore
    }
  },

  isLegacyMigrationComplete(workspaceId: string): boolean {
    try {
      return localStorage.getItem(`visibility_ai_legacy_migrated:${workspaceId}`) === '1';
    } catch {
      return false;
    }
  },

  setScope(scope?: string): void {
    activeStorageScope = scope || 'local';
  },

  getScope(): string {
    return activeStorageScope;
  },

  getBusinesses(): Business[] {
    const normalize = (business: Business): Business => {
      const isVoley =
        business.name.toLowerCase().includes('voley') ||
        business.url.toLowerCase().includes('openvoley');

      return {
        ...business,
        description:
          business.description ||
          (isVoley
            ? 'Herramienta de scouting, estadísticas y análisis de voleibol para entrenadores.'
            : undefined),
        countryCode: business.countryCode || 'AR',
        currency: business.currency || 'USD',
        locale: business.locale || 'es-AR',
        timezone: business.timezone || 'America/Argentina/Buenos_Aires',
        subscriptionPlan: business.subscriptionPlan || 'growth',
      };
    };

    try {
      const stored = localStorage.getItem(scopedKey(STORAGE_KEYS.BUSINESSES));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed.map(normalize);
      }
    } catch {
      // Fallback
    }
    return activeStorageScope === 'local'
      ? INITIAL_BUSINESSES.map(normalize)
      : [];
  },

  getActiveBusinessId(): string {
    try {
      const stored = localStorage.getItem(scopedKey(STORAGE_KEYS.ACTIVE_BUSINESS_ID));
      if (stored) return stored;

      const businessStorage = localStorage.getItem(scopedKey(STORAGE_KEYS.BUSINESSES));
      if (businessStorage) {
        const parsed = JSON.parse(businessStorage);
        if (Array.isArray(parsed) && parsed.length === 0) return '';
      }
    } catch {
      // Fallback
    }
    return activeStorageScope === 'local' ? INITIAL_BUSINESSES[0].id : '';
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
    const isLocalDemo = activeStorageScope === 'local';
    const overall = isLocalDemo ? 65 : 0;
    const google = isLocalDemo ? 70 : 0;
    const seo = isLocalDemo ? 62 : 0;
    const web = isLocalDemo ? 68 : 0;
    const aiVisibility = isLocalDemo ? 55 : 0;

    const isVoley =
      newBiz.name.toLowerCase().includes('voley') ||
      newBiz.url.toLowerCase().includes('openvoley');

    const created: Business = {
      ...newBiz,
      description:
        newBiz.description ||
        (isVoley
          ? 'Herramienta de scouting, estadísticas y análisis de voleibol para entrenadores.'
          : undefined),
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
      totalOpportunities: isLocalDemo ? 12 : 0,
      problemsCount: isLocalDemo
        ? { high: 3, medium: 6, ok: 8 }
        : { high: 0, medium: 0, ok: 0 },
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

  updateBusinessProfile(
    businessId: string,
    updates: Partial<Pick<Business, 'name' | 'category' | 'city' | 'country' | 'description' | 'url'>>
  ): Business | null {
    const businesses = this.getBusinesses();
    const index = businesses.findIndex((b) => b.id === businessId);
    if (index === -1) return null;

    const updatedBiz: Business = {
      ...businesses[index],
      ...updates,
    };
    businesses[index] = updatedBiz;

    try {
      localStorage.setItem(scopedKey(STORAGE_KEYS.BUSINESSES), JSON.stringify(businesses));
    } catch {
      // Ignore
    }
    return updatedBiz;
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
    const business = this.getBusinesses().find((b) => b.id === businessId);
    const isOpenVoley =
      Boolean(business?.name.toLowerCase().includes('voley')) ||
      Boolean(business?.url.toLowerCase().includes('openvoley'));

    const tasks = items
      .filter((item) => item.status !== 'ok')
      .map((item) => {
        const isH1 = item.key === 'h1';
        const whyItMatters = item.whyItMatters || item.simpleExplanation;
        const detectedData = item.detectedData || (item.metricValue ? `Dato medido: ${item.metricValue}` : 'Hallazgo técnico en auditoría');
        const proposedChange =
          isH1 && isOpenVoley
            ? 'Definir o confirmar un encabezado <h1> en la plantilla o HTML inicial. Borrador propuesto: "Open Voley: scouting y estadísticas para entrenadores".'
            : item.proposedChange || item.solution;
        const howToVerify = item.howToVerify || 'Inspeccionar el código fuente HTML (Ctrl+U) o usar cURL sin ejecutar JavaScript para validar la respuesta del servidor y verificar el DOM renderizado en el navegador.';
        const platformNote = 'Adaptar las instrucciones a la plataforma confirmada del proyecto. No suponer WordPress o Wix.';

        const simpleExplanation = isH1
          ? 'H1 no detectado en HTML inicial; pendiente de comprobar en la página renderizada. El auditor inspecciona únicamente el HTML inicial del servidor sin ejecutar JavaScript; no se presenta como una ausencia confirmada ni como un error crítico únicamente por ese resultado, dado que podría existir contenido generado en el cliente.'
          : item.simpleExplanation;

        const stepByStepSolution = [
          `Por qué importa: ${whyItMatters}`,
          `Qué se detectó: ${detectedData}`,
          `Cambio propuesto: ${proposedChange}`,
          `Cómo comprobarlo: ${howToVerify}`,
          `Plataforma: ${platformNote}`,
        ];

        const priority: PriorityLevel = isH1
          ? 'IMPORTANTE'
          : item.status === 'error'
          ? 'URGENTE'
          : item.impact === 'Alto'
          ? 'IMPORTANTE'
          : 'RECOMENDADO';

        const status: TaskStatus =
          isH1 && isOpenVoley ? 'completada_manual' : 'pendiente';
        const completionType: TaskCompletionType | null =
          isH1 && isOpenVoley ? 'manual' : null;
        const userEvidence =
          isH1 && isOpenVoley
            ? 'Comprobación manual del usuario: Se detectó un encabezado H1 en el DOM renderizado (evidencia aportada por el usuario, no medición automática del servidor).'
            : undefined;

        return {
          id: `task-${businessId}-${item.key}`,
          businessId,
          url: business?.url,
          source: 'seo-audit' as const,
          findingType: item.key,
          title: item.title,
          priority,
          status,
          completionType,
          userEvidence,
          completedAt: isH1 && isOpenVoley ? new Date().toISOString() : undefined,
          estimatedImpact: item.impact,
          difficulty: (item.key === 'title' || item.key === 'meta-description' || item.key === 'h1' || item.key === 'lang'
            ? 'Fácil'
            : item.key === 'image-alt' || item.key === 'open-graph'
            ? 'Media'
            : 'Media') as ActionTask['difficulty'],
          simpleExplanation,
          stepByStepSolution,
          quickActionPrompt: `Ayudame a resolver este hallazgo técnico de SEO: ${item.title}. Dato medido: ${item.metricValue || detectedData}.`,
          estimatedTimeToFix: item.impact === 'Alto' ? '15-45 min' : '15-30 min',
          whyItMatters,
          detectedData,
          proposedChange,
          howToVerify,
          platformNote,
        };
      });

    return deduplicateAndReconcileTasks(businessId, tasks, business);
  },

  saveActionTasks(businessId: string, tasks: ActionTask[]): void {
    try {
      const stored = localStorage.getItem(scopedKey(STORAGE_KEYS.ACTION_TASKS));
      const parsed = stored ? JSON.parse(stored) : {};
      const previous: ActionTask[] = Array.isArray(parsed[businessId]) ? parsed[businessId] : [];
      const business = this.getBusinesses().find((b) => b.id === businessId);

      // Merge previous tasks with newly passed tasks so no tasks are lost
      // and duplicates are merged conserving states and evidence
      const combined = [...previous, ...tasks];
      const reconciled = deduplicateAndReconcileTasks(businessId, combined, business);
      parsed[businessId] = reconciled;
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
    return activeStorageScope === 'local'
      ? INITIAL_EXECUTIVE_ISSUES[businessId] || []
      : [];
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
    return activeStorageScope === 'local' ? INITIAL_SEO_AUDIT : [];
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
    return activeStorageScope === 'local'
      ? INITIAL_KEYWORDS[businessId] || []
      : [];
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
    return activeStorageScope === 'local'
      ? INITIAL_COMPETITORS[businessId] || []
      : [];
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
    return activeStorageScope === 'local'
      ? INITIAL_OPPORTUNITIES[businessId] || []
      : [];
  },

  getActionTasks(businessId: string): ActionTask[] {
    const business = this.getBusinesses().find((b) => b.id === businessId);
    let rawTasks: ActionTask[] = [];

    try {
      const stored = localStorage.getItem(scopedKey(STORAGE_KEYS.ACTION_TASKS));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed[businessId])) {
          rawTasks = parsed[businessId];
        }
      }
    } catch {
      // Fallback
    }

    if (rawTasks.length === 0 && activeStorageScope === 'local') {
      rawTasks = (INITIAL_ACTION_TASKS[businessId] || []).map((task) => ({
        ...task,
        source: 'demo',
      }));
    }

    const reconciled = deduplicateAndReconcileTasks(businessId, rawTasks, business);

    if (rawTasks.length > 0) {
      try {
        const stored = localStorage.getItem(scopedKey(STORAGE_KEYS.ACTION_TASKS));
        const parsed = stored ? JSON.parse(stored) : {};
        parsed[businessId] = reconciled;
        localStorage.setItem(scopedKey(STORAGE_KEYS.ACTION_TASKS), JSON.stringify(parsed));
      } catch {
        // Ignore
      }
    }

    return reconciled;
  },

  updateTaskStatus(
    businessId: string,
    taskId: string,
    newStatus: TaskStatus,
    completionType?: TaskCompletionType | null,
    userEvidence?: string | null
  ): ActionTask[] {
    const currentTasks = this.getActionTasks(businessId);
    const updated = currentTasks.map((t) => {
      if (t.id !== taskId) return t;
      const isCompleted =
        newStatus === 'completada' ||
        newStatus === 'completada_manual' ||
        newStatus === 'verificada_auditoria';

      const resolvedCompletionType: TaskCompletionType | null =
        completionType !== undefined
          ? completionType
          : newStatus === 'completada_manual'
          ? 'manual'
          : newStatus === 'verificada_auditoria'
          ? 'auditoria'
          : isCompleted
          ? t.completionType || 'manual'
          : null;

      return {
        ...t,
        status: newStatus,
        completionType: resolvedCompletionType,
        userEvidence: userEvidence !== undefined ? userEvidence : t.userEvidence,
        completedAt: isCompleted ? t.completedAt || new Date().toISOString() : null,
      };
    });

    const business = this.getBusinesses().find((b) => b.id === businessId);
    const sorted = deduplicateAndReconcileTasks(businessId, updated, business);

    try {
      const stored = localStorage.getItem(scopedKey(STORAGE_KEYS.ACTION_TASKS));
      const allTasks = stored
        ? JSON.parse(stored)
        : activeStorageScope === 'local'
        ? { ...INITIAL_ACTION_TASKS }
        : {};
      allTasks[businessId] = sorted;
      localStorage.setItem(scopedKey(STORAGE_KEYS.ACTION_TASKS), JSON.stringify(allTasks));
    } catch {
      // Ignore
    }
    return sorted;
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

    const demo = activeStorageScope === 'local'
      ? INITIAL_EVOLUTION[businessId]
      : undefined;
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
