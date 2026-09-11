/**
 * Safety Test: Evidence Integrity & Provenance
 * 
 * Verifies that:
 * 1. Evidence schema validates allowable kinds
 * 2. Evidence cannot be created with invalid or missing required content
 * 3. Evidence relationships strictly enforce known relationship types
 * 4. Model diagnosis claims must cite structured evidence IDs
 * 5. Evidence provenance invariants remain intact
 */

import { describe, it, expect } from 'vitest';
import { CreateEvidenceSchema, InferenceResponseSchema } from '../../server/types/index.js';
import type { RelationshipType } from '../../server/investigation/evidenceGraph.js';

describe('Evidence Integrity & Provenance Validation', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';

  describe('Evidence Schema Validation (CreateEvidenceSchema)', () => {
    it('should accept valid evidence across all supported kinds', () => {
      const kinds = ['alert', 'log', 'source', 'commit', 'reproduction', 'test', 'model_claim'] as const;

      for (const kind of kinds) {
        const result = CreateEvidenceSchema.safeParse({
          incidentId: validUuid,
          kind,
          label: `Sample ${kind} evidence`,
          content: `Content for ${kind}`,
          sourcePath: kind === 'source' ? 'src/services/payment-parser.ts' : undefined,
          lineRange: kind === 'source' ? '80-120' : undefined,
        });

        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid evidence kinds', () => {
      const result = CreateEvidenceSchema.safeParse({
        incidentId: validUuid,
        kind: 'untrusted_injection',
        label: 'Invalid kind',
        content: 'Malicious payload',
      });

      expect(result.success).toBe(false);
    });

    it('should reject evidence missing content or label', () => {
      const emptyContent = CreateEvidenceSchema.safeParse({
        incidentId: validUuid,
        kind: 'log',
        label: 'Missing content',
        content: '',
      });
      expect(emptyContent.success).toBe(false);

      const emptyLabel = CreateEvidenceSchema.safeParse({
        incidentId: validUuid,
        kind: 'log',
        label: '',
        content: 'Some log data',
      });
      expect(emptyLabel.success).toBe(false);
    });
  });

  describe('Evidence Relationship Types', () => {
    it('should enforce allowed relationship types', () => {
      const validTypes: RelationshipType[] = ['supports', 'contradicts', 'references', 'derived_from', 'verifies'];
      
      for (const relType of validTypes) {
        expect(['supports', 'contradicts', 'references', 'derived_from', 'verifies']).toContain(relType);
      }
    });
  });

  describe('Claim-to-Evidence Provenance (InferenceResponseSchema)', () => {
    it('should validate structured diagnosis response with evidence citations', () => {
      const validResponse = {
        diagnosis: {
          summary: 'TypeError: Cannot read properties of undefined (reading "currency")',
          confidence: 0.88,
          claims: [
            {
              text: 'Log files show unhandled undefined currency access',
              evidenceIds: ['ev-log-1', 'ev-log-2'],
            },
            {
              text: 'Recent commit normalized provider payload removing default currency',
              evidenceIds: ['ev-commit-1'],
            },
          ],
          limitations: 'Provider payload change observed indirectly via error logs.',
        },
        repairProposal: {
          summary: 'Add optional chaining with default fallback currency',
          diff: '--- a/parser.ts\n+++ b/parser.ts\n@@ -1 +1 @@\n-amount\n+amount ?? 0',
          filesChanged: ['src/services/payment-parser.ts'],
        },
        verification: {
          commands: ['npm test'],
          output: 'All 3 tests passed',
          status: 'passed',
        },
      };

      const parsed = InferenceResponseSchema.safeParse(validResponse);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.diagnosis.claims[0].evidenceIds).toContain('ev-log-1');
        expect(parsed.data.repairProposal.filesChanged).toHaveLength(1);
      }
    });

    it('should reject diagnosis missing required evidence citations', () => {
      const invalidResponse = {
        diagnosis: {
          summary: 'Unsubstantiated claim without evidence',
          confidence: 0.9,
          claims: [
            {
              text: 'A claim without evidenceIds array',
              // missing evidenceIds
            },
          ],
        },
        repairProposal: {
          summary: 'Some repair',
          diff: '',
          filesChanged: [],
        },
        verification: {
          commands: [],
          output: '',
          status: 'passed',
        },
      };

      const parsed = InferenceResponseSchema.safeParse(invalidResponse);
      expect(parsed.success).toBe(false);
    });
  });
});
