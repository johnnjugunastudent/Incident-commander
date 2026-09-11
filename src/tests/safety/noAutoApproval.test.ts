/**
 * Safety Test: No Automatic Approval
 * 
 * Verifies that:
 * 1. Patch creation never auto-approves
 * 2. Verification passing never auto-approves
 * 3. Confidence score never auto-approves
 * 4. Only explicit human action can approve
 * 5. State machine strictly enforces valid lifecycle transitions
 */

import { describe, it, expect } from 'vitest';
import { validateNoAutoApproval } from '../../server/security/approvalPolicy.js';
import { 
  canApprove, 
  canReject, 
  canTransitionStatus, 
  isTerminalStatus,
  canStartInvestigation
} from '../../server/investigation/stateMachine.js';

describe('No Auto-Approval Safety Policy', () => {
  describe('validateNoAutoApproval', () => {
    it('should reject non-human approval attempts', () => {
      // AI or automated worker trying to set approved
      const result = validateNoAutoApproval('approved', 'passed', false);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Safety violation');
      expect(result.error).toContain('explicit human action');
    });

    it('should maintain proposed status when verification passes', () => {
      // Verification completed with 100% tests passing, patch MUST remain proposed
      const result = validateNoAutoApproval('proposed', 'passed', false);
      expect(result.valid).toBe(true);
    });

    it('should allow human approval when in proposed state', () => {
      // Explicit human reviewer clicking Approve
      const result = validateNoAutoApproval('approved', 'passed', true);
      expect(result.valid).toBe(true);
    });

    it('should never auto-approve even with perfect confidence score', () => {
      // System simulation: confidence = 1.0, tests = passed, but automated = false
      const isHuman = false;
      const proposedStatus = 'proposed';
      const result = validateNoAutoApproval(proposedStatus, 'passed', isHuman);
      expect(result.valid).toBe(true);

      // Attempting to bypass gate to 'approved' without human
      const bypassAttempt = validateNoAutoApproval('approved', 'passed', isHuman);
      expect(bypassAttempt.valid).toBe(false);
    });
  });

  describe('Approval Gate Preconditions (canApprove)', () => {
    it('should ONLY allow approval when incident status is awaiting_review AND patch is proposed', () => {
      // Valid condition
      expect(canApprove('awaiting_review', 'proposed')).toBe(true);

      // Invalid incident statuses
      expect(canApprove('open', 'proposed')).toBe(false);
      expect(canApprove('investigating', 'proposed')).toBe(false);
      expect(canApprove('resolved', 'proposed')).toBe(false);
      expect(canApprove('closed', 'proposed')).toBe(false);

      // Invalid patch approval statuses (already decided)
      expect(canApprove('awaiting_review', 'approved')).toBe(false);
      expect(canApprove('awaiting_review', 'rejected')).toBe(false);
      expect(canApprove('awaiting_review', 'superseded')).toBe(false);
    });

    it('should ONLY allow rejection when incident status is awaiting_review AND patch is proposed', () => {
      // Valid condition
      expect(canReject('awaiting_review', 'proposed')).toBe(true);

      // Invalid conditions
      expect(canReject('open', 'proposed')).toBe(false);
      expect(canReject('investigating', 'proposed')).toBe(false);
      expect(canReject('resolved', 'proposed')).toBe(false);
      expect(canReject('awaiting_review', 'rejected')).toBe(false);
    });
  });

  describe('Incident State Machine Transition Safety', () => {
    it('should enforce strict sequential lifecycle progression', () => {
      // Valid transitions
      expect(canTransitionStatus('open', 'investigating').valid).toBe(true);
      expect(canTransitionStatus('investigating', 'awaiting_review').valid).toBe(true);
      expect(canTransitionStatus('awaiting_review', 'resolved').valid).toBe(true);
      expect(canTransitionStatus('resolved', 'closed').valid).toBe(true);
    });

    it('should prevent bypassing human review straight to resolved', () => {
      // Cannot jump from open or investigating directly to resolved
      expect(canTransitionStatus('open', 'resolved').valid).toBe(false);
      expect(canTransitionStatus('investigating', 'resolved').valid).toBe(false);
    });

    it('should prevent reopening from terminal states without authorized workflow', () => {
      expect(canTransitionStatus('closed', 'open').valid).toBe(false);
      expect(canTransitionStatus('closed', 'investigating').valid).toBe(false);
      expect(isTerminalStatus('closed')).toBe(true);
    });

    it('should only allow investigation to start for open or investigating incidents', () => {
      expect(canStartInvestigation('open')).toBe(true);
      expect(canStartInvestigation('investigating')).toBe(true);
      expect(canStartInvestigation('awaiting_review')).toBe(false);
      expect(canStartInvestigation('resolved')).toBe(false);
      expect(canStartInvestigation('closed')).toBe(false);
    });
  });
});
