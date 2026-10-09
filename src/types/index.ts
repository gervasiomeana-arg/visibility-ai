export type PriorityLevel = 'URGENTE' | 'IMPORTANTE' | 'RECOMENDADO';
export type SeverityLevel = 'high' | 'medium' | 'ok';
export type TaskStatus =
  | 'pendiente'
  | 'en_progreso'
  | 'completada'
  | 'completada_manual'
  | 'verificada_auditoria';
export type TaskCompletionType = 'manual' | 'auditoria';
export type SupportedCountryCode = 'AR' | 'CL' | 'MX' | 'ES' | 'CO' | 'US';
export type SupportedCurrency = 'USD' | 'ARS' | 'CLP' | 'MXN' | 'EUR' | 'COP';
export type SupportedLocale = 'es-AR' | 'es-CL' | 'es-MX' | 'es-ES' | 'es-CO' | 'es-US';
export type SubscriptionPlanId = 'diagnostic' | 'monitor' | 'growth' | 'pro' | 'agency';
export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Workspace {
  id: string;
  name: string;
  slug?: string | null;
  ownerUserId: string;
  planId: SubscriptionPlanId;
  countryCode: SupportedCountryCode;
  currency: SupportedCurrency;
  locale: SupportedLocale;
  timezone: string;
  role?: WorkspaceRole;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
}

export interface BusinessScores {
  overall: number; // e.g. 71/100
  google: number;  // e.g. 82/100
  seo: number;     // e.g. 68/100
  web: number;     // e.g. 79/100
  aiVisibility: number; // e.g. 55/100
}

export interface Business {
  id: string;
  workspaceId?: string;
  name: string;
  url: string;
  category: string;
  city: string;
  country: string;
  description?: string;
  countryCode?: SupportedCountryCode;
  currency?: SupportedCurrency;
  locale?: SupportedLocale;
  timezone?: string;
  subscriptionPlan?: SubscriptionPlanId;
  createdAt: string;
  scores: BusinessScores;
  scoreSources?: {
    overall: 'demo' | 'partial' | 'real';
    google: 'demo' | 'partial' | 'real';
    seo: 'demo' | 'real';
    web: 'demo' | 'real';
    aiVisibility: 'demo' | 'real';
  };
  totalOpportunities: number;
  problemsCount: {
    high: number;
    medium: number;
    ok: number;
  };
}

export interface ExecutiveIssue {
  id: string;
  businessId: string;
  name: string;
  simpleExplanation: string;
  severity: SeverityLevel;
  possibleSolution: string;
  category: 'Google' | 'SEO' | 'Web' | 'Visibilidad IA';
  impactText: string;
  source?: 'real' | 'demo';
  checkedAt?: string;
}

export interface SeoAuditItem {
  id: string;
  key: string;
  title: string;
  category: 'Contenido y On-Page' | 'Técnico e Indexación' | 'Velocidad y Móvil' | 'Seguridad y Datos';
  status: 'ok' | 'warning' | 'error';
  statusLabel: string;
  simpleExplanation: string;
  solution: string;
  impact: 'Alto' | 'Medio' | 'Bajo';
  metricValue?: string;
  source?: 'real' | 'demo';
  checkedAt?: string;
  whyItMatters?: string;
  detectedData?: string;
  proposedChange?: string;
  howToVerify?: string;
}

export interface SeoAuditResult {
  requestedUrl: string;
  finalUrl: string;
  fetchedAt: string;
  httpStatus: number;
  responseTimeMs: number;
  items: SeoAuditItem[];
  pageSpeed?: {
    performanceScore: number | null;
    firstContentfulPaint: { displayValue: string | null; numericValue: number | null; score: number | null };
    largestContentfulPaint: { displayValue: string | null; numericValue: number | null; score: number | null };
    cumulativeLayoutShift: { displayValue: string | null; numericValue: number | null; score: number | null };
    totalBlockingTime: { displayValue: string | null; numericValue: number | null; score: number | null };
    speedIndex: { displayValue: string | null; numericValue: number | null; score: number | null };
    fetchedAt: string;
  } | null;
  pageSpeedError?: string | null;
}

export interface KeywordItem {
  id: string;
  businessId: string;
  keyword: string;
  position: number;
  searchVolume: number;
  difficulty: 'Baja' | 'Media' | 'Alta';
  evolution: number; // +3, -1, 0
  intent: 'Comercial' | 'Informativa' | 'Local' | 'Transaccional';
  url: string;
  source?: 'demo' | 'manual' | 'search-console';
  clicks?: number;
  impressions?: number;
  ctr?: number;
}

export interface Competitor {
  id: string;
  source?: 'demo' | 'real';
  businessId: string;
  name: string;
  url: string;
  visibilityScore: number;
  seoScore: number;
  contentScore: number;
  keywordsCount: number;
  domainAuthority: number;
  localPresenceScore: number;
  isCurrentBusiness?: boolean;
  advantages: string[];
  gaps: string[];
}

export interface Opportunity {
  id: string;
  businessId: string;
  detectedProblem: string;
  simpleExplanation: string;
  commercialAction: string;
  suggestedPageTitle: string;
  potentialImpact: 'Muy Alto' | 'Alto' | 'Medio';
  searchDemand: string;
  source?: 'demo' | 'seo-audit' | 'search-console';
  evidenceText?: string;
  contentParams: {
    contentType: 'web_page' | 'blog_article' | 'service_description' | 'faq' | 'seo_meta' | 'google_post';
    topic: string;
    keyword: string;
    city: string;
    businessType: string;
    goal: string;
  };
}

export interface ActionTask {
  id: string;
  businessId: string;
  url?: string;
  source?: 'demo' | 'seo-audit' | 'manual';
  findingType?: string;
  title: string;
  priority: PriorityLevel;
  status: TaskStatus;
  completionType?: TaskCompletionType | null;
  userEvidence?: string | null;
  completedAt?: string | null;
  estimatedImpact: 'Alto' | 'Medio' | 'Bajo';
  difficulty: 'Fácil' | 'Media' | 'Difícil';
  simpleExplanation: string;
  stepByStepSolution: string[];
  quickActionPrompt?: string;
  estimatedTimeToFix: string;
  whyItMatters?: string;
  detectedData?: string;
  proposedChange?: string;
  howToVerify?: string;
  platformNote?: string;
}

export interface MonthlyEvolution {
  source?: 'real' | 'demo';
  months: string[];
  visibility: number[];
  googlePositions: number[];
  estimatedVisits: number[];
  consultations: number[];
  fixedProblems: number[];
  searchImpressions?: number[];
  searchClicks?: number[];
  searchCtr?: number[];
  searchPositions?: number[];
  searchMonths?: string[];
  monthComparison: {
    visibilityChangePercent: number; // e.g. +12
    improvedPositionsCount: number;   // e.g. 17
    solvedProblemsCount: number;      // e.g. 8
    newOpportunitiesCount: number;    // e.g. 11
    consultationsTotal: number;       // e.g. 34
  };
}

export interface ContentGenerationRequest {
  contentType: 'web_page' | 'blog_article' | 'service_description' | 'faq' | 'seo_meta' | 'google_post';
  topic: string;
  keyword: string;
  city: string;
  businessType: string;
  goal: string;
  tone?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export type ActiveTab =
  | 'landing'
  | 'analyzing'
  | 'dashboard'
  | 'executive-summary'
  | 'seo'
  | 'keywords'
  | 'competitors'
  | 'opportunities'
  | 'assistant'
  | 'content-generator'
  | 'action-plan'
  | 'evolution'
  | 'monthly-report'
  | 'admin';
