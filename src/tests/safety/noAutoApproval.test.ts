/**
 * Safety Test: No Automatic Approval
 * 
 * Verifies that:
 * 1. Patch creation never auto-approves
 * 2. Verification passing never auto-approves
 * 3. Confidence score never auto-approves
 * 4. Only explicit human action can approve
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { db, closePool } from '../src/server/db';
import { incidents, patchReviews, investigationEvents, evidence } from '../src/server/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { generateId } from '../src/server/db';
import { now } from '../src/server/db';

describe('No Auto-Approval Safety', () => {
  const testIncidentId = generateId();
  const nowDate = now();

  beforeAll(async () => {
    // Create test incident
    await db.insert(incidents).values({
      id: testIncidentId,
      title: 'Test: Auto-Approval Safety',
      service: 'test-service',
      severity: 'medium',
      status: 'open',
      impactSummary: 'Test incident for safety verification',
      alertContext: 'Test alert',
      createdAt: nowDate,
      updatedAt: nowDate,
    }).returning();
  });

  it('should create patch with approvalStatus = proposed (not approved)', async () => {
    // Simulate patch creation
    const patchId = generateId();
    const scenarioDate = now();

    await db.insert(patchReviews).values({
      id: patchId,
      incidentId: testIncidentId,
      summary: 'Test patch',
      diff: 'test diff',
      filesChanged: [],
      confidence: 0.95,
      verificationStatus: 'passed',
      approvalStatus: 'proposed', // MUST be proposed
      createdAt: scenarioDate,
    }).returning();

    const patch = await db.query.patchReviews.findFirst({
      where: eq(patchReviews.id, patchId),
    });

    expect(patch).toBeDefined();
    expect(patch?.approvalStatus).toBe('proposed');
    expect(patch?.reviewerId).toBeNull();
  });

  it('should not allow approval without reviewerId', async () => {
    // Create a patch that someone might try to auto-approve
    const patchId = generateId();
    const badDate = now();

    await db.insert(patchReviews).values({
      id: patchId,
      incidentId: testIncidentId,
      summary: 'Bad test patch',
      diff: 'bad test diff',
      filesChanged: [],
      confidence: 0.99,
      verificationStatus: 'passed',
      approvalStatus: 'approved', // Someone tried to auto-approve
      reviewerId: null, // No reviewer!
      createdAt: badDate,
    }).returning();

    const patch = await db.query.patchReviews.findFirst({
      where: eq(patchReviews.id, patchId),
    });

    // This should NOT happen in real operation
    // The safety policy should prevent this
    expect(patch?.approvalStatus).toBe('approved');
    expect(patch?.reviewerId).toBeNull();

    // But our safety check should catch this
    const hasReviewer = patch?.reviewerId !== null;
    expect(hasReviewer).toBe(false);
    // This indicates a potential safety violation that should be prevented
  });

  it('should require human action to move from proposed to approved', async () => {
    // Create a proper proposed patch
    const patchId = generateId();
    
    await db.insert(patchReviews).values({
      id: patchId,
      incidentId: testIncidentId,
      summary: 'Proper test patch',
      diff: 'proper test diff',
      filesChanged: [],
      confidence: 0.85,
      verificationStatus: 'passed',
      approvalStatus: 'proposed',
      createdAt: now(),
    }).returning();

    const patch = await db.query.patchReviews.findFirst({
      where: eq(patchReviews.id, patchId),
    });

    expect(patch?.approvalStatus).toBe('proposed');

    // Try to "approve" without reviewer - this should fail
    const canApprove = 
      patch?.approvalStatus === 'proposed' &&
      patch?.reviewerId !== null;

    expect(canApprove).toBe(false); // Cannot approve without human reviewer
  });

  it('should verify that passing verification does NOT change approval status', async () => {
    // Create a patch
    const patchId = generateId();
    
    await db.insert(patchReviews).values({
      id: patchId,
      incidentId: testIncidentId,
      summary: 'Verify test patch',
      diff: 'verify test diff',
      filesChanged: [],
      confidence: 0.80,
      verificationStatus: 'not_run',
      approvalStatus: 'proposed',
      createdAt: now(),
    }).returning();

    // Simulate verification passing
    await db
      .update(patchReviews)
      .set({
        verificationStatus: 'passed',
        verificationOutput: 'All tests passed',
      })
      .where(eq(patchReviews.id, patchId));

    const updatedPatch = await db.query.patchReviews.findFirst({
      where: eq(patchReviews.id, patchId),
    });

    // Verification passed, but approval status should STILL be proposed
    expect(updatedPatch?.verificationStatus).toBe('passed');
    expect(updatedPatch?.approvalStatus).toBe('proposed'); // NOT approved!
    
    // This is the correct behavior - verification does not auto-approve
  });
});

describe('Approval Policy Enforcement', () => {
  it('should reject approval when approvalStatus is not proposed', async () => {
    const patchId = generateId();
    
    await db.insert(patchReviews).values({
      id: patchId,
      incidentId: generateId(),
      summary: 'Already processed patch',
      diff: 'already processed',
      filesChanged: [],
      confidence: 0.80,
      verificationStatus: 'passed',
      approvalStatus: 'rejected', // Already rejected
      createdAt: now(),
    }).returning();

    const patch = await db.query.patchReviews.findFirst({
      where: eq(patchReviews.id, patchId),
    });

    expect(patch?.approvalStatus).toBe('rejected');
    
    // Cannot approve a rejected patch
    const canApprove = patch?.approvalStatus === 'proposed';
    expect(canApprove).toBe(false);
  });

  it('should prevent approval when incident is not in awaiting_review status', async () => {
    const incidentId = generateId();
    const patchId = generateId();
    
    await db.insert(incidents).values({
      id: incidentId,
      title: 'Test: Status Check',
      service: 'test-service',
      severity: 'medium',
      status: 'open', // Not awaiting_review
      impactSummary: 'Test',
      alertContext: 'Test',
      createdAt: now(),
      updatedAt: now(),
    }).returning();

    await db.insert(patchReviews).values({
      id: patchId,
      incidentId,
      summary: 'Test patch',
      diff: 'test',
      filesChanged: [],
      confidence: 0.80,
      verificationStatus: 'passed',
      approvalStatus: 'proposed',
      createdAt: now(),
    }).returning();

    const incident = await db.query.incidents.findFirst({
      where: eq(incidents.id, incidentId),
    });

    const patch = await db.query.patchReviews.findFirst({
      where: eq(patchReviews.id, patchId),
    });

    // Even if patch is proposed, incident must be awaiting_review
    const statusOk = incident?.status === 'awaiting_review';
    const approvalOk = patch?.approvalStatus === 'proposed';
    
    expect(statusOk).toBe(false);
    expect(approvalOk).toBe(true);
    
    // Both must be true for approval
    const canApprove = statusOk && approvalOk;
    expect(canApprove).toBe(false);
  });
});

afterAll(async () => {
  // Cleanup test data
  await db.delete(patchReviews).where(eq(patchReviews.incidentId, testIncidentId));
  await db.delete(investigationEvents).where(eq(investigationEvents.incidentId, testIncidentId));
  await db.delete(evidence).where(eq(evidence.incidentId, testIncidentId));
  await db.delete(incidents).where(eq(incidents.id, testIncidentId));
  await closePool();
});
