import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { db, generateId, now } from '../db/index.js';
import { investigationEvents } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { CreateInvestigationEventSchema } from '../types/index.js';
import { getEvidenceWithRelationships, traceEvidenceChain, buildEvidenceGraph } from '../investigation/evidenceGraph.js';

export const investigationRouter = router({
  getEvents: publicProcedure
    .input(z.object({ incidentId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await db.query.investigationEvents.findMany({
        where: eq(investigationEvents.incidentId, input.incidentId),
        orderBy: [desc(investigationEvents.createdAt)],
      });

      return result.map(transformEvent);
    }),

  createEvent: publicProcedure
    .input(CreateInvestigationEventSchema)
    .mutation(async ({ input }) => {
      const id = generateId();
      const nowDate = now();

      await db.insert(investigationEvents).values({
        id,
        incidentId: input.incidentId,
        stage: input.stage,
        status: input.status,
        summary: input.summary,
        detail: input.detail,
        evidenceIds: input.evidenceIds,
        createdAt: nowDate,
      });

      const created = await db.query.investigationEvents.findFirst({
        where: eq(investigationEvents.id, id),
      });

      return transformEvent(created);
    }),

  updateEventStatus: publicProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['queued', 'running', 'completed', 'failed', 'skipped']),
      detail: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await db
        .update(investigationEvents)
        .set({
          status: input.status,
          detail: input.detail,
        })
        .where(eq(investigationEvents.id, input.id));

      const updated = await db.query.investigationEvents.findFirst({
        where: eq(investigationEvents.id, input.id),
      });

      return transformEvent(updated);
    }),
  
  // Evidence graph endpoints
  getEvidenceGraph: publicProcedure
    .input(z.object({ incidentId: z.string().uuid() }))
    .query(async ({ input }) => {
      const graph = await buildEvidenceGraph(input.incidentId);
      return graph;
    }),

  getEvidenceChain: publicProcedure
    .input(z.object({
      incidentId: z.string().uuid(),
      claimEvidenceIds: z.array(z.string().uuid()),
    }))
    .query(async ({ input }) => {
      const chains = await traceEvidenceChain(input.incidentId, input.claimEvidenceIds);
      return chains;
    }),

  getEvidenceWithRelations: publicProcedure
    .input(z.object({ incidentId: z.string().uuid() }))
    .query(async ({ input }) => {
      const nodes = await getEvidenceWithRelationships(input.incidentId);
      return Array.from(nodes.values());
    }),
});

function transformEvent(record: any) {
  return {
    ...record,
    createdAt: record.createdAt?.toISOString ? record.createdAt.toISOString() : record.createdAt,
    evidenceIds: record.evidenceIds || [],
  };
}
