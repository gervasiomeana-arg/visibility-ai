import { calendarDay, publicProfileUrl, validatePublicSnapshot, type PublicNetwork, type PublicSocialProfile } from './socialMetrics';
import { isUnverifiedSeed } from './socialMonthly';

/** Public counts are cumulative at capture time, not interactions occurring within the publication window. */
export function analyzePublicProfile(network: PublicNetwork, profile: PublicSocialProfile, start: string, end: string) {
  if (!calendarDay(start) || !calendarDay(end) || start > end) throw new Error('Período inválido.');
  const canonical = publicProfileUrl(network, profile.profileUrl);
  const snapshots = profile.confirmed ? profile.snapshots.filter(s => {
    try { validatePublicSnapshot(network, s); return !isUnverifiedSeed(s.id) && publicProfileUrl(network, s.profileUrl) === canonical && s.capturedAt.slice(0,10) >= start && s.capturedAt.slice(0,10) <= end; } catch { return false; }
  }).sort((a,b) => Date.parse(a.capturedAt)-Date.parse(b.capturedAt)) : [];
  const latest = snapshots.at(-1);
  // Analyze one observation only: adding repeated captures would double-count posts and mix ages.
  const posts = latest?.posts.filter(p => p.publishedAt >= start && p.publishedAt <= end) || [];
  const complete = posts.filter(p => p.likes !== undefined && p.comments !== undefined);
  const average = complete.length ? complete.reduce((sum,p) => sum+p.likes!+p.comments!,0)/complete.length : null;
  const followers = latest?.followers;
  const rate = average !== null && followers !== undefined && followers > 0 ? average/followers*100 : null;
  const followerSnapshots = snapshots.filter(s => s.followers !== undefined);
  const first = followerSnapshots[0], last = followerSnapshots.at(-1);
  const growth = first && last && first.capturedAt.slice(0,10) !== last.capturedAt.slice(0,10) ? last.followers!-first.followers! : null;
  const days = (Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000+1;
  const topPosts = [...complete].sort((a,b) => (b.likes!+b.comments!)-(a.likes!+a.comments!) || a.url.localeCompare(b.url)).slice(0,5);
  const periodCovered = !!latest && latest.periodStart <= start && latest.periodEnd >= end;
  const availableComplete = !!latest && periodCovered && latest.coverage?.status === 'complete-available';
  const coverageReasons = { exhausted:'Recorrido agotado y cantidad de publicaciones conciliada con la API.', 'page-limit':'Se alcanzó el límite de cinco páginas por consulta.', 'time-limit':'Se alcanzó el límite de tiempo.', 'provider-error':'El proveedor interrumpió el recorrido; se conservó lo verificado.', 'invalid-media':'Hubo publicaciones que no pudieron validarse.', 'missing-media':'La respuesta no incluyó una lista de publicaciones verificable.', 'invalid-cursor':'La paginación no entregó un cursor válido o repitió uno.', 'count-mismatch':'La cantidad recuperada no coincide con el total de la cuenta, o el total cambió durante la consulta.' };
  const coverageNote = latest ? (!periodCovered ? 'La captura se obtuvo para otra ventana de publicación; no acredita cobertura del período elegido.' : latest.coverage ? coverageReasons[latest.coverage.reason] : 'La captura no registra un recorrido completo; se trata como muestra parcial.') : 'Todavía no hay una captura verificable dentro del período.';
  const recommendations: string[] = [];
  if (!latest) recommendations.push('Consultá este perfil dentro del período para obtener una primera medición verificable.');
  else {
    if (!posts.length) recommendations.push('La respuesta no incluyó publicaciones del período. No permite concluir que la cuenta estuvo inactiva. Probá un período reciente o revisá las publicaciones en el perfil.');
    else if (!complete.length) recommendations.push('Hay publicaciones identificadas, pero faltan Me gusta o comentarios verificables. Revisá esos recuentos antes de comparar interacción.');
    else recommendations.push(`Revisá las ${Math.min(2,topPosts.length)} publicaciones con más Me gusta + comentarios de la muestra. Identificá su tema y formato y probá una pieza similar; compará resultados con la misma antigüedad.`);
    if (complete.length && complete.length < posts.length) recommendations.push(`Solo ${complete.length} de ${posts.length} publicaciones tienen ambos recuentos. La media excluye las incompletas; no representa toda la cuenta.`);
    if (growth === null) recommendations.push('Registrá otra medición en una fecha posterior para calcular crecimiento real de seguidores.');
  }
  return { latest, posts, availableComplete, coverageNote, sampledPosts: posts.length, measuredPosts: complete.length, averageInteractions: average, engagementRate: rate,
    observedPostsPerWeek: posts.length ? posts.length/days*7 : null, growth, growthStart: growth !== null ? first!.capturedAt : undefined,
    growthEnd: growth !== null ? last!.capturedAt : undefined, topPosts, recommendations };
}
