import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SocialMetricsFinder } from '../../src/components/SocialMetricsFinder';
import { getInitialSocialAccounts } from '../../src/data/initialSocialAccounts';
import type { Business } from '../../src/types';

const testBusiness: Business = {
  id: 'biz-hotel-mdp',
  name: 'Gran Hotel Bristol',
  url: 'https://granhotelbristol.com.ar',
  category: 'Hotelería',
  city: 'Mar del Plata',
  country: 'Argentina',
  createdAt: '2026-01-01',
  scores: { overall: 70, google: 80, seo: 65, web: 75, aiVisibility: 60 },
  totalOpportunities: 5,
  problemsCount: { high: 1, medium: 2, ok: 2 },
};

const secondBusiness: Business = {
  id: 'biz-restaurante-palermo',
  name: 'Trattoria Della Nonna',
  url: 'https://trattoriadellanonna.com',
  category: 'Gastronomía',
  city: 'Palermo',
  country: 'Argentina',
  createdAt: '2026-01-01',
  scores: { overall: 70, google: 80, seo: 65, web: 75, aiVisibility: 60 },
  totalOpportunities: 5,
  problemsCount: { high: 1, medium: 2, ok: 2 },
};

test('SocialMetricsFinder renders search bar, September metric results, and bar charts for Instagram, Facebook, and TikTok', () => {
  const accounts = getInitialSocialAccounts('test-workspace', testBusiness.id);

  const html = renderToStaticMarkup(
    React.createElement(SocialMetricsFinder, {
      business: testBusiness,
      allBusinesses: [testBusiness, secondBusiness],
      accounts,
      workspaceId: 'test-workspace',
      canEdit: true,
      onSaveAccount: async () => {},
    })
  );

  // Check search and title
  assert.match(html, /Buscador de Métricas en Redes/);
  assert.match(html, /Métricas de Instagram, Facebook y TikTok/);

  // Check client and month selector
  assert.match(html, /Gran Hotel Bristol/);
  assert.match(html, /Septiembre 2026/);

  // Check networks
  assert.match(html, /Instagram/);
  assert.match(html, /Facebook/);
  assert.match(html, /TikTok/);

  // Check September values (14.850 for IG, 8.920 for FB, 26.400 for TikTok)
  assert.match(html, /14\.850/);
  assert.match(html, /8\.920/);
  assert.match(html, /26\.400/);

  // Check summary phrase requested by user: "en instagram te vieron tantos en facebook tantos"
  assert.match(html, /te vieron/);
  assert.match(html, /Mayor volumen/);

  // Check no NaN or broken layout
  assert.doesNotMatch(html, /NaN|undefined|Infinity/);
});
