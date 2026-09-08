import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { getAuditTrail, getAuditSummary, formatAuditEntry } from '../audit/auditLogger.js';

export const auditRouter = router({
  getTrail: publicProcedure
    .input(z.object({ incidentId: z.string().uuid() }))
    .query(async ({ input }) => {
      const logs = await getAuditTrail(input.incidentId);
      return logs.map(formatAuditEntry);
    }),

  getSummary: publicProcedure
    .input(z.object({ incidentId: z.string().uuid() }))
    .query(async ({ input }) => {
      const summary = await getAuditSummary(input.incidentId);
      return summary;
    }),
});
