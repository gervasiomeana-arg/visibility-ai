import express from 'express';
import { requireSupabaseAuth } from './supabaseAuth';
import { createRateLimiter, rateLimitWindowMs } from './rateLimit';
import { measureSocialAccount, validateSocialApiInput } from './socialMetricsService';
import { collectPublicProfile, discoverPublicProfiles, publicResearchInput } from './publicSocialResearch';
import { publicReadFailure } from './publicReadFailure';
import { normalizeAuditUrl } from '../shared/auditUrl';
const router = express.Router();
const publicLimit = createRateLimiter({ name: 'social-public', maxRequests: 20, windowMs: rateLimitWindowMs() });
router.post('/public/discover', requireSupabaseAuth, publicLimit, async (req, res) => {
  let domain: string;
  try { if (typeof req.body?.domain !== 'string' || req.body.domain.length > 2048) throw new Error(); domain = normalizeAuditUrl(req.body.domain); }
  catch { return res.status(400).json({ error: 'Ingresá el dominio HTTPS del negocio o competidor.' }); }
  try { return res.json(await discoverPublicProfiles(domain)); }
  catch (error) { const diagnostic = publicReadFailure(error); return res.status(502).json({ error: diagnostic.message, diagnostic }); }
});
router.post('/public/collect', requireSupabaseAuth, publicLimit, async (req, res) => {
  let input;
  try { input = publicResearchInput(req.body); }
  catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Perfil o período inválido.' }); }
  return res.json(await collectPublicProfile(input));
});
router.post('/measure', requireSupabaseAuth, createRateLimiter({ name: 'social-measure', maxRequests: 20, windowMs: rateLimitWindowMs() }), async (req, res) => {
  let input;
  try { input = validateSocialApiInput(req.body); }
  catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Datos no válidos.' }); }
  try { return res.json({ measurement: await measureSocialAccount(input) }); }
  catch { return res.status(502).json({ error: 'No se pudieron obtener las métricas oficiales. Revisá permisos, identificador, vigencia del token y META_GRAPH_API_VERSION si usás Meta. Los datos anteriores se conservan.' }); }
});
export default router;
