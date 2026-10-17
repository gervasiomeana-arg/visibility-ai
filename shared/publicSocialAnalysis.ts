import { publicProfileUrl, type PublicNetwork, type PublicSnapshot, type PublicSocialProfile } from './socialMetrics';
export type PublicMetric = 'followers' | 'samplePosts' | 'averageInteractions' | 'averageViews';
export const publicMetricLabels: Record<PublicMetric, string> = { followers: 'Seguidores observados', samplePosts: 'Publicaciones observadas del período', averageInteractions: 'Me gusta + comentarios por publicación', averageViews: 'Visualizaciones por publicación' };
export function currentPublicSnapshots(network: PublicNetwork, profile: PublicSocialProfile): PublicSnapshot[] {
  return profile.snapshots.filter(s => publicProfileUrl(network, s.profileUrl) === publicProfileUrl(network, profile.profileUrl)).sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt));
}
export function publicValue(snapshot: PublicSnapshot | undefined, metric: PublicMetric): number | null {
  if (!snapshot) return null;
  if (metric === 'followers') return snapshot.followers ?? null;
  if (metric === 'samplePosts') return snapshot.posts.length || null; // An empty sample does not establish no publications.
  const posts = snapshot.posts.filter(post => metric === 'averageViews' ? post.views !== undefined : post.likes !== undefined && post.comments !== undefined);
  if (!posts.length) return null;
  return posts.reduce((sum, post) => sum + (metric === 'averageViews' ? post.views! : post.likes! + post.comments!), 0) / posts.length;
}
export function publicMetricSample(snapshot: PublicSnapshot, metric: PublicMetric) {
  return snapshot.posts.filter(post => metric === 'averageViews' ? post.views !== undefined : metric === 'averageInteractions' ? post.likes !== undefined && post.comments !== undefined : true).length;
}
export function latestPublicSnapshot(network: PublicNetwork, profile: PublicSocialProfile, start: string, end: string, metric: PublicMetric) {
  return currentPublicSnapshots(network, profile).filter(s => (metric === 'followers' || s.periodStart === start && s.periodEnd === end) && publicValue(s, metric) !== null).at(-1);
}
/** Last observed follower count per month; no interpolation or fabricated prior history. */
export function monthlyPublicFollowers(network: PublicNetwork, profile: PublicSocialProfile) {
  const months = new Map<string, PublicSnapshot>();
  for (const snapshot of currentPublicSnapshots(network, profile)) if (snapshot.followers !== undefined) months.set(snapshot.capturedAt.slice(0, 7), snapshot);
  return [...months].sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([month, snapshot]) => ({ month, snapshot, value: snapshot.followers! }));
}
export function publicRecommendations(network: PublicNetwork, profiles: PublicSocialProfile[], start: string, end: string): string[] {
  const own = profiles.find(p => p.role === 'own' && p.confirmed);
  if (!own) return ['Confirmá el perfil del negocio antes de elaborar recomendaciones.'];
  const latest = currentPublicSnapshots(network, own).at(-1);
  if (!latest) return ['Recopilá una primera observación pública del negocio; todavía no hay una base medida.'];
  const output: string[] = [];
  const months = monthlyPublicFollowers(network, own);
  if (months.length < 2) output.push('Guardá una nueva observación el próximo mes para medir evolución: una sola medición no demuestra crecimiento.');
  else {
    const before = months.at(-2)!, now = months.at(-1)!;
    output.push(`Seguidores observados: ${before.value} en ${before.month} y ${now.value} en ${now.month} (diferencia ${now.value - before.value >= 0 ? '+' : ''}${now.value - before.value}). Revisá los contenidos y acciones entre ambas fechas; la diferencia no identifica por sí sola su causa.`);
  }
  const sample = latestPublicSnapshot(network, own, start, end, 'averageInteractions');
  if (sample) {
    const measured = sample.posts.filter(p => p.likes !== undefined && p.comments !== undefined).sort((a, b) => b.likes! + b.comments! - a.likes! - a.comments!);
    const top = measured[0];
    output.push(`Revisá el tema y formato de ${top.url}: obtuvo ${top.likes! + top.comments!} Me gusta + comentarios visibles, el mayor valor de la muestra de ${measured.length} publicaciones. Probá una nueva pieza sobre ese tema y compará su respuesta.`);
    const competitors = profiles.filter(p => p.role !== 'own' && p.confirmed).map(p => ({ p, s: latestPublicSnapshot(network, p, start, end, 'averageInteractions') })).filter(row => row.s && Date.parse(row.s.capturedAt.slice(0, 10)) === Date.parse(sample.capturedAt.slice(0, 10)) && publicMetricSample(row.s, 'averageInteractions') >= 3 && publicMetricSample(sample, 'averageInteractions') >= 3);
    const stronger = competitors.find(row => publicValue(row.s, 'averageInteractions')! > publicValue(sample, 'averageInteractions')!);
    if (stronger) output.push(`${stronger.p.name} presenta una media de Me gusta + comentarios mayor en las muestras del mismo período y día de observación. Revisá sus temas y formatos; el tamaño y la selección de las muestras pueden diferir, por lo que no demuestra mayor alcance ni ventas.`);
  } else output.push('Para recomendar temas y formatos, registrá publicaciones del período con fecha, enlace, Me gusta y comentarios visibles. Los seguidores solos no permiten evaluar el contenido.');
  if (profiles.filter(p => p.role !== 'own' && p.confirmed).length < 2) output.push('Confirmá dos competidores del mismo sector y mercado para completar la comparación.');
  return output;
}

/** A confirmed operator record takes precedence over absence of links in initial HTML. */
export function confirmedSocialDiscovery(account: import('./socialMetrics').SocialAccount | undefined, requestedDomain: string, businessDomain: string) {
  const host = (value: string) => { try { return new URL(/^https:\/\//i.test(value) ? value : `https://${value}`).host.toLowerCase().replace(/^www\./, ''); } catch { return ''; } };
  if (!account || !host(requestedDomain) || host(requestedDomain) !== host(businessDomain)) return null;
  if (account.presence?.status === 'not-used') return { status: 'not-used' as const };
  const own = account.publicProfiles?.find(p => p.role === 'own' && p.confirmed);
  return own ? { status: 'confirmed' as const, profileUrl: own.profileUrl } : null;
}
