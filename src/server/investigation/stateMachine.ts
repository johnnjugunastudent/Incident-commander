/**
 * Investigation State Machine
 * 
 * Enforces valid incident lifecycle transitions server-side.
 * The frontend must not be trusted to enforce workflow rules.
 */

import type { IncidentStatus, InvestigationStage, InvestigationStatus } from '../../shared/types.js';

// Valid incident status transitions
const VALID_INCIDENT_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  open: ['investigating', 'closed'],
  investigating: ['awaiting_review', 'closed'],
  awaiting_review: ['resolved', 'closed'],
  resolved: ['closed'],
  closed: [],
};

// Valid stage sequences (each stage must complete in order)
const VALID_STAGE_TRANSITIONS: Record<InvestigationStage | 'pending', InvestigationStage[]> = {
  pending: ['detection'],
  detection: ['investigation'],
  investigation: ['reproduction'],
  reproduction: ['diagnosis'],
  diagnosis: ['repair'],
  repair: ['verification'],
  verification: [],
};

// Valid stage status transitions
const VALID_STAGE_STATUS_TRANSITIONS: Record<InvestigationStatus, InvestigationStatus[]> = {
  queued: ['running', 'failed', 'skipped'],
  running: ['completed', 'failed'],
  completed: [],
  failed: [],
  skipped: [],
};

/**
 * Check if an incident status transition is valid
 */
export function canTransitionStatus(
  currentStatus: IncidentStatus,
  newStatus: IncidentStatus
): { valid: boolean; error?: string } {
  const validTransitions = VALID_INCIDENT_TRANSITIONS[currentStatus];
  
  if (!validTransitions.includes(newStatus)) {
    return {
      valid: false,
      error: `Invalid status transition from "${currentStatus}" to "${newStatus}". Valid transitions: ${validTransitions.join(', ') || 'none (terminal state)'}`,
    };
  }
  
  return { valid: true };
}

/**
 * Check if an investigation stage can start
 */
export function canStartStage(
  currentStage: InvestigationStage | 'pending',
  newStage: InvestigationStage
): { valid: boolean; error?: string } {
  const validTransitions = VALID_STAGE_TRANSITIONS[currentStage];
  
  if (!validTransitions.includes(newStage)) {
    return {
      valid: false,
      error: `Cannot start stage "${newStage}" after "${currentStage}". Must follow sequence: detection → investigation → reproduction → diagnosis → repair → verification`,
    };
  }
  
  return { valid: true };
}

/**
 * Check if a stage status transition is valid
 */
export function canTransitionStageStatus(
  currentStatus: InvestigationStatus,
  newStatus: InvestigationStatus
): { valid: boolean; error?: string } {
  const validTransitions = VALID_STAGE_STATUS_TRANSITIONS[currentStatus];
  
  if (!validTransitions.includes(newStatus)) {
    return {
      valid: false,
      error: `Invalid stage status transition from "${currentStatus}" to "${newStatus}"`,
    };
  }
  
  return { valid: true };
}

/**
 * Get the next expected stage after a given stage
 */
export function getNextStage(currentStage: InvestigationStage): InvestigationStage | null {
  const next = VALID_STAGE_TRANSITIONS[currentStage];
  return next.length > 0 ? next[0] : null;
}

/**
 * Get all stages in order
 */
export function getStageOrder(): InvestigationStage[] {
  return ['detection', 'investigation', 'reproduction', 'diagnosis', 'repair', 'verification'];
}

/**
 * Get the progress percentage based on completed stages
 */
export function calculateProgress(completedStages: InvestigationStage[]): number {
  const totalStages = getStageOrder().length;
  const completedCount = completedStages.length;
  return Math.round((completedCount / totalStages) * 100);
}

/**
 * Check if an incident is in a terminal state
 */
export function isTerminalStatus(status: IncidentStatus): boolean {
  return status === 'closed';
}

/**
 * Check if an incident can have investigation started
 */
export function canStartInvestigation(status: IncidentStatus): boolean {
  return status === 'open' || status === 'investigating';
}

/**
 * Check if an incident can be approved
 */
export function canApprove(status: IncidentStatus, approvalStatus: string): boolean {
  return status === 'awaiting_review' && approvalStatus === 'proposed';
}

/**
 * Check if an incident can be rejected
 */
export function canReject(status: IncidentStatus, approvalStatus: string): boolean {
  return status === 'awaiting_review' && approvalStatus === 'proposed';
}
