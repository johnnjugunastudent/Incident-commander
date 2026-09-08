// Shared types between client and server

// Relationship types for evidence graph
export type EvidenceRelationshipType = 'supports' | 'contradicts' | 'references' | 'derived_from';

export type IncidentStatus =
  | 'open'
  | 'investigating'
  | 'awaiting_review'
  | 'resolved'
  | 'closed';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'informational';

export type InvestigationStage =
  | 'detection'
  | 'investigation'
  | 'reproduction'
  | 'diagnosis'
  | 'repair'
  | 'verification';

export type InvestigationStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

export type EvidenceKind =
  | 'alert'
  | 'log'
  | 'source'
  | 'commit'
  | 'reproduction'
  | 'test'
  | 'model_claim';

export type ApprovalStatus =
  | 'proposed'
  | 'approved'
  | 'rejected'
  | 'superseded';

export type VerificationStatus =
  | 'not_run'
  | 'running'
  | 'passed'
  | 'failed'
  | 'partial';

export interface DiagnosisRequest {
  incidentId: string;
  incident: {
    title: string;
    service: string;
    severity: Severity;
    impactSummary: string;
    alertContext: string;
    logs: string;
    repositoryContext: string;
    recentChange: string;
    reproductionInstructions: string;
  };
  evidence: Array<{
    id: string;
    kind: EvidenceKind;
    label: string;
    content: string;
    sourcePath?: string;
    lineRange?: string;
  }>;
}

export interface DiagnosisResponse {
  diagnosis: {
    summary: string;
    confidence: number;
    claims: Array<{
      text: string;
      evidenceIds: string[];
    }>;
    limitations: string;
  };
  repairProposal: {
    summary: string;
    diff: string;
    filesChanged: string[];
  };
  verification: {
    commands: string[];
    output: string;
    status: 'passed' | 'failed' | 'not_run';
  };
}

export interface ModelInferenceResult {
  response: DiagnosisResponse;
  modelName: string;
  inferenceMode: 'live' | 'demo';
  latencyMs: number;
}

export interface IncidentWithRelations {
  id: string;
  title: string;
  service: string;
  severity: Severity;
  status: IncidentStatus;
  impactSummary: string;
  alertContext: string;
  logs: string;
  repositoryContext: string;
  recentChange: string;
  reproductionInstructions: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  investigationEvents?: InvestigationEvent[];
  evidence?: Evidence[];
  rootCauseReport?: RootCauseReport | null;
  patchReview?: PatchReview | null;
}

export interface InvestigationEvent {
  id: string;
  incidentId: string;
  stage: InvestigationStage;
  status: InvestigationStatus;
  summary: string;
  detail?: string;
  evidenceIds: string[];
  createdAt: Date;
}

export interface Evidence {
  id: string;
  incidentId: string;
  kind: EvidenceKind;
  label: string;
  content: string;
  sourcePath?: string;
  lineRange?: string;
  createdAt: Date;
}

export interface RootCauseReport {
  id: string;
  incidentId: string;
  summary: string;
  confidence: number;
  claims: Array<{
    text: string;
    evidenceIds: string[];
  }>;
  limitations: string;
  modelName: string;
  inferenceMode: 'live' | 'demo';
  createdAt: Date;
}

export interface PatchReview {
  id: string;
  incidentId: string;
  summary: string;
  diff: string;
  filesChanged: string[];
  confidence: number;
  verificationStatus: VerificationStatus;
  approvalStatus: ApprovalStatus;
  verificationOutput?: string;
  reviewerId?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  approvalDisabled?: boolean;
}

export interface AuditLogEntry {
  id: string;
  incidentId: string;
  actor: string;
  action: string;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface TelemetryData {
  service: string;
  severity: string;
  status: string;
  fivexxRate: number;
  totalRequests: number;
  failedRequests: number;
  successfulRequests: number;
  avgResponseTime: number;
  activeIncidents: number;
  investigatingCount: number;
  awaitingReviewCount: number;
  resolvedCount: number;
  evidenceCount: number;
  _demoData?: boolean;
}

export interface InvestigationProgress {
  incidentStatus: IncidentStatus;
  stages: Array<{
    stage: InvestigationStage;
    status: InvestigationStatus;
    completed: boolean;
  }>;
  progress: number;
  evidenceCount: number;
}
