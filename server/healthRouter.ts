import express from 'express';
import { youtubeConfigured } from './youtubePublic';
import { getInstagramDiscoveryConfig } from './instagramBusinessDiscovery';
import {
  durableSearchConsoleConfigured,
  getSupabaseConfig,
  searchConsoleConfigured,
} from './runtimeConfig';

const router = express.Router();

router.get('/', (_req, res) => {
  const supabase = getSupabaseConfig();

  const pageSpeedKey = process.env.PAGESPEED_API_KEY || '';
  const geminiKey = process.env.GEMINI_API_KEY || '';

  const integrations = {
      youtube: youtubeConfigured(),
      instagramBusinessDiscovery: getInstagramDiscoveryConfig().configured,
      supabase: supabase.configured,
      searchConsoleOAuth: searchConsoleConfigured(),
      searchConsoleDurableTokens: durableSearchConsoleConfigured(),
      pageSpeedKey: Boolean(
        pageSpeedKey &&
        pageSpeedKey !== 'MY_PAGESPEED_API_KEY'
      ),
    gemini: Boolean(
      geminiKey &&
      geminiKey !== 'MY_GEMINI_API_KEY'
    ),
  };

  const blockers: string[] = [];
  if (!integrations.supabase) {
    blockers.push('Supabase Auth + PostgreSQL');
  }

  return res.json({
    ok: true,
    service: 'visibility-ai',
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.round(process.uptime()),
    integrations,
    readiness: {
      basis: 'configuration-only',
      externalChecksPerformed: false,
      // Legacy flags describe configuration presence, never end-to-end acceptance.
      coreSaasReady: blockers.length === 0,
      searchConsoleProductionReady:
        integrations.searchConsoleOAuth &&
        integrations.searchConsoleDurableTokens,
      blockers,
      optionalMissing: [
        !integrations.searchConsoleOAuth ? 'Google Search Console OAuth' : null,
        !integrations.searchConsoleDurableTokens ? 'Search Console durable tokens' : null,
        !integrations.pageSpeedKey ? 'PageSpeed dedicated API key' : null,
        !integrations.gemini ? 'Gemini API' : null,
        !integrations.youtube ? 'YouTube Data API key' : null,
        !integrations.instagramBusinessDiscovery ? 'Instagram Business Discovery' : null,
      ].filter(Boolean),
    },
  });
});

export default router;
