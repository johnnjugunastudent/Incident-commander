import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routers/_app.js';
import { createContext } from './context.js';
import { healthCheck } from './db/index.js';

export const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000'
    : 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for production build
app.use(express.static('dist/client'));

// Health check
app.get('/health', async (req, res) => {
  const healthy = await healthCheck();
  res.json({
    status: healthy ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
    database: healthy ? 'connected' : 'disconnected',
  });
});

// tRPC endpoint
app.use('/trpc', createExpressMiddleware({
  router: appRouter,
  createContext,
  onError: ({ path, error }) => {
    console.error(`tRPC error on ${path ?? '<no-path>'}:`, error);
  },
}));

// API info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Incident Commander',
    version: '1.0.0',
    description: 'Evidence-backed AI incident-response engineer',
    endpoints: {
      health: 'GET /health',
      trpc: 'POST /trpc/:procedure',
    },
  });
});

// Catch-all for SPA routing in production
app.get('*', (req, res) => {
  if (!req.path.startsWith('/trpc') && !req.path.startsWith('/health') && !req.path.startsWith('/api')) {
    res.sendFile('/dist/client/index.html');
  }
});