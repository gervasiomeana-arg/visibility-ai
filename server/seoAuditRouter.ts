import express from 'express';
import { normalizeAuditUrl } from '../shared/auditUrl';
import { requireSupabaseAuth } from './supabaseAuth';
import { buildRealSeoAudit } from './seoAuditService';
import {
  createRateLimiter,
  envRateLimit,
  rateLimitWindowMs,
} from './rateLimit';
import { recordUsageEventSafe } from './usageTelemetry';

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
    const { url, workspaceId, businessId } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (url.length > 2048) {
      return res.status(413).json({ error: 'URL is too long' });
    }

    let normalized: string;
    try { normalized = normalizeAuditUrl(url); }
    catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'La dirección web no es válida.' }); }
    const result = await buildRealSeoAudit(normalized);

    recordUsageEventSafe(req, {
      workspaceId:
        typeof workspaceId === 'string' ? workspaceId : undefined,
      businessId:
        typeof businessId === 'string' ? businessId : undefined,
      userId: res.locals.authUser?.id,
      eventType: 'seo_audit',
      units: 1,
      metadata: {
        httpStatus: result.httpStatus,
        pageSpeedAvailable: Boolean(result.pageSpeed),
      },
    });

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
