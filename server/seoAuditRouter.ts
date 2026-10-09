import express from 'express';
import { requireSupabaseAuth } from './supabaseAuth';
import { buildRealSeoAudit } from './seoAuditService';
import {
  createRateLimiter,
  envRateLimit,
  rateLimitWindowMs,
} from './rateLimit';

const router = express.Router();

const seoAuditRateLimit = createRateLimiter({
  name: 'seo-audit',
  maxRequests: envRateLimit('SEO_AUDIT_RATE_LIMIT_PER_WINDOW', 30),
  windowMs: rateLimitWindowMs(),
});

router.post(
  '/audit',
  requireSupabaseAuth,
  seoAuditRateLimit,
  async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (url.length > 2048) {
      return res.status(413).json({ error: 'URL is too long' });
    }

    const result = await buildRealSeoAudit(url);
    return res.json(result);
  } catch (error: any) {
    console.error('Error in /api/seo/audit:', error);

    const message =
      error?.name === 'AbortError'
        ? 'The website took too long to respond'
        : error?.message || 'SEO audit failed';

    return res.status(422).json({ error: message });
  }
});

export default router;
