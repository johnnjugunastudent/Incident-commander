import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { db, generateId, now } from '../db/index.js';
import { evidence } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { CreateEvidenceSchema } from '../types/index.js';

export const evidenceRouter = router({
  getList: publicProcedure
    .input(z.object({ incidentId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await db.query.evidence.findMany({
        where: eq(evidence.incidentId, input.incidentId),
        orderBy: [desc(evidence.createdAt)],
      });

      return result.map(transformEvidence);
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await db.query.evidence.findFirst({
        where: eq(evidence.id, input.id),
      });

      if (!result) {
        throw new Error('Evidence not found');
      }

      return transformEvidence(result);
    }),

  create: publicProcedure
    .input(CreateEvidenceSchema)
    .mutation(async ({ input }) => {
      const id = generateId();
      const nowDate = now();

      await db.insert(evidence).values({
        id,
        incidentId: input.incidentId,
        kind: input.kind,
        label: input.label,
        content: input.content,
        sourcePath: input.sourcePath,
        lineRange: input.lineRange,
        createdAt: nowDate,
      });

      const created = await db.query.evidence.findFirst({
        where: eq(evidence.id, id),
      });

      return transformEvidence(created);
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(evidence).where(eq(evidence.id, input.id));
      return { success: true };
    }),
});

function transformEvidence(record: any) {
  return {
    ...record,
    createdAt: record.createdAt?.toISOString ? record.createdAt.toISOString() : record.createdAt,
  };
}
