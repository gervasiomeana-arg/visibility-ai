import { validateSocialAccount, type SocialAccount } from '../../shared/socialMetrics';

export function isNuevoHorizonte(businessId: string): boolean {
  const id = (businessId || '').toLowerCase();
  return (
    id === 'biz-hotel-nuevohorizonte' ||
    id === 'comp-3' ||
    id.includes('nuevohorizonte') ||
    id.includes('nuevo-horizonte') ||
    id.includes('horizonte')
  );
}

export function getInitialSocialAccounts(workspaceId: string, businessId: string): SocialAccount[] {
  if (isNuevoHorizonte(businessId)) {
    return [
      validateSocialAccount({
        workspaceId,
        businessId,
        network: 'instagram',
        profileUrl: 'https://www.instagram.com/nuevohorizontehotel/',
        accountId: '',
        measurements: [
          {
            id: `m-ig-sep-${businessId}`,
            network: 'instagram',
            profileUrl: 'https://www.instagram.com/nuevohorizontehotel/',
            capturedAt: '2026-09-30',
            source: 'manual',
            evidence: 'Meta Business Suite · Captura confirmada @nuevohorizontehotel · Septiembre 2026',
            periodStart: '2026-09-01',
            periodEnd: '2026-09-30',
            metrics: { views: 5400, reach: 3800, followers: 125, interactions: 410, posts: 4 },
          },
          {
            id: `m-ig-ago-${businessId}`,
            network: 'instagram',
            profileUrl: 'https://www.instagram.com/nuevohorizontehotel/',
            capturedAt: '2026-08-31',
            source: 'manual',
            evidence: 'Meta Business Suite · Captura confirmada @nuevohorizontehotel · Agosto 2026',
            periodStart: '2026-08-01',
            periodEnd: '2026-08-31',
            metrics: { views: 4200, reach: 3100, followers: 118, interactions: 320, posts: 3 },
          },
          {
            id: `m-ig-oct-${businessId}`,
            network: 'instagram',
            profileUrl: 'https://www.instagram.com/nuevohorizontehotel/',
            capturedAt: '2026-10-15',
            source: 'manual',
            evidence: 'Meta Business Suite · Reporte quincenal @nuevohorizontehotel · Octubre 2026',
            periodStart: '2026-10-01',
            periodEnd: '2026-10-15',
            metrics: { views: 2900, reach: 2100, followers: 125, interactions: 250, posts: 2 },
          },
        ],
        publicProfiles: [
          {
            role: 'own',
            name: 'Hotel Nuevo Horizonte Centro',
            profileUrl: 'https://www.instagram.com/nuevohorizontehotel/',
            confirmed: true,
            snapshots: [
              {
                id: `snap-nh-ig-sep-${businessId}`,
                profileUrl: 'https://www.instagram.com/nuevohorizontehotel/',
                capturedAt: '2026-09-30',
                source: 'manual-public',
                evidence: 'Captura confirmada @nuevohorizontehotel en Instagram · 125 seguidores · Septiembre 2026',
                followers: 125,
                totalPosts: 4,
                posts: [
                  { url: 'https://www.instagram.com/p/nh-reel-1/', publishedAt: '2026-09-10', views: 3100, likes: 230, comments: 18 },
                  { url: 'https://www.instagram.com/p/nh-post-2/', publishedAt: '2026-09-22', views: 2300, likes: 180, comments: 14 },
                ],
                periodStart: '2026-09-01',
                periodEnd: '2026-09-30',
              },
              {
                id: `snap-nh-ig-ago-${businessId}`,
                profileUrl: 'https://www.instagram.com/nuevohorizontehotel/',
                capturedAt: '2026-08-31',
                source: 'manual-public',
                evidence: 'Captura confirmada @nuevohorizontehotel en Instagram · 118 seguidores · Agosto 2026',
                followers: 118,
                totalPosts: 3,
                posts: [
                  { url: 'https://www.instagram.com/p/nh-ago-1/', publishedAt: '2026-08-18', views: 2100, likes: 150, comments: 10 },
                ],
                periodStart: '2026-08-01',
                periodEnd: '2026-08-31',
              },
            ],
          },
          {
            role: 'competitor-1',
            name: 'Gran Hotel Bristol',
            profileUrl: 'https://www.instagram.com/granhotelbristol/',
            confirmed: true,
            snapshots: [
              {
                id: `snap-c1-ig-sep-${businessId}`,
                profileUrl: 'https://www.instagram.com/granhotelbristol/',
                capturedAt: '2026-09-30',
                source: 'manual-public',
                evidence: 'Perfil público @granhotelbristol en Instagram · Septiembre 2026',
                followers: 5420,
                totalPosts: 18,
                posts: [
                  { url: 'https://www.instagram.com/p/sep-reel-1/', publishedAt: '2026-09-12', views: 8200, likes: 620, comments: 45 },
                  { url: 'https://www.instagram.com/p/sep-post-2/', publishedAt: '2026-09-24', views: 6650, likes: 490, comments: 38 },
                ],
                periodStart: '2026-09-01',
                periodEnd: '2026-09-30',
              },
            ],
          },
          {
            role: 'competitor-2',
            name: 'Hotel Costa Galana',
            profileUrl: 'https://www.instagram.com/hotelcostagalana/',
            confirmed: true,
            snapshots: [
              {
                id: `snap-c2-ig-sep-${businessId}`,
                profileUrl: 'https://www.instagram.com/hotelcostagalana/',
                capturedAt: '2026-09-29',
                source: 'manual-public',
                evidence: 'Observación de perfil público @hotelcostagalana · Septiembre 2026',
                followers: 18500,
                totalPosts: 22,
                posts: [
                  { url: 'https://www.instagram.com/p/cg-post-1/', publishedAt: '2026-09-10', views: 9800, likes: 780, comments: 55 },
                ],
                periodStart: '2026-09-01',
                periodEnd: '2026-09-30',
              },
            ],
          },
        ],
      }),

      validateSocialAccount({
        workspaceId,
        businessId,
        network: 'facebook',
        profileUrl: '',
        accountId: '',
        measurements: [],
        presence: {
          status: 'not-used',
          confirmedAt: '2026-09-30T12:00:00Z',
          evidence: 'Confirmación explícita del operador: el negocio no tiene página activa de Facebook.',
        },
      }),

      validateSocialAccount({
        workspaceId,
        businessId,
        network: 'tiktok',
        profileUrl: '',
        accountId: '',
        measurements: [],
        presence: {
          status: 'not-used',
          confirmedAt: '2026-09-30T12:00:00Z',
          evidence: 'Confirmación explícita del operador: el negocio no tiene cuenta activa de TikTok.',
        },
      }),
    ];
  }

  if (businessId === 'biz-hotel-mdp') {
    return [
      validateSocialAccount({
        workspaceId,
        businessId,
        network: 'instagram',
        profileUrl: 'https://www.instagram.com/granhotelbristol/',
        accountId: '',
        measurements: [
          {
            id: `m-ig-sep-${businessId}`,
            network: 'instagram',
            profileUrl: 'https://www.instagram.com/granhotelbristol/',
            capturedAt: '2026-09-30',
            source: 'manual',
            evidence: 'Meta Business Suite · Informe mensual de rendimiento septiembre 2026',
            periodStart: '2026-09-01',
            periodEnd: '2026-09-30',
            metrics: { views: 14850, reach: 9200, followers: 5420, interactions: 1680, posts: 18 },
          },
          {
            id: `m-ig-ago-${businessId}`,
            network: 'instagram',
            profileUrl: 'https://www.instagram.com/granhotelbristol/',
            capturedAt: '2026-08-31',
            source: 'manual',
            evidence: 'Meta Business Suite · Informe mensual de rendimiento agosto 2026',
            periodStart: '2026-08-01',
            periodEnd: '2026-08-31',
            metrics: { views: 11200, reach: 7800, followers: 5190, interactions: 1350, posts: 14 },
          },
          {
            id: `m-ig-oct-${businessId}`,
            network: 'instagram',
            profileUrl: 'https://www.instagram.com/granhotelbristol/',
            capturedAt: '2026-10-15',
            source: 'manual',
            evidence: 'Meta Business Suite · Reporte quincenal octubre 2026',
            periodStart: '2026-10-01',
            periodEnd: '2026-10-15',
            metrics: { views: 8400, reach: 5600, followers: 5560, interactions: 920, posts: 9 },
          },
        ],
        publicProfiles: [
          {
            role: 'own',
            name: 'Gran Hotel Bristol',
            profileUrl: 'https://www.instagram.com/granhotelbristol/',
            confirmed: true,
            snapshots: [
              {
                id: 'snap-own-ig-sep',
                profileUrl: 'https://www.instagram.com/granhotelbristol/',
                capturedAt: '2026-09-30',
                source: 'manual-public',
                evidence: 'Perfil público @granhotelbristol en Instagram · Septiembre 2026',
                followers: 5420,
                totalPosts: 18,
                posts: [
                  { url: 'https://www.instagram.com/p/sep-reel-1/', publishedAt: '2026-09-12', views: 8200, likes: 620, comments: 45 },
                  { url: 'https://www.instagram.com/p/sep-post-2/', publishedAt: '2026-09-24', views: 6650, likes: 490, comments: 38 },
                ],
                periodStart: '2026-09-01',
                periodEnd: '2026-09-30',
              },
            ],
          },
          {
            role: 'competitor-1',
            name: 'Hotel Costa Galana',
            profileUrl: 'https://www.instagram.com/hotelcostagalana/',
            confirmed: true,
            snapshots: [
              {
                id: 'snap-c1-ig-sep',
                profileUrl: 'https://www.instagram.com/hotelcostagalana/',
                capturedAt: '2026-09-29',
                source: 'manual-public',
                evidence: 'Observación de perfil público @hotelcostagalana · Septiembre 2026',
                followers: 18500,
                totalPosts: 22,
                posts: [
                  { url: 'https://www.instagram.com/p/cg-post-1/', publishedAt: '2026-09-10', views: 9800, likes: 780, comments: 55 },
                  { url: 'https://www.instagram.com/p/cg-post-2/', publishedAt: '2026-09-22', views: 8400, likes: 690, comments: 42 },
                ],
                periodStart: '2026-09-01',
                periodEnd: '2026-09-30',
              },
            ],
          },
          {
            role: 'competitor-2',
            name: 'Hotel Nuevo Horizonte',
            profileUrl: 'https://www.instagram.com/nuevohorizontehotel/',
            confirmed: true,
            snapshots: [
              {
                id: 'snap-c2-ig-sep',
                profileUrl: 'https://www.instagram.com/nuevohorizontehotel/',
                capturedAt: '2026-09-30',
                source: 'manual-public',
                evidence: 'Observación pública @nuevohorizontehotel en Instagram · 125 seguidores · Septiembre 2026',
                followers: 125,
                totalPosts: 4,
                posts: [
                  { url: 'https://www.instagram.com/p/nh-post-1/', publishedAt: '2026-09-08', views: 2800, likes: 140, comments: 12 },
                  { url: 'https://www.instagram.com/p/nh-post-2/', publishedAt: '2026-09-21', views: 2600, likes: 110, comments: 9 },
                ],
                periodStart: '2026-09-01',
                periodEnd: '2026-09-30',
              },
            ],
          },
        ],
      }),

      validateSocialAccount({
        workspaceId,
        businessId,
        network: 'facebook',
        profileUrl: 'https://www.facebook.com/granhotelbristol/',
        accountId: '',
        measurements: [
          {
            id: `m-fb-sep-${businessId}`,
            network: 'facebook',
            profileUrl: 'https://www.facebook.com/granhotelbristol/',
            capturedAt: '2026-09-30',
            source: 'manual',
            evidence: 'Meta Business Suite · Página oficial Gran Hotel Bristol · Septiembre 2026',
            periodStart: '2026-09-01',
            periodEnd: '2026-09-30',
            metrics: { views: 8920, reach: 11400, followers: 8350, interactions: 740 },
          },
          {
            id: `m-fb-ago-${businessId}`,
            network: 'facebook',
            profileUrl: 'https://www.facebook.com/granhotelbristol/',
            capturedAt: '2026-08-31',
            source: 'manual',
            evidence: 'Meta Business Suite · Página oficial Gran Hotel Bristol · Agosto 2026',
            periodStart: '2026-08-01',
            periodEnd: '2026-08-31',
            metrics: { views: 7400, reach: 9800, followers: 8200, interactions: 610 },
          },
        ],
        publicProfiles: [
          {
            role: 'own',
            name: 'Gran Hotel Bristol',
            profileUrl: 'https://www.facebook.com/granhotelbristol/',
            confirmed: true,
            snapshots: [],
          },
          {
            role: 'competitor-1',
            name: 'Hotel Costa Galana',
            profileUrl: 'https://www.facebook.com/hotelcostagalana/',
            confirmed: true,
            snapshots: [],
          },
          {
            role: 'competitor-2',
            name: 'Hotel Nuevo Horizonte',
            profileUrl: 'https://www.facebook.com/nuevohorizontehotel/',
            confirmed: true,
            snapshots: [],
          },
        ],
      }),

      validateSocialAccount({
        workspaceId,
        businessId,
        network: 'tiktok',
        profileUrl: 'https://www.tiktok.com/@granhotelbristol/',
        accountId: '',
        measurements: [
          {
            id: `m-tt-sep-${businessId}`,
            network: 'tiktok',
            profileUrl: 'https://www.tiktok.com/@granhotelbristol/',
            capturedAt: '2026-09-30',
            source: 'manual',
            evidence: 'TikTok Creator Center · Cuenta Gran Hotel Bristol · Período 01 a 30 sep 2026',
            periodStart: '2026-09-01',
            periodEnd: '2026-09-30',
            metrics: { views: 26400, followers: 3850, likes: 4200, interactions: 2150, posts: 12 },
          },
          {
            id: `m-tt-ago-${businessId}`,
            network: 'tiktok',
            profileUrl: 'https://www.tiktok.com/@granhotelbristol/',
            capturedAt: '2026-08-31',
            source: 'manual',
            evidence: 'TikTok Creator Center · Cuenta Gran Hotel Bristol · Período 01 a 31 ago 2026',
            periodStart: '2026-08-01',
            periodEnd: '2026-08-31',
            metrics: { views: 18900, followers: 3200, likes: 3100, interactions: 1540, posts: 8 },
          },
        ],
        publicProfiles: [
          {
            role: 'own',
            name: 'Gran Hotel Bristol',
            profileUrl: 'https://www.tiktok.com/@granhotelbristol/',
            confirmed: true,
            snapshots: [],
          },
          {
            role: 'competitor-1',
            name: 'Hotel Costa Galana',
            profileUrl: 'https://www.tiktok.com/@hotelcostagalana/',
            confirmed: true,
            snapshots: [],
          },
        ],
      }),
    ];
  }

  if (businessId === 'biz-restaurante-palermo') {
    return [
      validateSocialAccount({
        workspaceId,
        businessId,
        network: 'instagram',
        profileUrl: 'https://www.instagram.com/trattoriadellanonna/',
        accountId: '',
        measurements: [
          {
            id: `m-ig-sep-${businessId}`,
            network: 'instagram',
            profileUrl: 'https://www.instagram.com/trattoriadellanonna/',
            capturedAt: '2026-09-30',
            source: 'manual',
            evidence: 'Meta Business Suite · Trattoria Della Nonna · Septiembre 2026',
            periodStart: '2026-09-01',
            periodEnd: '2026-09-30',
            metrics: { views: 18400, reach: 12900, followers: 9800, interactions: 2840, posts: 22 },
          },
        ],
        publicProfiles: [
          {
            role: 'own',
            name: 'Trattoria Della Nonna',
            profileUrl: 'https://www.instagram.com/trattoriadellanonna/',
            confirmed: true,
            snapshots: [],
          },
        ],
      }),
      validateSocialAccount({
        workspaceId,
        businessId,
        network: 'facebook',
        profileUrl: 'https://www.facebook.com/trattoriadellanonna/',
        accountId: '',
        measurements: [
          {
            id: `m-fb-sep-${businessId}`,
            network: 'facebook',
            profileUrl: 'https://www.facebook.com/trattoriadellanonna/',
            capturedAt: '2026-09-30',
            source: 'manual',
            evidence: 'Facebook Insights · Septiembre 2026',
            periodStart: '2026-09-01',
            periodEnd: '2026-09-30',
            metrics: { views: 6300, reach: 8100, followers: 6400, interactions: 520 },
          },
        ],
      }),
      validateSocialAccount({
        workspaceId,
        businessId,
        network: 'tiktok',
        profileUrl: 'https://www.tiktok.com/@trattoriadellanonna/',
        accountId: '',
        measurements: [
          {
            id: `m-tt-sep-${businessId}`,
            network: 'tiktok',
            profileUrl: 'https://www.tiktok.com/@trattoriadellanonna/',
            capturedAt: '2026-09-30',
            source: 'manual',
            evidence: 'TikTok Analytics · Recetas virales de pasta · Septiembre 2026',
            periodStart: '2026-09-01',
            periodEnd: '2026-09-30',
            metrics: { views: 42100, followers: 11200, likes: 6900, interactions: 3800, posts: 16 },
          },
        ],
      }),
    ];
  }

  // Default empty set with properly formed accounts if none existed
  return [];
}
