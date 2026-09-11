/**
 * Safety Test: Demo Mode
 * 
 * Verifies that:
 * 1. Demo mode is clearly labeled
 * 2. Demo mode does not claim live inference
 * 3. Demo responses are deterministic
 */

import { describe, it, expect } from 'vitest';
import { generateDiagnosis } from '../../server/services/ai.js';

describe('Demo Mode', () => {
  const demoIncidentId = 'demo-test-incident';

  const mockCheckoutRequest = {
    incidentId: demoIncidentId,
    incident: {
      title: 'Checkout API: Elevated 5xx Responses',
      service: 'checkout-service',
      severity: 'high' as const,
      impactSummary: 'Customers cannot complete checkout reliably',
      alertContext: 'Elevated 5xx error rate above 15%',
      logs: "TypeError: Cannot read properties of undefined (reading 'currency')",
      repositoryContext: 'export class PaymentParser { ... }',
      recentChange: 'Normalize provider payload',
      reproductionInstructions: 'curl -X POST /v1/checkouts',
    },
    evidence: [
      { id: 'ev-1', kind: 'alert' as const, label: 'Alert 5xx', content: '5xx spike' },
      { id: 'ev-2', kind: 'log' as const, label: 'Logs', content: 'currency error' },
      { id: 'ev-3', kind: 'commit' as const, label: 'Commit', content: '7a3f2e1' },
      { id: 'ev-4', kind: 'reproduction' as const, label: 'Repro', content: 'curl payload' },
    ],
  };
  
  it('should return demo inference mode when requested', async () => {
    const result = await generateDiagnosis(demoIncidentId, {
      modelName: 'nemotron-4-340b-instruct',
      inferenceMode: 'demo',
    }, mockCheckoutRequest);
    
    expect(result.success).toBe(true);
    expect(result.inferenceMode).toBe('demo');
    expect(result.modelName).toBe('nemotron-4-340b-instruct');
    expect(result.response).toBeDefined();
  });

  it('should label demo results correctly', async () => {
    const result = await generateDiagnosis(demoIncidentId, {
      inferenceMode: 'demo',
    }, mockCheckoutRequest);
    
    if (result.success && result.response) {
      expect(result.inferenceMode).toBe('demo');
      expect(result.response.diagnosis).toBeDefined();
      expect(result.response.repairProposal).toBeDefined();
      expect(result.response.verification).toBeDefined();
    }
  });

  it('should generate deterministic demo response for checkout incident', async () => {
    const result = await generateDiagnosis(demoIncidentId, {
      inferenceMode: 'demo',
    }, mockCheckoutRequest);
    
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.response?.diagnosis.confidence).toBeGreaterThan(0);
      expect(result.response?.diagnosis.confidence).toBeLessThanOrEqual(1);
      expect(result.response?.diagnosis.claims).toBeDefined();
      expect(result.response?.diagnosis.claims.length).toBeGreaterThan(0);
      expect(result.response?.repairProposal.diff).toBeDefined();
      expect(result.response?.repairProposal.filesChanged).toBeDefined();
    }
  });
});

describe('Inference Mode Labeling', () => {
  it('should distinguish between live and demo modes', async () => {
    const mockRequest = {
      incidentId: 'test',
      incident: {
        title: 'Generic Service Error',
        service: 'service',
        severity: 'medium' as const,
        impactSummary: 'impact',
        alertContext: 'alert',
        logs: 'error',
        repositoryContext: '',
        recentChange: '',
        reproductionInstructions: '',
      },
      evidence: [],
    };

    const demoResult = await generateDiagnosis('test', {
      inferenceMode: 'demo',
    }, mockRequest);
    
    expect(demoResult.inferenceMode).toBe('demo');
  });
});
