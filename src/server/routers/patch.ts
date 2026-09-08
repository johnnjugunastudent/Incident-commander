import { z } from 'zod';
import { router, publicProcedure, TRPCError } from '../trpc.js';
import { db, generateId, now } from '../db/index.js';
import { patchReviews, incidents } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { InferenceResponseSchema } from '../types/index.js';
import type { ApprovalStatus } from '../../shared/types.js';
import { approvePatch, rejectPatch, validateProposalCreation, validateVerificationDoesNotApprove, isApprovalActionDisabled } from '../security/approvalPolicy.js';
import { recordReviewOpened } from '../audit/auditEvents.js';

export const patchRouter = router({
  getReview: publicProcedure
    .input(z.object({ incidentId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await db.query.patchReviews.findFirst({
        where: eq(patchReviews.incidentId, input.incidentId),
      });

      if (!result) {
        return null;
      }

      const disabled = isApprovalActionDisabled(result.approvalStatus as ApprovalStatus);

      return {
        ...transformReview(result),
        approvalDisabled: disabled,
      };
    }),

  createPatch: publicProcedure
    .input(z.object({
      incidentId: z.string().uuid(),
      response: InferenceResponseSchema,
      confidence: z.number().min(0).max(1),
    }))
    .mutation(async ({ input }) => {
      // Safety check: verify this won't auto-approve
      const proposalCheck = await validateProposalCreation(input.incidentId);
      if (!proposalCheck.valid) {
        throw new TRPCError({ code: 'CONFLICT', message: proposalCheck.error });
      }

      // Verify incident exists
      const incident = await db.query.incidents.findFirst({
        where: eq(incidents.id, input.incidentId),
      });

      if (!incident) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Incident not found' });
      }

      // Check if approval already exists
      const existing = await db.query.patchReviews.findFirst({
        where: eq(patchReviews.incidentId, input.incidentId),
      });

      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Patch review already exists for this incident' });
      }

      const id = generateId();
      const nowDate = now();
      const { response } = input;

      await db.insert(patchReviews).values({
        id,
        incidentId: input.incidentId,
        summary: response.repairProposal.summary,
        diff: response.repairProposal.diff,
        filesChanged: response.repairProposal.filesChanged,
        confidence: input.confidence,
        verificationStatus: response.verification.status,
        approvalStatus: 'proposed', // ALWAYS proposed on creation
        verificationOutput: response.verification.output,
        createdAt: nowDate,
      });

      // Record audit event
      await recordReviewOpened({
        incidentId: input.incidentId,
      });

      // Update incident status to awaiting_review
      await db.update(incidents).set({
        status: 'awaiting_review',
        updatedAt: nowDate,
      }).where(eq(incidents.id, input.incidentId));

      const created = await db.query.patchReviews.findFirst({
        where: eq(patchReviews.id, id),
      });

      return {
        ...transformReview(created),
        approvalDisabled: false,
      };
    }),

  approve: publicProcedure
    .input(z.object({
      incidentId: z.string().uuid(),
      reviewerId: z.string().min(1),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Use the approval policy
      const result = await approvePatch(input.incidentId, input.reviewerId, input.reason);
      
      if (!result.success) {
        throw new TRPCError({ code: 'CONFLICT', message: result.error });
      }

      return {
        ...transformReview(result.review!),
        approvalDisabled: true,
      };
    }),

  reject: publicProcedure
    .input(z.object({
      incidentId: z.string().uuid(),
      reviewerId: z.string().min(1),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await rejectPatch(input.incidentId, input.reviewerId, input.reason);
      
      if (!result.success) {
        throw new TRPCError({ code: 'CONFLICT', message: result.error });
      }

      return {
        ...transformReview(result.review!),
        approvalDisabled: true,
      };
    }),

  // Safety check endpoint for testing
  validateApprovalSafety: publicProcedure
    .input(z.object({
      incidentId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      const review = await db.query.patchReviews.findFirst({
        where: eq(patchReviews.incidentId, input.incidentId),
      });

      if (!review) {
        return { safe: true, message: 'No patch review found' };
      }

      // Check that verification passing doesn't auto-approve
      const verificationCheck = await validateVerificationDoesNotApprove(input.incidentId);
      if (!verificationCheck.valid) {
        return { safe: false, message: verificationCheck.error };
      }

      return {
        safe: true,
        approvalStatus: review.approvalStatus,
        verificationStatus: review.verificationStatus,
        reviewerId: review.reviewerId,
        message: review.approvalStatus === 'approved' 
          ? 'Patch was approved by human reviewer'
          : 'Patch requires human approval',
      };
    }),
});

function transformReview(record: any) {
  return {
    ...record,
    createdAt: record.createdAt?.toISOString ? record.createdAt.toISOString() : record.createdAt,
    reviewedAt: record.reviewedAt?.toISOString ? record.reviewedAt?.toISOString() : record.reviewedAt,
    filesChanged: record.filesChanged || [],
    verificationOutput: record.verificationOutput || '',
  };
}
