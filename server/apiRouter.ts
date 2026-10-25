import googleBusinessRouter from './googleBusinessRouter';
import express from 'express';
import backupRouter from './backupRouter';
import {requireVisibilityOperator} from './operatorAccess';
import aiRouter from './aiRouter';
import healthRouter from './healthRouter';
import searchConsoleRouter from './searchConsoleRouter';
import seoAuditRouter from './seoAuditRouter';
import socialMetricsRouter from './socialMetricsRouter';

const router = express.Router();

router.use('/health', healthRouter);
router.use(requireVisibilityOperator);
router.use('/backups',backupRouter);
router.use('/search-console', searchConsoleRouter);
router.use('/google-business', googleBusinessRouter);
router.use('/seo', seoAuditRouter);
router.use('/social', socialMetricsRouter);
router.use('/', aiRouter);

router.use((_req, res) => {
  return res.status(404).json({
    error: 'API route not found',
  });
});

export default router;
