import {
  pgTable,
  varchar,
  text,
  timestamp,
  jsonb,
  doublePrecision,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at').notNull().default(sql`(now())`),
  updatedAt: timestamp('updated_at').notNull().default(sql`(now())`),
}, (table) => ({
  idxUsersEmail: uniqueIndex('idx_users_email').on(table.email),
}));

// Incidents table
export const incidents = pgTable('incidents', {
  id: varchar('id', { length: 36 }).primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  service: varchar('service', { length: 255 }).notNull(),
  severity: varchar('severity', { length: 20 }).notNull().default('medium'),
  status: varchar('status', { length: 20 }).notNull().default('open'),
  impactSummary: text('impact_summary').notNull(),
  alertContext: text('alert_context').notNull(),
  logs: text('logs'),
  repositoryContext: text('repository_context'),
  recentChange: text('recent_change'),
  reproductionInstructions: text('reproduction_instructions'),
  createdBy: varchar('created_by', { length: 36 }),
  createdAt: timestamp('created_at').notNull().default(sql`(now())`),
  updatedAt: timestamp('updated_at').notNull().default(sql`(now())`),
}, (table) => ({
  idxIncidentsStatus: index('idx_incidents_status').on(table.status),
  idxIncidentsSeverity: index('idx_incidents_severity').on(table.severity),
  idxIncidentsCreatedAt: index('idx_incidents_created_at').on(table.createdAt),
}));

// Investigation Events table
export const investigationEvents = pgTable('investigation_events', {
  id: varchar('id', { length: 36 }).primaryKey(),
  incidentId: varchar('incident_id', { length: 36 }).notNull().references(() => incidents.id, { onDelete: 'cascade' }),
  stage: varchar('stage', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('queued'),
  summary: text('summary').notNull(),
  detail: text('detail'),
  evidenceIds: jsonb('evidence_ids').notNull().$type<string[]>(),
  createdAt: timestamp('created_at').notNull().default(sql`(now())`),
}, (table) => ({
  idxEventsIncidentId: index('idx_events_incident_id').on(table.incidentId),
  idxEventsStage: index('idx_events_stage').on(table.stage),
  idxEventsCreatedAt: index('idx_events_created_at').on(table.createdAt),
}));

// Evidence table
export const evidence = pgTable('evidence', {
  id: varchar('id', { length: 36 }).primaryKey(),
  incidentId: varchar('incident_id', { length: 36 }).notNull().references(() => incidents.id, { onDelete: 'cascade' }),
  kind: varchar('kind', { length: 20 }).notNull(),
  label: varchar('label', { length: 255 }).notNull(),
  content: text('content').notNull(),
  sourcePath: varchar('source_path', { length: 500 }),
  lineRange: varchar('line_range', { length: 50 }),
  createdAt: timestamp('created_at').notNull().default(sql`(now())`),
}, (table) => ({
  idxEvidenceIncidentId: index('idx_evidence_incident_id').on(table.incidentId),
  idxEvidenceKind: index('idx_evidence_kind').on(table.kind),
}));

// Evidence Relationships table (for evidence graph)
export const evidenceRelationships = pgTable('evidence_relationships', {
  id: varchar('id', { length: 36 }).primaryKey(),
  sourceId: varchar('source_id', { length: 36 }).notNull().references(() => evidence.id, { onDelete: 'cascade' }),
  targetId: varchar('target_id', { length: 36 }).notNull().references(() => evidence.id, { onDelete: 'cascade' }),
  relationshipType: varchar('relationship_type', { length: 30 }).notNull().default('supports'),
  createdAt: timestamp('created_at').notNull().default(sql`(now())`),
}, (table) => ({
  idxEvidenceRelSource: index('idx_evidence_rel_source').on(table.sourceId),
  idxEvidenceRelTarget: index('idx_evidence_rel_target').on(table.targetId),
}));

// Audit Logs table
export const auditLogs = pgTable('audit_logs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  incidentId: varchar('incident_id', { length: 36 }).notNull().references(() => incidents.id, { onDelete: 'cascade' }),
  actor: varchar('actor', { length: 100 }).notNull(),
  action: varchar('action', { length: 40 }).notNull(),
  previousState: jsonb('previous_state').$type<Record<string, any>>(),
  newState: jsonb('new_state').$type<Record<string, any>>(),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  timestamp: timestamp('timestamp').notNull().default(sql`(now())`),
}, (table) => ({
  idxAuditIncidentId: index('idx_audit_incident_id').on(table.incidentId),
  idxAuditActor: index('idx_audit_actor').on(table.actor),
  idxAuditAction: index('idx_audit_action').on(table.action),
  idxAuditTimestamp: index('idx_audit_timestamp').on(table.timestamp),
}));

// Root Cause Reports table
export const rootCauseReports = pgTable('root_cause_reports', {
  id: varchar('id', { length: 36 }).primaryKey(),
  incidentId: varchar('incident_id', { length: 36 }).notNull().references(() => incidents.id, { onDelete: 'cascade' }),
  summary: text('summary').notNull(),
  confidence: doublePrecision('confidence').notNull(),
  claims: jsonb('claims').notNull().$type<Array<{ text: string; evidenceIds: string[] }>>(),
  limitations: text('limitations'),
  modelName: varchar('model_name', { length: 255 }),
  inferenceMode: varchar('inference_mode', { length: 20 }).notNull().default('demo'),
  createdAt: timestamp('created_at').notNull().default(sql`(now())`),
}, (table) => ({
  idxRcrIncidentId: uniqueIndex('idx_rcr_incident_id').on(table.incidentId),
  idxRcrCreatedAt: index('idx_rcr_created_at').on(table.createdAt),
}));

// Patch Reviews table
export const patchReviews = pgTable('patch_reviews', {
  id: varchar('id', { length: 36 }).primaryKey(),
  incidentId: varchar('incident_id', { length: 36 }).notNull().references(() => incidents.id, { onDelete: 'cascade' }),
  summary: text('summary').notNull(),
  diff: text('diff').notNull(),
  filesChanged: jsonb('files_changed').notNull().$type<string[]>(),
  confidence: doublePrecision('confidence').notNull(),
  verificationStatus: varchar('verification_status', { length: 20 }).notNull().default('not_run'),
  approvalStatus: varchar('approval_status', { length: 20 }).notNull().default('proposed'),
  verificationOutput: text('verification_output'),
  reviewerId: varchar('reviewer_id', { length: 36 }),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').notNull().default(sql`(now())`),
}, (table) => ({
  idxPrIncidentId: uniqueIndex('idx_pr_incident_id').on(table.incidentId),
  idxPrApprovalStatus: index('idx_pr_approval_status').on(table.approvalStatus),
  idxPrVerificationStatus: index('idx_pr_verification_status').on(table.verificationStatus),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  incidents: many(incidents),
  patchReviews: many(patchReviews),
}));

export const incidentsRelations = relations(incidents, ({ one, many }) => ({
  user: one(users, {
    fields: [incidents.createdBy],
    references: [users.id],
  }),
  events: many(investigationEvents),
  evidence: many(evidence),
  rootCauseReport: one(rootCauseReports),
  patchReview: one(patchReviews),
  auditLogs: many(auditLogs),
}));

export const evidenceRelations = relations(evidence, ({ one, many }) => ({
  incident: one(incidents, {
    fields: [evidence.incidentId],
    references: [incidents.id],
  }),
  relatesToSource: many(evidenceRelationships, { relationName: 'sourceEvidence' }),
  relatesToTarget: many(evidenceRelationships, { relationName: 'targetEvidence' }),
}));

export const evidenceRelationshipsRelations = relations(evidenceRelationships, ({ one }) => ({
  sourceEvidence: one(evidence, { fields: [evidenceRelationships.sourceId], references: [evidence.id], relationName: 'sourceEvidence' }),
  targetEvidence: one(evidence, { fields: [evidenceRelationships.targetId], references: [evidence.id], relationName: 'targetEvidence' }),
}));

export const investigationEventsRelations = relations(investigationEvents, ({ one }) => ({
  incident: one(incidents, {
    fields: [investigationEvents.incidentId],
    references: [incidents.id],
  }),
}));

export const rootCauseReportsRelations = relations(rootCauseReports, ({ one }) => ({
  incident: one(incidents, {
    fields: [rootCauseReports.incidentId],
    references: [incidents.id],
  }),
}));

export const patchReviewsRelations = relations(patchReviews, ({ one }) => ({
  incident: one(incidents, {
    fields: [patchReviews.incidentId],
    references: [incidents.id],
  }),
  reviewer: one(users, {
    fields: [patchReviews.reviewerId],
    references: [users.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type Incident = typeof incidents.$inferSelect;
export type InvestigationEvent = typeof investigationEvents.$inferSelect;
export type Evidence = typeof evidence.$inferSelect;
export type EvidenceRelationship = typeof evidenceRelationships.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type RootCauseReport = typeof rootCauseReports.$inferSelect;
export type PatchReview = typeof patchReviews.$inferSelect;