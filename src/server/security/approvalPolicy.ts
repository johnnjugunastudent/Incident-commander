/**
 * Approval Safety Policy
 * 
 * Server-side enforcement of the approval boundary.
 * NEVER allows AI, verification, confidence, or tests to approve a patch.
 */

import { db, generateId } from '../db/index.js';
import { 
  patchReviews, 
  incidents, 
  investigationEvents 
} from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { 
  canApprove as checkCanApprove, 
  canReject as checkCanReject,
  isTerminalStatus
} from '../investigation/stateMachine.js';
import { logAuditEvent } from '../audit/auditLogger.js';
import type { ApprovalStatus, VerificationStatus } from '../../shared/types.js';

/**
 * Safety rules enforced by this policy:
 * 
 * 1. PATCH CREATED → approvalStatus = proposed
 * 2. VERIFICATION PASSED → approvalStatus remains proposed
 * 3. HUMAN APPROVES → approvalStatus = approved
 * 
 * NEVER ALLOW:
 * - AI → APPROVED
 * - Verification → APPROVED
 * - Confidence score → APPROVED
 * - Passing tests → APPROVED
 */

/**
 * Safety check: Verify that a patch cannot be auto-approved
 */
export function validateNoAutoApproval(
  approvalStatus: ApprovalStatus,
  verificationStatus: VerificationStatus,
  isHumanAction: boolean
): { valid: boolean; error?: string } {
  // If this is not a human action, approval is never allowed
  if (!isHumanAction) {
    if (approvalStatus === 'approved') {
      return {
        valid: false,
        error: 'Safety violation: Patch approval requires explicit human action',
      };
    }
  }

  // Verification passing does NOT auto-approve
  if (verificationStatus === 'passed' && approvalStatus === 'proposed') {
    // This is fine - verification passed but still proposed
    return { valid: true };
  }

  return { valid: true };
}

/**
 * Approve a patch - requires explicit human action
 * 
 * This is the ONLY way a patch can move from 'proposed' to 'approved'.
 */
export async function approvePatch(
  incidentId: string,
  reviewerId: string,
  reason?: string
): Promise<{ success: boolean; error?: string; review?: any }> {
  // Get current patch review
  const review = await db.query.patchReviews.findFirst({
    where: eq(patchReviews.incidentId, incidentId),
  });

  if (!review) {
    return { success: false, error: 'No patch review found for this incident' };
  }

  // SAFETY CHECK: Must be in proposed state
  if (review.approvalStatus !== 'proposed') {
    return { 
      success: false, 
      error: `Cannot approve: patch is already ${review.approvalStatus}. Only proposed patches can be approved.`
    };
  }

  // SAFETY CHECK: Must have valid incident status
  const incident = await db.query.incidents.findFirst({
    where: eq(incidents.id, incidentId),
  });

  if (!incident) {
    return { success: false, error: 'Incident not found' };
  }

  if (!checkCanApprove(incident.status as any, review.approvalStatus)) {
    return {
      success: false,
      error: `Cannot approve: incident must be in awaiting_review status (currently ${incident.status})`,
    };
  }

  // SAFETY CHECK: This IS a human action - proceed
  const now = new Date();

  // Update patch review
  await db
    .update(patchReviews)
    .set({
      approvalStatus: 'approved',
      reviewerId,
      reviewedAt: now,
    })
    .where(eq(patchReviews.id, review.id));

  // Update incident status
  await db
    .update(incidents)
    .set({
      status: 'resolved',
      updatedAt: now,
    })
    .where(eq(incidents.id, incidentId));

  const updated = await db.query.patchReviews.findFirst({
    where: eq(patchReviews.id, review.id),
  });

  // Record investigation event
  await db.insert(investigationEvents).values({
    id: generateId(),
    incidentId,
    stage: 'repair',
    status: 'completed',
    summary: 'Patch approved by human reviewer',
    detail: reason || 'Patch approved',
    evidenceIds: [],
    createdAt: now,
  });

  // Audit log
  await logAuditEvent({
    incidentId,
    actor: reviewerId,
    action: 'patch_approved',
    previousState: { approvalStatus: 'proposed', incidentStatus: incident.status },
    newState: { approvalStatus: 'approved', incidentStatus: 'resolved' },
    metadata: { reviewerId, reason, patchId: review.id },
  });

  return { success: true, review: updated };
}

/**
 * Reject a patch - requires explicit human action
 */
export async function rejectPatch(
  incidentId: string,
  reviewerId: string,
  reason?: string
): Promise<{ success: boolean; error?: string; review?: any }> {
  // Get current patch review
  const review = await db.query.patchReviews.findFirst({
    where: eq(patchReviews.incidentId, incidentId),
  });

  if (!review) {
    return { success: false, error: 'No patch review found for this incident' };
  }

  // SAFETY CHECK: Must be in proposed state
  if (review.approvalStatus !== 'proposed') {
    return { 
      success: false, 
      error: `Cannot reject: patch is already ${review.approvalStatus}. Only proposed patches can be rejected.`
    };
  }

  const incident = await db.query.incidents.findFirst({
    where: eq(incidents.id, incidentId),
  });

  if (!incident) {
    return { success: false, error: 'Incident not found' };
  }

  if (!checkCanReject(incident.status as any, review.approvalStatus)) {
    return {
      success: false,
      error: `Cannot reject: incident must be in awaiting_review status (currently ${incident.status})`,
    };
  }

  const now = new Date();

  // Update patch review
  await db
    .update(patchReviews)
    .set({
      approvalStatus: 'rejected',
      reviewerId,
      reviewedAt: now,
    })
    .where(eq(patchReviews.id, review.id));

  // Update incident status
  await db
    .update(incidents)
    .set({
      status: 'closed',
      updatedAt: now,
    })
    .where(eq(incidents.id, incidentId));

  const updated = await db.query.patchReviews.findFirst({
    where: eq(patchReviews.id, review.id),
  });

  // Record investigation event
  await db.insert(investigationEvents).values({
    id: generateId(),
    incidentId,
    stage: 'repair',
    status: 'completed',
    summary: 'Patch rejected by human reviewer',
    detail: reason || 'Patch rejected',
    evidenceIds: [],
    createdAt: now,
  });

  // Audit log
  await logAuditEvent({
    incidentId,
    actor: reviewerId,
    action: 'patch_rejected',
    previousState: { approvalStatus: 'proposed', incidentStatus: incident.status },
    newState: { approvalStatus: 'rejected', incidentStatus: 'closed' },
    metadata: { reviewerId, reason, patchId: review.id },
  });

  return { success: true, review: updated };
}

/**
 * Verify that proposal creation never auto-approves
 */
export async function validateProposalCreation(incidentId: string): Promise<{ valid: boolean; error?: string }> {
  const review = await db.query.patchReviews.findFirst({
    where: eq(patchReviews.incidentId, incidentId),
  });

  if (review && review.approvalStatus === 'approved') {
    return {
      valid: false,
      error: 'Safety violation: A patch has already been approved for this incident',
    };
  }

  return { valid: true };
}

/**
 * Verify that verification passing never auto-approves
 */
export async function validateVerificationDoesNotApprove(incidentId: string): Promise<{ valid: boolean; error?: string }> {
  const review = await db.query.patchReviews.findFirst({
    where: eq(patchReviews.incidentId, incidentId),
  });

  if (!review) {
    return { valid: true }; // No review yet, nothing to check
  }

  // Verification passed but still proposed - this is CORRECT behavior
  if (review.verificationStatus === 'passed' && review.approvalStatus === 'proposed') {
    return { valid: true };
  }

  // If somehow verification passed and got approved without human action, that's a violation
  if (review.verificationStatus === 'passed' && review.approvalStatus === 'approved' && !review.reviewerId) {
    return {
      valid: false,
      error: 'Safety violation: Patch was approved without human reviewer',
    };
  }

  return { valid: true };
}

/**
 * Check if approval/rejection UI should be disabled
 */
export function isApprovalActionDisabled(approvalStatus: ApprovalStatus): boolean {
  // After final decision, actions are disabled
  if (approvalStatus === 'approved' || approvalStatus === 'rejected') {
    return true;
  }

  // Terminal states
  return isTerminalStatus(approvalStatus as any);
}
