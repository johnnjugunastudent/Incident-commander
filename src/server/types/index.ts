import { z } from 'zod';
import type {
  IncidentStatus,
  Severity,
  InvestigationStage,
  InvestigationStatus,
  EvidenceKind,
  ApprovalStatus,
  VerificationStatus,
} from '../../shared/types.js';

// Input schemas
export const CreateIncidentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  service: z.string().min(1, 'Service name is required').max(255),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'informational']).default('medium'),
  impactSummary: z.string().min(1, 'Impact summary is required'),
  alertContext: z.string().min(1, 'Alert context is required'),
  logs: z.string().optional(),
  repositoryContext: z.string().optional(),
  recentChange: z.string().optional(),
  reproductionInstructions: z.string().optional(),
});

export const GetIncidentSchema = z.object({
  id: z.string().uuid(),
});

export const UpdateIncidentStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['open', 'investigating', 'awaiting_review', 'resolved', 'closed']),
});

export const CreateEvidenceSchema = z.object({
  incidentId: z.string().uuid(),
  kind: z.enum(['alert', 'log', 'source', 'commit', 'reproduction', 'test', 'model_claim']),
  label: z.string().min(1).max(255),
  content: z.string().min(1),
  sourcePath: z.string().optional(),
  lineRange: z.string().optional(),
});

export const CreateInvestigationEventSchema = z.object({
  incidentId: z.string().uuid(),
  stage: z.enum(['detection', 'investigation', 'reproduction', 'diagnosis', 'repair', 'verification']),
  status: z.enum(['queued', 'running', 'completed', 'failed', 'skipped']).default('queued'),
  summary: z.string().min(1),
  detail: z.string().optional(),
  evidenceIds: z.array(z.string()).default([]),
});

export const ApprovePatchSchema = z.object({
  incidentId: z.string().uuid(),
  reviewerId: z.string().min(1),
  reason: z.string().optional(),
});

export const RejectPatchSchema = ApprovePatchSchema;

// Type exports
export type CreateIncidentInput = z.infer<typeof CreateIncidentSchema>;
export type GetIncidentInput = z.infer<typeof GetIncidentSchema>;
export type UpdateIncidentStatusInput = z.infer<typeof UpdateIncidentStatusSchema>;
export type CreateEvidenceInput = z.infer<typeof CreateEvidenceSchema>;
export type CreateInvestigationEventInput = z.infer<typeof CreateInvestigationEventSchema>;
export type ApprovePatchInput = z.infer<typeof ApprovePatchSchema>;
export type RejectPatchInput = z.infer<typeof RejectPatchSchema>;

// Inference response schema
export const InferenceResponseSchema = z.object({
  diagnosis: z.object({
    summary: z.string(),
    confidence: z.number().min(0).max(1),
    claims: z.array(z.object({
      text: z.string(),
      evidenceIds: z.array(z.string()),
    })),
    limitations: z.string().optional(),
  }),
  repairProposal: z.object({
    summary: z.string(),
    diff: z.string(),
    filesChanged: z.array(z.string()),
  }),
  verification: z.object({
    commands: z.array(z.string()),
    output: z.string(),
    status: z.enum(['passed', 'failed', 'not_run']).default('not_run'),
  }),
});

export type InferenceResponse = z.infer<typeof InferenceResponseSchema>;
