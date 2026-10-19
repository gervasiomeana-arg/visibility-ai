import { monthlySeries } from './socialMonthly';
import { calendarDay, publicProfileUrl, type SocialAccount, type PublicNetwork } from './socialMetrics';

/** Latest saved follower stock, never a monthly total or an assertion of live access. */
export function socialReportRows(accounts: SocialAccount[], workspaceId: string, businessId: string, today = new Date().toISOString().slice(0,10)) {
  if (!calendarDay(today)) throw new Error('Fecha de informe inválida.');
  return (['instagram','facebook','tiktok','youtube'] as PublicNetwork[]).map(network => {
    const account = accounts.find(a => a.workspaceId === workspaceId && a.businessId === businessId && a.network === network);
    const empty = { network, profileUrl: '', followers: null as number | null, capturedAt: '', source: '', evidence: '', notUsed: account?.presence?.status === 'not-used' };
    if (!account || empty.notUsed) return empty;
    let profileUrl: string;
    try { profileUrl = publicProfileUrl(network, account.profileUrl); } catch { return empty; }
    const dates = [...new Set([
      ...account.measurements.map(m => m.capturedAt?.slice(0,10)),
      ...(account.publicProfiles || []).filter(p => p.role === 'own' && p.confirmed).flatMap(p => p.snapshots.map(s => s.capturedAt?.slice(0,10))),
    ].filter(day => calendarDay(day) && day <= today))].sort().reverse();
    for (const day of dates) {
      const point = monthlySeries(account, network, 'followers', day, day, today)[0];
      if (point.value !== null) return { ...empty, profileUrl, followers: point.value, capturedAt: point.capturedAt!, source: point.source!, evidence: point.evidence! };
    }
    return { ...empty, profileUrl };
  });
}
