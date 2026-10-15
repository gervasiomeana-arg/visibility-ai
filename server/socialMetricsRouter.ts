import express from 'express';
import { requireSupabaseAuth } from './supabaseAuth';
import { createRateLimiter, rateLimitWindowMs } from './rateLimit';
import { measureSocialAccount, validateSocialApiInput } from './socialMetricsService';
const router = express.Router();
router.post('/measure', requireSupabaseAuth, createRateLimiter({ name: 'social-measure', maxRequests: 20, windowMs: rateLimitWindowMs() }), async (req, res) => {
  let input;
  try { input = validateSocialApiInput(req.body); }
  catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Datos no válidos.' }); }
  try { return res.json({ measurement: await measureSocialAccount(input) }); }
  catch { return res.status(502).json({ error: 'No se pudieron obtener las métricas oficiales. Revisá permisos, identificador, vigencia del token y META_GRAPH_API_VERSION si usás Meta. Los datos anteriores se conservan.' }); }
});
export default router;
