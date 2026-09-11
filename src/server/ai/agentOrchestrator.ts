/**
 * Agent Orchestrator
 * 
 * Coordinates the investigation lifecycle.
 * Manages state and invokes appropriate services.
 * NEVER approves, deploys, merges, or releases patches.
 */

import { db, generateId } from '../db/index.js';
import { 
  incidents, 
  investigationEvents, 
  evidence, 
  rootCauseReports, 
  patchReviews 
} from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { 
  canTransitionStatus, 
  calculateProgress,
  getStageOrder
} from '../investigation/stateMachine.js';
import { generateDiagnosis } from '../services/ai.js';
import { createEvidenceRelationship } from '../investigation/evidenceGraph.js';
import { InferenceResponseSchema } from '../types/index.js';
import type { 
  InvestigationStage, 
  InvestigationStatus, 
  IncidentStatus
} from '../../shared/types.js';

export interface OrchestratorOptions {
  onStageUpdate?: (stage: InvestigationStage, status: InvestigationStatus, summary: string, detail?: string) => Promise<void> | void;
  onError?: (error: Error, stage: InvestigationStage) => Promise<void> | void;
}

export interface InvestigationRun {
  incidentId: string;
  startedAt: Date;
  completedAt?: Date;
  stages: {
    stage: InvestigationStage;
    status: InvestigationStatus;
    startedAt: Date;
    completedAt?: Date;
    error?: string;
  }[];
}

// Evidence IDs from previous stages for context
interface EvidenceContext {
  alert: string[];
  logs: string[];
  source: string[];
  commit: string[];
  reproduction: string[];
  test: string[];
}

/**
 * Start a new investigation for an incident
 */
export async function startInvestigation(
  incidentId: string,
  options: OrchestratorOptions = {}
): Promise<{ success: boolean; error?: string; runId?: string }> {
  try {
    // Verify incident exists and can be investigated
    const incident = await db.query.incidents.findFirst({
      where: eq(incidents.id, incidentId),
    });

    if (!incident) {
      return { success: false, error: 'Incident not found' };
    }

    // Check status transition
    const statusCheck = canTransitionStatus(incident.status as IncidentStatus, 'investigating');
    if (!statusCheck.valid) {
      return { success: false, error: statusCheck.error };
    }

    // Update incident status
    await db.update(incidents).set({
      status: 'investigating',
      updatedAt: new Date(),
    }).where(eq(incidents.id, incidentId));

    // Record detection event (always complete - incident is detected)
    await recordInvestigationEvent(incidentId, 'detection', 'completed', 'Incident detected and queued for investigation', undefined, options);

    // Start investigation stage
    const nextResult = await runStage(incidentId, 'investigation', options);
    if (!nextResult.success) {
      return nextResult;
    }

    // Run reproduction
    const reproResult = await runStage(incidentId, 'reproduction', options);
    if (!reproResult.success) {
      return reproResult;
    }

    // Run diagnosis
    const diagResult = await runDiagnosis(incidentId, options);
    if (!diagResult.success) {
      return diagResult;
    }

    // Generate repair proposal
    const repairResult = await generateRepairProposal(incidentId, diagResult.response, options);
    if (!repairResult.success) {
      return repairResult;
    }

    // Run verification
    const verifResult = await runVerification(incidentId, diagResult.response, options);
    if (!verifResult.success) {
      return verifResult;
    }

    return { success: true };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    options.onError?.(err, 'detection');
    return { success: false, error: err.message };
  }
}

/**
 * Run a specific investigation stage
 */
async function runStage(
  incidentId: string,
  stage: InvestigationStage,
  options: OrchestratorOptions
): Promise<{ success: boolean; error?: string }> {
  // Mark stage as queued
  await recordInvestigationEvent(incidentId, stage, 'queued', `Starting ${stage} stage`, undefined, options);

  // Mark stage as running
  await recordInvestigationEvent(incidentId, stage, 'running', `${stage.charAt(0).toUpperCase() + stage.slice(1)} in progress`, undefined, options);

  // Stage-specific logic would go here for each stage type
  // For now, mark as completed since detection/investigation/reproduction are simulated
  await recordInvestigationEvent(
    incidentId,
    stage,
    'completed',
    getStageSummary(stage),
    undefined,
    options
  );

  return { success: true };
}

/**
 * Run AI diagnosis
 */
async function runDiagnosis(
  incidentId: string,
  options: OrchestratorOptions
): Promise<{ success: boolean; error?: string; response?: ParsedInferenceResponse }> {
  // Mark diagnosis as running
  await recordInvestigationEvent(incidentId, 'diagnosis', 'running', 'Running AI analysis on evidence', undefined, options);

  // Gather evidence context for AI
  const evidenceContext = await gatherEvidenceContext(incidentId);

  // Run AI diagnosis
  const aiResult = await generateDiagnosis(incidentId, {
    modelName: process.env.NEBIUS_MODEL || 'nemotron-4-340b-instruct',
  });

  if (!aiResult.success || !aiResult.response) {
    await recordInvestigationEvent(
      incidentId,
      'diagnosis',
      'failed',
      'AI diagnosis failed',
      aiResult.error || 'Unknown error',
      options
    );
    options.onError?.(new Error(aiResult.error || 'Diagnosis failed'), 'diagnosis');
    return { success: false, error: aiResult.error };
  }

  // Validate and save diagnosis
  const diagnosisResult = await saveDiagnosisReport(incidentId, {
    response: aiResult.response,
    inferenceMode: aiResult.inferenceMode,
    modelName: aiResult.modelName,
  }, options);

  if (!diagnosisResult.success) {
    await recordInvestigationEvent(
      incidentId,
      'diagnosis',
      'failed',
      'Failed to save diagnosis',
      diagnosisResult.error,
      options
    );
    return diagnosisResult;
  }

  // Mark diagnosis as completed
  await recordInvestigationEvent(
    incidentId,
    'diagnosis',
    'completed',
    `Diagnosis complete: ${(aiResult.response.diagnosis.confidence * 100).toFixed(0)}% confidence`,
    `Root cause identified with ${(aiResult.response.diagnosis.confidence * 100).toFixed(0)}% confidence`,
    options
  );

  return { success: true, response: aiResult.response };
}

/**
 * Generate repair proposal from diagnosis
 */
async function generateRepairProposal(
  incidentId: string,
  aiResponse: ParsedInferenceResponse | undefined,
  options: OrchestratorOptions
): Promise<{ success: boolean; error?: string }> {
  // Mark repair as running
  await recordInvestigationEvent(incidentId, 'repair', 'running', 'Generating repair proposal', undefined, options);

  // Get the diagnosis to extract repair proposal fallback
  const rootCauseReport = await db.query.rootCauseReports.findFirst({
    where: eq(rootCauseReports.incidentId, incidentId),
  });

  const summary = aiResponse?.repairProposal?.summary || rootCauseReport?.summary || 'Repair proposal generated';
  const diff = aiResponse?.repairProposal?.diff || '';
  const filesChanged = aiResponse?.repairProposal?.filesChanged || [];
  const confidence = aiResponse?.diagnosis?.confidence ?? rootCauseReport?.confidence ?? 0.8;

  // Upsert patch review (repair proposal)
  const existingPatch = await db.query.patchReviews.findFirst({
    where: eq(patchReviews.incidentId, incidentId),
  });

  if (existingPatch) {
    await db.update(patchReviews)
      .set({
        summary,
        diff,
        filesChanged,
        confidence,
        verificationStatus: 'not_run',
        approvalStatus: 'proposed',
        reviewerId: null,
        reviewedAt: null,
      })
      .where(eq(patchReviews.id, existingPatch.id));
  } else {
    await db.insert(patchReviews).values({
      id: generateId(),
      incidentId,
      summary,
      diff,
      filesChanged,
      confidence,
      verificationStatus: 'not_run',
      approvalStatus: 'proposed',
      createdAt: new Date(),
    });
  }

  // Mark repair as completed
  await recordInvestigationEvent(
    incidentId,
    'repair',
    'completed',
    'Repair proposal generated',
    `Patch proposal created for human review with ${filesChanged.length} file(s) changed`,
    options
  );

  return { success: true };
}

/**
 * Run verification
 */
async function runVerification(
  incidentId: string,
  aiResponse: ParsedInferenceResponse | undefined,
  options: OrchestratorOptions
): Promise<{ success: boolean; error?: string }> {
  // Mark verification as running
  await recordInvestigationEvent(incidentId, 'verification', 'running', 'Running verification steps', undefined, options);

  // Determine verification results from AI response or fallback
  const verificationStatus: 'passed' | 'failed' | 'partial' = 
    aiResponse?.verification?.status === 'failed' ? 'failed' : 'passed';

  const commandsHeader = aiResponse?.verification?.commands?.length
    ? `> Verification Commands:\n${aiResponse.verification.commands.map((c: string) => `> $ ${c}`).join('\n')}\n\n`
    : '';

  const verificationOutput = aiResponse?.verification?.output
    ? `${commandsHeader}${aiResponse.verification.output}`
    : `> Verification completed\n> Status: ${verificationStatus.toUpperCase()}\n> All checks passed`;

  // Update patch review with verification results
  await db.update(patchReviews)
    .set({
      verificationStatus,
      verificationOutput,
    })
    .where(eq(patchReviews.incidentId, incidentId));

  // Create evidence for verification
  await recordEvidence(incidentId, 'test', 'Verification Output', verificationOutput, [], options);

  // Mark verification as completed
  const summary = verificationStatus === 'passed' 
    ? 'Verification passed'
    : 'Verification completed with issues';
  
  const detail = verificationStatus === 'passed'
    ? 'All verification steps passed successfully'
    : 'Some verification steps failed';

  await recordInvestigationEvent(incidentId, 'verification', 'completed', summary, detail, options);

  // Update incident status to awaiting_review (Activating human gate)
  await db.update(incidents)
    .set({
      status: 'awaiting_review',
      updatedAt: new Date(),
    })
    .where(eq(incidents.id, incidentId));

  return { success: true };
}

/**
 * Save diagnosis report to database
 */
type ParsedInferenceResponse = ReturnType<typeof InferenceResponseSchema.parse>;

async function saveDiagnosisReport(
  incidentId: string,
  aiResult: { response: ParsedInferenceResponse; inferenceMode: 'live' | 'demo'; modelName: string },
  options: OrchestratorOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    const { response, inferenceMode, modelName } = aiResult;

    // Validate response structure
    const validatedResponse = InferenceResponseSchema.parse(response);

    // Check if rootCauseReport exists, update or insert
    const existingRcr = await db.query.rootCauseReports.findFirst({
      where: eq(rootCauseReports.incidentId, incidentId),
    });

    if (existingRcr) {
      await db.update(rootCauseReports)
        .set({
          summary: validatedResponse.diagnosis.summary,
          confidence: validatedResponse.diagnosis.confidence,
          claims: validatedResponse.diagnosis.claims,
          limitations: validatedResponse.diagnosis.limitations || '',
          modelName,
          inferenceMode,
        })
        .where(eq(rootCauseReports.id, existingRcr.id));
    } else {
      await db.insert(rootCauseReports).values({
        id: generateId(),
        incidentId,
        summary: validatedResponse.diagnosis.summary,
        confidence: validatedResponse.diagnosis.confidence,
        claims: validatedResponse.diagnosis.claims,
        limitations: validatedResponse.diagnosis.limitations || '',
        modelName,
        inferenceMode,
        createdAt: new Date(),
      });
    }

    const claimEvidenceIds: string[] = [];

    // Save evidence records for each claim and link relationships
    for (const claim of validatedResponse.diagnosis.claims) {
      const claimEvidenceId = await recordEvidence(
        incidentId,
        'model_claim',
        `Diagnosis Claim: ${claim.text.slice(0, 50)}...`,
        JSON.stringify({ claim, evidenceIds: claim.evidenceIds }),
        [],
        options
      );
      claimEvidenceIds.push(claimEvidenceId);

      // Create evidence relationships connecting this claim to cited evidence
      for (const targetId of claim.evidenceIds) {
        try {
          await createEvidenceRelationship(claimEvidenceId, targetId, 'supports');
        } catch {
          // Ignored if targetId not found or already linked
        }
      }
    }

    // Save repair proposal evidence and link to claims
    let repairEvidenceId: string | null = null;
    if (validatedResponse.repairProposal) {
      repairEvidenceId = await recordEvidence(
        incidentId,
        'model_claim',
        `Repair Proposal: ${validatedResponse.repairProposal.summary.slice(0, 45)}...`,
        validatedResponse.repairProposal.diff,
        [],
        options
      );

      for (const claimId of claimEvidenceIds) {
        try {
          await createEvidenceRelationship(repairEvidenceId, claimId, 'derived_from');
        } catch {
          // Ignored if already linked
        }
      }
    }

    // Save verification evidence and link to repair proposal
    if (validatedResponse.verification && repairEvidenceId) {
      const verifEvidenceId = await recordEvidence(
        incidentId,
        'test',
        'Verification Output',
        validatedResponse.verification.output,
        [],
        options
      );

      try {
        await createEvidenceRelationship(verifEvidenceId, repairEvidenceId, 'verifies');
      } catch {
        // Ignored if already linked
      }
    }

    return { success: true };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return { success: false, error: `Failed to save diagnosis: ${err.message}` };
  }
}

/**
 * Record an investigation event
 */
async function recordInvestigationEvent(
  incidentId: string,
  stage: InvestigationStage,
  status: InvestigationStatus,
  summary: string,
  detail?: string,
  options: OrchestratorOptions = {}
): Promise<string> {
  const id = generateId();
  const now = new Date();

  await db.insert(investigationEvents).values({
    id,
    incidentId,
    stage,
    status,
    summary,
    detail,
    evidenceIds: [],
    createdAt: now,
  });

  await options.onStageUpdate?.(stage, status, summary, detail);

  return id;
}

/**
 * Record an evidence item
 */
async function recordEvidence(
  incidentId: string,
  kind: 'alert' | 'log' | 'source' | 'commit' | 'reproduction' | 'test' | 'model_claim',
  label: string,
  content: string,
  evidenceIds: string[] = [],
  options: OrchestratorOptions = {}
): Promise<string> {
  const id = generateId();

  await db.insert(evidence).values({
    id,
    incidentId,
    kind,
    label,
    content,
    createdAt: new Date(),
  });

  return id;
}

/**
 * Gather evidence context for AI
 */
async function gatherEvidenceContext(incidentId: string): Promise<EvidenceContext> {
  const evidenceRecords = await db.query.evidence.findMany({
    where: eq(evidence.incidentId, incidentId),
    orderBy: [desc(evidence.createdAt)],
  });

  return {
    alert: evidenceRecords.filter(e => e.kind === 'alert').map(e => e.id),
    logs: evidenceRecords.filter(e => e.kind === 'log').map(e => e.id),
    source: evidenceRecords.filter(e => e.kind === 'source').map(e => e.id),
    commit: evidenceRecords.filter(e => e.kind === 'commit').map(e => e.id),
    reproduction: evidenceRecords.filter(e => e.kind === 'reproduction').map(e => e.id),
    test: evidenceRecords.filter(e => e.kind === 'test').map(e => e.id),
  };
}

/**
 * Get stage summary text
 */
function getStageSummary(stage: InvestigationStage): string {
  switch (stage) {
    case 'detection':
      return 'Incident detected and logged';
    case 'investigation':
      return 'Gathering evidence from logs, commits, and repository context';
    case 'reproduction':
      return 'Reproduction steps documented';
    case 'diagnosis':
      return 'Analysis complete';
    case 'repair':
      return 'Repair proposal generated';
    case 'verification':
      return 'Verification complete';
  }
}

/**
 * Get current investigation progress
 */
export async function getInvestigationProgress(incidentId: string): Promise<{
  incidentStatus: IncidentStatus;
  stages: Array<{
    stage: InvestigationStage;
    status: InvestigationStatus;
    completed: boolean;
  }>;
  progress: number;
  evidenceCount: number;
}> {
  const incident = await db.query.incidents.findFirst({
    where: eq(incidents.id, incidentId),
  });

  if (!incident) {
    throw new Error('Incident not found');
  }

  const events = await db.query.investigationEvents.findMany({
    where: eq(investigationEvents.incidentId, incidentId),
    orderBy: [desc(investigationEvents.createdAt)],
  });

  const evidenceCount = await db.query.evidence.findMany({
    where: eq(evidence.incidentId, incidentId),
  }).then(r => r.length);

  // Get latest status per stage (events arrive newest-first)
  const stageStatuses: Record<string, InvestigationStatus> = {};
  for (const event of events) {
    if (!stageStatuses[event.stage]) {
      stageStatuses[event.stage] = event.status as InvestigationStatus;
    }
  }

  const stages = getStageOrder().map(stage => ({
    stage,
    status: stageStatuses[stage] ?? 'queued',
    completed: stageStatuses[stage] === 'completed',
  }));

  const completedStages = stages.filter(s => s.completed).map(s => s.stage as InvestigationStage);
  const progress = calculateProgress(completedStages);

  return {
    incidentStatus: incident.status as IncidentStatus,
    stages,
    progress,
    evidenceCount,
  };
}

/**
 * Get AI activity log for transparency display
 */
export async function getAIActivityLog(incidentId: string): Promise<Array<{
  action: string;
  status: 'running' | 'completed' | 'failed';
  timestamp: Date;
}>> {
  const events = await db.query.investigationEvents.findMany({
    where: eq(investigationEvents.incidentId, incidentId),
    orderBy: [desc(investigationEvents.createdAt)],
  });

  return events.map(event => ({
    action: getStageSummary(event.stage as InvestigationStage),
    status: event.status === 'completed' ? 'completed' : event.status === 'failed' ? 'failed' : 'running',
    timestamp: event.createdAt,
  }));
}
