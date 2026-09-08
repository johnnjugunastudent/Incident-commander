/**
 * Audit Logger
 * 
 * Persistent audit trail for incident lifecycle reconstruction.
 */

import { db, generateId } from '../db/index.js';
import { auditLogs } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

export interface AuditLogEntry {
  id?: string;
  incidentId: string;
  actor: string;
  action: AuditAction;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

export type AuditAction =
  | 'incident_created'
  | 'investigation_started'
  | 'evidence_added'
  | 'diagnosis_generated'
  | 'patch_proposed'
  | 'verification_started'
  | 'verification_completed'
  | 'review_opened'
  | 'patch_approved'
  | 'patch_rejected'
  | 'incident_closed'
  | 'incident_resolved'
  | 'system_error';

export interface AuditLogQuery {
  incidentId?: string;
  actor?: string;
  action?: AuditAction;
  limit?: number;
  offset?: number;
}

/**
 * Log an audit event
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<string> {
  const id = entry.id || generateId();
  const timestamp = entry.timestamp || new Date();

  await db.insert(auditLogs).values({
    id,
    incidentId: entry.incidentId,
    actor: entry.actor,
    action: entry.action,
    previousState: entry.previousState,
    newState: entry.newState,
    metadata: entry.metadata,
    timestamp,
  });

  return id;
}

/**
 * Query audit logs
 */
export async function queryAuditLogs(query: AuditLogQuery): Promise<Array<{
  id: string;
  incidentId: string;
  actor: string;
  action: AuditAction;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp: Date;
}>> {
  const { incidentId, actor, action, limit = 50, offset = 0 } = query;

  let rows;
  
  if (incidentId) {
    rows = await db.query.auditLogs.findMany({
      where: eq(auditLogs.incidentId, incidentId),
      orderBy: [desc(auditLogs.timestamp)],
      limit,
      offset,
    });
  } else {
    rows = await db.query.auditLogs.findMany({
      orderBy: [desc(auditLogs.timestamp)],
      limit,
      offset,
    });
  }

  return rows.map(row => ({
    ...row,
    action: row.action as AuditAction,
    previousState: row.previousState ?? undefined,
    newState: row.newState ?? undefined,
    metadata: row.metadata ?? undefined,
    timestamp: row.timestamp,
  }));
}

/**
 * Get audit trail for an incident
 */
export async function getAuditTrail(incidentId: string): Promise<Array<{
  id: string;
  actor: string;
  action: AuditAction;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp: Date;
}>> {
  return queryAuditLogs({ incidentId, limit: 100 });
}

/**
 * Format audit log for display
 */
export function formatAuditEntry(entry: {
  action: AuditAction;
  actor: string;
  timestamp: Date;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  metadata?: Record<string, any>;
}): {
  title: string;
  description: string;
  timestamp: string;
  icon: string;
} {
  const actionLabels: Record<AuditAction, { title: string; description: string; icon: string }> = {
    incident_created: {
      title: 'Incident Created',
      description: 'New incident was created',
      icon: 'plus-circle',
    },
    investigation_started: {
      title: 'Investigation Started',
      description: 'Automated investigation began',
      icon: 'play',
    },
    evidence_added: {
      title: 'Evidence Added',
      description: 'New evidence was recorded',
      icon: 'file-text',
    },
    diagnosis_generated: {
      title: 'Diagnosis Generated',
      description: 'AI analysis completed',
      icon: 'brain',
    },
    patch_proposed: {
      title: 'Patch Proposed',
      description: 'Repair proposal was created',
      icon: 'code',
    },
    verification_started: {
      title: 'Verification Started',
      description: 'Verification process began',
      icon: 'loading',
    },
    verification_completed: {
      title: 'Verification Completed',
      description: 'Verification process finished',
      icon: 'check-circle',
    },
    review_opened: {
      title: 'Review Opened',
      description: 'Human review stage reached',
      icon: 'users',
    },
    patch_approved: {
      title: 'Patch Approved',
      description: 'Human reviewer approved the patch',
      icon: 'check-circle',
    },
    patch_rejected: {
      title: 'Patch Rejected',
      description: 'Human reviewer rejected the patch',
      icon: 'x-circle',
    },
    incident_closed: {
      title: 'Incident Closed',
      description: 'Incident was closed',
      icon: 'x-circle',
    },
    incident_resolved: {
      title: 'Incident Resolved',
      description: 'Incident was resolved',
      icon: 'check-circle',
    },
    system_error: {
      title: 'System Error',
      description: 'An error occurred',
      icon: 'alert-triangle',
    },
  };

  const label = actionLabels[entry.action] || {
    title: entry.action,
    description: '',
    icon: 'info',
  };

  return {
    title: label.title,
    description: label.description,
    timestamp: new Date(entry.timestamp).toISOString(),
    icon: label.icon,
  };
}

/**
 * Get audit summary statistics
 */
export async function getAuditSummary(incidentId: string): Promise<{
  totalEvents: number;
  byAction: Record<AuditAction, number>;
  lastActivity: Date | null;
}> {
  const logs = await getAuditTrail(incidentId);
  
  const byAction: Record<string, number> = {};
  let lastActivity: Date | null = null;
  
  for (const log of logs) {
    byAction[log.action] = (byAction[log.action] || 0) + 1;
    if (!lastActivity || log.timestamp > lastActivity) {
      lastActivity = log.timestamp;
    }
  }

  return {
    totalEvents: logs.length,
    byAction: byAction as Record<AuditAction, number>,
    lastActivity,
  };
}
