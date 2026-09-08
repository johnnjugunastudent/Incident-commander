import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { db, generateId, now } from '../db/index.js';
import { rootCauseReports } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { InferenceResponseSchema } from '../types/index.js';

export const rootCauseRouter = router({
  getReport: publicProcedure
    .input(z.object({ incidentId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await db.query.rootCauseReports.findFirst({
        where: eq(rootCauseReports.incidentId, input.incidentId),
      });

      if (!result) {
        return null;
      }

      return transformReport(result);
    }),

  createReport: publicProcedure
    .input(z.object({
      incidentId: z.string().uuid(),
      // Validated inference response
      response: InferenceResponseSchema,
      modelName: z.string(),
      inferenceMode: z.enum(['live', 'demo']),
    }))
    .mutation(async ({ input }) => {
      const id = generateId();
      const nowDate = now();

      const { response, modelName, inferenceMode } = input;

      await db.insert(rootCauseReports).values({
        id,
        incidentId: input.incidentId,
        summary: response.diagnosis.summary,
        confidence: response.diagnosis.confidence,
        claims: response.diagnosis.claims,
        limitations: response.diagnosis.limitations || '',
        modelName,
        inferenceMode,
        createdAt: nowDate,
      });

      const created = await db.query.rootCauseReports.findFirst({
        where: eq(rootCauseReports.id, id),
      });

      return transformReport(created);
    }),
});

function transformReport(record: any) {
  return {
    ...record,
    createdAt: record.createdAt?.toISOString ? record.createdAt.toISOString() : record.createdAt,
    claims: record.claims || [],
  };
}
