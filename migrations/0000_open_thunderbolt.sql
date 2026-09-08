CREATE TABLE "audit_logs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"incident_id" varchar(36) NOT NULL,
	"actor" varchar(100) NOT NULL,
	"action" varchar(40) NOT NULL,
	"previous_state" jsonb,
	"new_state" jsonb,
	"metadata" jsonb,
	"timestamp" timestamp DEFAULT (now()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"incident_id" varchar(36) NOT NULL,
	"kind" varchar(20) NOT NULL,
	"label" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"source_path" varchar(500),
	"line_range" varchar(50),
	"created_at" timestamp DEFAULT (now()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_relationships" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"source_id" varchar(36) NOT NULL,
	"target_id" varchar(36) NOT NULL,
	"relationship_type" varchar(30) DEFAULT 'supports' NOT NULL,
	"created_at" timestamp DEFAULT (now()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"service" varchar(255) NOT NULL,
	"severity" varchar(20) DEFAULT 'medium' NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"impact_summary" text NOT NULL,
	"alert_context" text NOT NULL,
	"logs" text,
	"repository_context" text,
	"recent_change" text,
	"reproduction_instructions" text,
	"created_by" varchar(36),
	"created_at" timestamp DEFAULT (now()) NOT NULL,
	"updated_at" timestamp DEFAULT (now()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investigation_events" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"incident_id" varchar(36) NOT NULL,
	"stage" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"summary" text NOT NULL,
	"detail" text,
	"evidence_ids" jsonb NOT NULL,
	"created_at" timestamp DEFAULT (now()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patch_reviews" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"incident_id" varchar(36) NOT NULL,
	"summary" text NOT NULL,
	"diff" text NOT NULL,
	"files_changed" jsonb NOT NULL,
	"confidence" double precision NOT NULL,
	"verification_status" varchar(20) DEFAULT 'not_run' NOT NULL,
	"approval_status" varchar(20) DEFAULT 'proposed' NOT NULL,
	"verification_output" text,
	"reviewer_id" varchar(36),
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT (now()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "root_cause_reports" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"incident_id" varchar(36) NOT NULL,
	"summary" text NOT NULL,
	"confidence" double precision NOT NULL,
	"claims" jsonb NOT NULL,
	"limitations" text,
	"model_name" varchar(255),
	"inference_mode" varchar(20) DEFAULT 'demo' NOT NULL,
	"created_at" timestamp DEFAULT (now()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"created_at" timestamp DEFAULT (now()) NOT NULL,
	"updated_at" timestamp DEFAULT (now()) NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_relationships" ADD CONSTRAINT "evidence_relationships_source_id_evidence_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."evidence"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_relationships" ADD CONSTRAINT "evidence_relationships_target_id_evidence_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."evidence"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investigation_events" ADD CONSTRAINT "investigation_events_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patch_reviews" ADD CONSTRAINT "patch_reviews_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "root_cause_reports" ADD CONSTRAINT "root_cause_reports_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_incident_id" ON "audit_logs" USING btree ("incident_id");--> statement-breakpoint
CREATE INDEX "idx_audit_actor" ON "audit_logs" USING btree ("actor");--> statement-breakpoint
CREATE INDEX "idx_audit_action" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_audit_timestamp" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_evidence_incident_id" ON "evidence" USING btree ("incident_id");--> statement-breakpoint
CREATE INDEX "idx_evidence_kind" ON "evidence" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "idx_evidence_rel_source" ON "evidence_relationships" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "idx_evidence_rel_target" ON "evidence_relationships" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "idx_incidents_status" ON "incidents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_incidents_severity" ON "incidents" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_incidents_created_at" ON "incidents" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_events_incident_id" ON "investigation_events" USING btree ("incident_id");--> statement-breakpoint
CREATE INDEX "idx_events_stage" ON "investigation_events" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "idx_events_created_at" ON "investigation_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pr_incident_id" ON "patch_reviews" USING btree ("incident_id");--> statement-breakpoint
CREATE INDEX "idx_pr_approval_status" ON "patch_reviews" USING btree ("approval_status");--> statement-breakpoint
CREATE INDEX "idx_pr_verification_status" ON "patch_reviews" USING btree ("verification_status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_rcr_incident_id" ON "root_cause_reports" USING btree ("incident_id");--> statement-breakpoint
CREATE INDEX "idx_rcr_created_at" ON "root_cause_reports" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_email" ON "users" USING btree ("email");