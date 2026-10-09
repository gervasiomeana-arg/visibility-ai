import express from 'express';
import aiRouter from './aiRouter';
import healthRouter from './healthRouter';
import searchConsoleRouter from './searchConsoleRouter';
import seoAuditRouter from './seoAuditRouter';

const router = express.Router();

router.use('/health', healthRouter);
router.use('/search-console', searchConsoleRouter);
router.use('/seo', seoAuditRouter);
router.use('/', aiRouter);

router.use((_req, res) => {
  return res.status(404).json({
    error: 'API route not found',
  });
});

export default router;
