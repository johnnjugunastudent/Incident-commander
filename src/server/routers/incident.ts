import { z } from 'zod';
import { router, publicProcedure, TRPCError } from '../trpc.js';
import { db, generateId, now } from '../db/index.js';
import { incidents } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { CreateIncidentSchema, GetIncidentSchema } from '../types/index.js';
import { startInvestigation } from '../ai/agentOrchestrator.js';
import { logAuditEvent } from '../audit/auditLogger.js';
import { recordIncidentCreated } from '../audit/auditEvents.js';
import { seedDemoIncident, seedDemoRootCause } from '../demo/checkoutIncident.js';

export const incidentRouter = router({
  list: publicProcedure.query(async () => {
    const result = await db.query.incidents.findMany({
      orderBy: (incidents, { desc }) => [desc(incidents.createdAt)],
      limit: 50,
    });
    return result.map(transformIncident);
  }),

  get: publicProcedure
    .input(GetIncidentSchema)
    .query(async ({ input }) => {
      const result = await db.query.incidents.findFirst({
        where: eq(incidents.id, input.id),
      });
      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Incident not found' });
      }
      return transformIncident(result);
    }),

  create: publicProcedure
    .input(CreateIncidentSchema)
    .mutation(async ({ input }) => {
      const id = generateId();
      const nowDate = now();

      await db.insert(incidents).values({
        id,
        title: input.title,
        service: input.service,
        severity: input.severity,
        status: 'open',
        impactSummary: input.impactSummary,
        alertContext: input.alertContext,
        logs: input.logs || '',
        repositoryContext: input.repositoryContext || '',
        recentChange: input.recentChange || '',
        reproductionInstructions: input.reproductionInstructions || '',
        createdAt: nowDate,
        updatedAt: nowDate,
      });

      // Audit log
      await recordIncidentCreated({
        incidentId: id,
        title: input.title,
        service: input.service,
        severity: input.severity,
      });

      const created = await db.query.incidents.findFirst({
        where: eq(incidents.id, id),
      });

      return transformIncident(created);
    }),

  updateStatus: publicProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['open', 'investigating', 'awaiting_review', 'resolved', 'closed']),
    }))
    .mutation(async ({ input }) => {
      await db
        .update(incidents)
        .set({
          status: input.status,
          updatedAt: now(),
        })
        .where(eq(incidents.id, input.id));

      const updated = await db.query.incidents.findFirst({
        where: eq(incidents.id, input.id),
      });

      return updated;
    }),

  // Open the controlled demo incident
  openDemo: publicProcedure
    .mutation(async () => {
      // Check if demo incident exists
      let demoIncident = await db.query.incidents.findFirst({
        where: eq(incidents.title, 'Checkout API: Elevated 5xx Responses'),
      });

      if (!demoIncident) {
        // Seed demo data
        const incidentId = await seedDemoIncident();
        if (incidentId) {
          await seedDemoRootCause(incidentId);
        }
        demoIncident = await db.query.incidents.findFirst({
          where: eq(incidents.title, 'Checkout API: Elevated 5xx Responses'),
        });
      }

      if (!demoIncident) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create demo incident' });
      }

      return transformIncident(demoIncident);
    }),

  // Start investigation for an incident
  startInvestigation: publicProcedure
    .input(z.object({ incidentId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const result = await startInvestigation(input.incidentId, {
        onStageUpdate: async (stage, status, summary, detail) => {
          await logAuditEvent({
            incidentId: input.incidentId,
            actor: 'system',
            action: 'investigation_started',
            metadata: { stage, status, summary, detail },
          });
        },
      });

      if (!result.success) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.error });
      }

      return { success: true };
    }),
});

// Transform database record to API response
function transformIncident(record: any) {
  return {
    ...record,
    createdAt: record.createdAt?.toISOString ? record.createdAt.toISOString() : record.createdAt,
    updatedAt: record.updatedAt?.toISOString ? record.updatedAt.toISOString() : record.updatedAt,
  };
}
