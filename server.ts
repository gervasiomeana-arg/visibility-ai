import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import searchConsoleRouter from './server/searchConsoleRouter';
import seoAuditRouter from './server/seoAuditRouter';
import aiRouter from './server/aiRouter';
import healthRouter from './server/healthRouter';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '100kb' }));

// Health / deployment diagnostics
app.use('/api/health', healthRouter);

// API Routes

// Google Search Console OAuth + read-only data
app.use('/api/search-console', searchConsoleRouter);

// Real technical SEO audit
app.use('/api/seo', seoAuditRouter);

app.use('/api', aiRouter);

// Setup Vite middleware in dev or serve dist in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Visibility AI server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
