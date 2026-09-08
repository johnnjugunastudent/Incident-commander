/**
 * Audit Event Tracking
 * 
 * Helper functions to record audit events throughout the system.
 */

import { logAuditEvent } from './auditLogger.js';
import type { AuditAction } from './auditLogger.js';

export interface AuditContext {
  incidentId: string;
  actor?: string;
  metadata?: Record<string, any>;
}

/**
 * Record incident creation
 */
export async function recordIncidentCreated(
  context: AuditContext & { title: string; service: string; severity: string }
): Promise<void> {
  await logAuditEvent({
    incidentId: context.incidentId,
    actor: context.actor || 'system',
    action: 'incident_created',
    metadata: {
      title: context.title,
      service: context.service,
      severity: context.severity,
    },
  });
}

/**
 * Record investigation start
 */
export async function recordInvestigationStarted(
  context: AuditContext
): Promise<void> {
  await logAuditEvent({
    incidentId: context.incidentId,
    actor: 'system',
    action: 'investigation_started',
  });
}

/**
 * Record evidence addition
 */
export async function recordEvidenceAdded(
  context: AuditContext & { evidenceId: string; kind: string; label: string }
): Promise<void> {
  await logAuditEvent({
    incidentId: context.incidentId,
    actor: context.actor || 'system',
    action: 'evidence_added',
    metadata: {
      evidenceId: context.evidenceId,
      kind: context.kind,
      label: context.label,
    },
  });
}

/**
 * Record diagnosis generation
 */
export async function recordDiagnosisGenerated(
  context: AuditContext & { 
    modelName: string; 
    inferenceMode: 'live' | 'demo';
    confidence: number;
  }
): Promise<void> {
  await logAuditEvent({
    incidentId: context.incidentId,
    actor: 'ai',
    action: 'diagnosis_generated',
    metadata: {
      modelName: context.modelName,
      inferenceMode: context.inferenceMode,
      confidence: context.confidence,
    },
  });
}

/**
 * Record patch proposal
 */
export async function recordPatchProposed(
  context: AuditContext & { patchId: string; filesChanged: string[] }
): Promise<void> {
  await logAuditEvent({
    incidentId: context.incidentId,
    actor: 'ai',
    action: 'patch_proposed',
    metadata: {
      patchId: context.patchId,
      filesChanged: context.filesChanged,
    },
  });
}

/**
 * Record verification
 */
export async function recordVerificationCompleted(
  context: AuditContext & { status: 'passed' | 'failed' | 'partial'; output?: string }
): Promise<void> {
  await logAuditEvent({
    incidentId: context.incidentId,
    actor: 'system',
    action: 'verification_completed',
    metadata: {
      status: context.status,
      output: context.output,
    },
  });
}

/**
 * Record review opening
 */
export async function recordReviewOpened(
  context: AuditContext
): Promise<void> {
  await logAuditEvent({
    incidentId: context.incidentId,
    actor: 'system',
    action: 'review_opened',
    metadata: {
      message: 'Human review required for patch approval',
    },
  });
}

/**
 * Record patch approval
 */
export async function recordPatchApproved(
  context: AuditContext & { patchId: string; reason?: string }
): Promise<void> {
  await logAuditEvent({
    incidentId: context.incidentId,
    actor: context.actor || 'unknown',
    action: 'patch_approved',
    metadata: {
      patchId: context.patchId,
      reason: context.reason,
    },
  });
}

/**
 * Record patch rejection
 */
export async function recordPatchRejected(
  context: AuditContext & { patchId: string; reason?: string }
): Promise<void> {
  await logAuditEvent({
    incidentId: context.incidentId,
    actor: context.actor || 'unknown',
    action: 'patch_rejected',
    metadata: {
      patchId: context.patchId,
      reason: context.reason,
    },
  });
}

/**
 * Record incident closure
 */
export async function recordIncidentClosed(
  context: AuditContext & { reason?: string }
): Promise<void> {
  await logAuditEvent({
    incidentId: context.incidentId,
    actor: context.actor || 'system',
    action: 'incident_closed',
    metadata: {
      reason: context.reason,
    },
  });
}

/**
 * Record incident resolution
 */
export async function recordIncidentResolved(
  context: AuditContext & { reason?: string }
): Promise<void> {
  await logAuditEvent({
    incidentId: context.incidentId,
    actor: context.actor || 'system',
    action: 'incident_resolved',
    metadata: {
      reason: context.reason,
    },
  });
}

/**
 * Record system error
 */
export async function recordSystemError(
  context: AuditContext & { error: Error | string; stage?: string }
): Promise<void> {
  await logAuditEvent({
    incidentId: context.incidentId,
    actor: 'system',
    action: 'system_error',
    metadata: {
      error: typeof context.error === 'string' ? context.error : context.error.message,
      stack: typeof context.error === 'object' ? context.error.stack : undefined,
      stage: context.stage,
    },
  });
}
