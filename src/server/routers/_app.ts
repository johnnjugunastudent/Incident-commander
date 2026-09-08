import { router, publicProcedure } from '../trpc.js';
import { incidentRouter } from './incident.js';
import { investigationRouter } from './investigation.js';
import { evidenceRouter } from './evidence.js';
import { rootCauseRouter } from './rootCause.js';
import { patchRouter } from './patch.js';
import { auditRouter } from './audit.js';
import { observabilityRouter } from './observability.js';

export const appRouter = router({
  health: publicProcedure.query(() => 'ok'),
  incident: incidentRouter,
  investigation: investigationRouter,
  evidence: evidenceRouter,
  rootCause: rootCauseRouter,
  patch: patchRouter,
  audit: auditRouter,
  observability: observabilityRouter,
});

export type AppRouter = typeof appRouter;
