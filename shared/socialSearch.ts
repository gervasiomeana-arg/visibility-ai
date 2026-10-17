import {
  calendarDay,
  metricDefinitions,
  networkNames,
  publicProfileUrl,
  type PublicNetwork,
  type PublicSnapshot,
  type SocialAccount,
  type SocialMeasurement,
  type SocialMetric,
  type SocialNetwork,
} from './socialMetrics';
import { publicValue, type PublicMetric } from './publicSocialAnalysis';

export interface MonthPeriod {
  key: string; // '2026-09'
  label: string; // 'Septiembre 2026'
  shortLabel: string; // 'Sep 2026'
  monthName: string; // 'Septiembre'
  year: number; // 2026
  monthNumber: number; // 9 (1-12)
  startDate: string; // '2026-09-01'
  endDate: string; // '2026-09-30'
}

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function getMonthPeriod(yearMonth: string): MonthPeriod {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth.trim());
  if (!match) {
    throw new Error('Formato de mes no válido. Usá AAAA-MM (ej. 2026-09).');
  }
  const year = parseInt(match[1], 10);
  const monthNumber = parseInt(match[2], 10);
  if (monthNumber < 1 || monthNumber > 12) {
    throw new Error('Número de mes inválido (1-12).');
  }

  // Days in month calculation (UTC)
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const monthStr = String(monthNumber).padStart(2, '0');
  const startDate = `${year}-${monthStr}-01`;
  const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

  if (!calendarDay(startDate) || !calendarDay(endDate)) {
    throw new Error('Rango de fechas de mes inválido.');
  }

  const monthName = MONTH_NAMES_ES[monthNumber - 1];

  return {
    key: `${year}-${monthStr}`,
    label: `${monthName} ${year}`,
    shortLabel: `${monthName.slice(0, 3)} ${year}`,
    monthName,
    year,
    monthNumber,
    startDate,
    endDate,
  };
}

export function listRecentMonths(count = 12, referenceDate = new Date()): MonthPeriod[] {
  const result: MonthPeriod[] = [];
  const currentYear = referenceDate.getUTCFullYear();
  const currentMonth = referenceDate.getUTCMonth() + 1; // 1-12

  for (let i = 0; i < count; i++) {
    let targetYear = currentYear;
    let targetMonth = currentMonth - i;
    while (targetMonth <= 0) {
      targetMonth += 12;
      targetYear -= 1;
    }
    const key = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
    result.push(getMonthPeriod(key));
  }
  return result;
}

export type SearchableMetric = 'views' | 'reach' | 'followers' | 'interactions' | 'posts';

export const SEARCHABLE_METRICS_INFO: Record<SearchableMetric, {
  label: string;
  verb: string; // 'te vieron', 'alcanzaste a', 'seguidores', etc.
  description: string;
  unit: string;
}> = {
  views: {
    label: 'Visualizaciones ("Te vieron")',
    verb: 'te vieron',
    description: 'Visualizaciones de videos y reproducciones observadas en el período',
    unit: 'visualizaciones',
  },
  reach: {
    label: 'Alcance ("Personas alcanzadas")',
    verb: 'te vieron',
    description: 'Cuentas únicas que vieron tu contenido en el período',
    unit: 'personas',
  },
  followers: {
    label: 'Seguidores',
    verb: 'seguidores acumulados',
    description: 'Recuento de seguidores observados en ese mes',
    unit: 'seguidores',
  },
  interactions: {
    label: 'Interacciones (Likes + Comentarios)',
    verb: 'interacciones registradas',
    description: 'Reacciones, Me gusta y comentarios del período',
    unit: 'interacciones',
  },
  posts: {
    label: 'Publicaciones del mes',
    verb: 'publicaciones realizadas',
    description: 'Cantidad de publicaciones o videos publicados en el mes',
    unit: 'publicaciones',
  },
};

export interface NetworkSearchResult {
  network: SocialNetwork;
  networkName: string;
  profileUrl: string;
  hasAccount: boolean;
  metric: SearchableMetric;
  value: number | null;
  formattedValue: string;
  source: 'official-api' | 'manual' | 'public-web' | 'manual-public' | 'google-search-console' | 'none';
  sourceLabel: string;
  evidence: string;
  capturedAt?: string;
  isLeader?: boolean;
  percentageOfMax?: number;
}

export interface SocialSearchResponse {
  businessId: string;
  businessName: string;
  period: MonthPeriod;
  metric: SearchableMetric;
  networks: NetworkSearchResult[];
  totalValue: number;
  leaderNetwork: NetworkSearchResult | null;
  summaryText: string;
  competitorsData: CompetitorSearchComparison[];
}

export interface CompetitorSearchComparison {
  role: 'competitor-1' | 'competitor-2';
  name: string;
  networks: {
    network: PublicNetwork;
    profileUrl: string;
    value: number | null;
    formattedValue: string;
    source: string;
  }[];
}

/**
 * Searches and extracts metrics for a specific month and business across Instagram, Facebook and TikTok.
 */
export function searchSocialMetrics(
  businessId: string,
  businessName: string,
  accounts: SocialAccount[],
  monthKey: string,
  metric: SearchableMetric = 'views',
  selectedNetworks: SocialNetwork[] = ['instagram', 'facebook', 'tiktok']
): SocialSearchResponse {
  const period = getMonthPeriod(monthKey);
  const info = SEARCHABLE_METRICS_INFO[metric];

  const networkResults: NetworkSearchResult[] = selectedNetworks.map((network) => {
    const account = accounts.find((a) => a.network === network);
    const netName = networkNames[network] || network;

    if (!account) {
      return {
        network,
        networkName: netName,
        profileUrl: '',
        hasAccount: false,
        metric,
        value: null,
        formattedValue: 'Sin perfil',
        source: 'none',
        sourceLabel: 'Sin perfil registrado',
        evidence: '',
      };
    }

    // 1. Look in measurements (manual or official-api)
    // Priority: measurement explicitly matching the periodStart and periodEnd
    const periodMeasurements = account.measurements.filter((m) => {
      if (m.network !== network) return false;
      // Match period
      if (m.periodStart === period.startDate && m.periodEnd === period.endDate) return true;
      if (m.periodStart && m.periodStart.startsWith(period.key)) return true;
      if (m.capturedAt && m.capturedAt.startsWith(period.key)) return true;
      return false;
    }).sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt));

    let foundValue: number | null = null;
    let foundSource: NetworkSearchResult['source'] = 'none';
    let foundEvidence = '';
    let foundCapturedAt = '';

    for (const m of periodMeasurements) {
      // Check metric mapping
      let val: number | undefined;
      if (metric === 'views') {
        val = m.metrics.views ?? (network === 'facebook' ? m.metrics.reach : undefined);
      } else if (metric === 'reach') {
        val = m.metrics.reach ?? m.metrics.views;
      } else if (metric === 'followers') {
        val = m.metrics.followers;
      } else if (metric === 'interactions') {
        val = m.metrics.interactions;
      } else if (metric === 'posts') {
        val = m.metrics.posts;
      }

      if (val !== undefined && Number.isSafeInteger(val)) {
        foundValue = val;
        foundSource = m.source;
        foundEvidence = m.evidence;
        foundCapturedAt = m.capturedAt;
        break;
      }
    }

    // 2. If not found in measurements, look in publicProfiles (snapshots)
    if (foundValue === null && account.publicProfiles) {
      const ownProfile = account.publicProfiles.find((p) => p.role === 'own' && p.confirmed);
      if (ownProfile) {
        // Find snapshots in that month
        const monthlySnapshots = ownProfile.snapshots.filter((s) => {
          if (s.periodStart === period.startDate && s.periodEnd === period.endDate) return true;
          if (s.periodStart && s.periodStart.startsWith(period.key)) return true;
          if (s.capturedAt && s.capturedAt.startsWith(period.key)) return true;
          return false;
        }).sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt));

        for (const s of monthlySnapshots) {
          if (metric === 'followers' && s.followers !== undefined) {
            foundValue = s.followers;
            foundSource = s.source;
            foundEvidence = s.evidence;
            foundCapturedAt = s.capturedAt;
            break;
          }
          if (metric === 'posts') {
            const count = s.totalPosts ?? s.posts?.length;
            if (count !== undefined) {
              foundValue = count;
              foundSource = s.source;
              foundEvidence = s.evidence;
              foundCapturedAt = s.capturedAt;
              break;
            }
          }
          if (metric === 'views' && s.posts?.length) {
            const viewsSum = s.posts.reduce((sum, p) => sum + (p.views || 0), 0);
            if (viewsSum > 0 || s.posts.some((p) => p.views === 0)) {
              foundValue = viewsSum;
              foundSource = s.source;
              foundEvidence = s.evidence;
              foundCapturedAt = s.capturedAt;
              break;
            }
          }
          if (metric === 'interactions' && s.posts?.length) {
            const interSum = s.posts.reduce(
              (sum, p) => sum + ((p.likes || 0) + (p.comments || 0)),
              0
            );
            if (interSum > 0 || s.posts.some((p) => p.likes === 0 || p.comments === 0)) {
              foundValue = interSum;
              foundSource = s.source;
              foundEvidence = s.evidence;
              foundCapturedAt = s.capturedAt;
              break;
            }
          }
        }

        // For cumulative followers, if no snapshot fell directly in this month, use latest available
        if (metric === 'followers' && foundValue === null) {
          const latestSnap = [...ownProfile.snapshots]
            .filter((s) => s.followers !== undefined)
            .sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt))[0];
          if (latestSnap && latestSnap.followers !== undefined) {
            foundValue = latestSnap.followers;
            foundSource = latestSnap.source;
            foundEvidence = latestSnap.evidence;
            foundCapturedAt = latestSnap.capturedAt;
          }
        }
      }
    }

    let sourceLabel = 'Sin medición';
    if (foundSource === 'manual') sourceLabel = 'Medición manual con informe';
    else if (foundSource === 'official-api') sourceLabel = 'API oficial';
    else if (foundSource === 'public-web') sourceLabel = 'HTML público verificado';
    else if (foundSource === 'manual-public') sourceLabel = 'Observación pública con evidencia';
    else if (foundSource === 'google-search-console') sourceLabel = 'Google Search Console';

    return {
      network,
      networkName: netName,
      profileUrl: account.profileUrl,
      hasAccount: true,
      metric,
      value: foundValue,
      formattedValue: foundValue !== null ? foundValue.toLocaleString('es-AR') : 'Sin medición',
      source: foundSource,
      sourceLabel,
      evidence: foundEvidence,
      capturedAt: foundCapturedAt,
    };
  });

  // Calculate maximum for bar percentage scaling
  const validValues = networkResults.map((r) => r.value).filter((v): v is number => v !== null);
  const maxValue = Math.max(1, ...validValues);
  const totalValue = validValues.reduce((sum, v) => sum + v, 0);

  // Set percentage and leader
  let leader: NetworkSearchResult | null = null;
  let maxFound = -1;

  for (const r of networkResults) {
    if (r.value !== null) {
      r.percentageOfMax = Math.round((r.value / maxValue) * 100);
      if (r.value > maxFound) {
        maxFound = r.value;
        leader = r;
      }
    } else {
      r.percentageOfMax = 0;
    }
  }

  if (leader && maxFound > 0) {
    leader.isLeader = true;
  }

  // Generate natural language summary sentence requested by user:
  // "por ejemplo, buscar la metrica de tal cliente, del mes de septiembre, y ver como resultado en instagram te vieron tantos en facebook tantos, etc"
  const summaryParts: string[] = [];
  for (const r of networkResults) {
    if (r.value !== null) {
      summaryParts.push(`en ${r.networkName} ${info.verb} ${r.formattedValue}`);
    } else {
      summaryParts.push(`en ${r.networkName} sin medición registrada`);
    }
  }

  const summaryText = summaryParts.length
    ? `Para ${businessName} en ${period.label.toLowerCase()}: ${summaryParts.join(', ')}.`
    : `No hay datos para ${businessName} en ${period.label}.`;

  // Competitor comparison data
  const competitorsData: CompetitorSearchComparison[] = [];
  for (const role of ['competitor-1', 'competitor-2'] as const) {
    const compNetworks: CompetitorSearchComparison['networks'] = [];
    let compName = '';

    for (const net of ['facebook', 'instagram', 'tiktok'] as const) {
      const account = accounts.find((a) => a.network === net);
      const profile = account?.publicProfiles?.find((p) => p.role === role && p.confirmed);
      if (!profile) continue;
      if (!compName && profile.name) compName = profile.name;

      const monthlySnap = profile.snapshots.find(
        (s) => (s.periodStart && s.periodStart.startsWith(period.key)) || (s.capturedAt && s.capturedAt.startsWith(period.key))
      );

      const snapToUse =
        monthlySnap ||
        (metric === 'followers'
          ? [...profile.snapshots]
              .filter((s) => s.followers !== undefined)
              .sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt))[0]
          : undefined);

      let val: number | null = null;
      if (snapToUse) {
        if (metric === 'followers') val = snapToUse.followers ?? null;
        else if (metric === 'posts') val = snapToUse.totalPosts ?? snapToUse.posts?.length ?? null;
        else if (metric === 'views' && snapToUse.posts?.length) {
          val = snapToUse.posts.reduce((s, p) => s + (p.views || 0), 0) || null;
        } else if (metric === 'interactions' && snapToUse.posts?.length) {
          val = snapToUse.posts.reduce((s, p) => s + ((p.likes || 0) + (p.comments || 0)), 0) || null;
        }
      }

      compNetworks.push({
        network: net,
        profileUrl: profile.profileUrl,
        value: val,
        formattedValue: val !== null ? val.toLocaleString('es-AR') : 'Sin medición',
        source: monthlySnap?.source || 'none',
      });
    }

    if (compNetworks.length > 0) {
      competitorsData.push({
        role,
        name: compName || (role === 'competitor-1' ? 'Competidor 1' : 'Competidor 2'),
        networks: compNetworks,
      });
    }
  }

  return {
    businessId,
    businessName,
    period,
    metric,
    networks: networkResults,
    totalValue,
    leaderNetwork: leader,
    summaryText,
    competitorsData,
  };
}
