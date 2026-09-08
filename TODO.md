# Incident Commander - Project TODO

## Current Status

✅ **Phase 1 Complete**: Core infrastructure and documentation
✅ **Phase 2 Complete**: Basic incident intake, persistence, timeline, evidence, diagnosis, patch, approval
🔄 **Phase 3 In Progress**: Advanced differentiators (state machine, orchestrator, evidence graph, safety)
✅ **Server Build Fixed**: 155 → 0 type errors (NodeNext .js extensions, @shared alias → relative imports, cors + @types/cors added, tRPC express adapter, dead services/investigation.ts removed, npm start path corrected)

## Implemented ✅

### Sprint 0 - Product Framing
- [x] Project structure and documentation
- [x] README.md with setup instructions
- [x] AGENTS.md with build instructions  
- [x] LICENSE (MIT)
- [x] Package.json with dependencies
- [x] Environment configuration (.env.example)
- [x] TypeScript and Vite configuration

### Sprint 1 - Incident Intake and Persistence
- [x] Incident schema (Drizzle ORM)
- [x] tRPC incident router (create, get, list, update status)
- [x] Incident intake form (React component)
- [x] Incident list view
- [x] Incident workspace
- [x] Incident context display

### Sprint 2 - Investigation Timeline and Evidence
- [x] Investigation events schema
- [x] Evidence schema
- [x] tRPC investigation router (events CRUD)
- [x] tRPC evidence router (CRUD)
- [x] Investigation timeline component
- [x] Evidence panel component
- [x] Timeline with stage progression visualization

### Sprint 3 - Nemotron Diagnosis and Repair
- [x] AI service (server-side Nemotron integration)
- [x] Demo mode with controlled fallback
- [x] Root cause reports schema
- [x] Patch reviews schema
- [x] tRPC rootCause router
- [x] tRPC patch router (create, get)
- [x] Diagnosis component with claims and evidence links
- [x] Patch review section with diff display
- [x] Verification output display

### Sprint 4 - Human Approval and Trust UX
- [x] Approval gate component
- [x] Approve/reject mutations
- [x] Persisted approval state
- [x] Reviewer identity and timestamp
- [x] Disabled state after final decision
- [x] Policy copy ("Verification passed, but this patch remains a proposal")

### Sprint 5 - Visual Polish
- [x] Dark command-center design system
- [x] Electric violet primary accent
- [x] Cyan telemetry accents
- [x] Status colors (green/amber/red)
- [x] Monospace fonts for logs/diffs/IDs
- [x] Card, Badge, Button, Input components
- [x] Responsive layout

### Sprint 6 - Advanced Differentiators (Current)
- [x] Investigation state machine (`src/server/investigation/stateMachine.ts`)
- [x] Agent orchestrator (`src/server/ai/agentOrchestrator.ts`)
- [x] Approval safety policy (`src/server/security/approvalPolicy.ts`)
- [x] Prompt injection guard (`src/server/security/promptInjectionGuard.ts`)
- [x] Audit logging system (`src/server/audit/`)
- [x] Evidence graph (`src/server/investigation/evidenceGraph.ts`)
- [x] Demo data service (`src/server/demo/checkoutIncident.ts`)
- [x] Observability/telemetry router (`src/server/routers/observability.ts`)
- [x] Safety tests (`src/tests/safety/`)

## Remaining Work

### Priority 1 - Core Differentiators
- [ ] Add `openDemo` mutation to incident router (DONE)
- [ ] Wire up orchestrator to investigation trigger
- [ ] Add evidence graph visualization UI
- [ ] Add AI activity transparency panel
- [ ] Add telemetry dashboard to workspace

### Priority 2 - Demo Impact
- [ ] Real-time timeline updates (polling or WebSocket)
- [ ] Observability dashboard component
- [ ] AI transparency activity display

### Priority 3 - Trust
- [ ] More comprehensive safety tests
- [ ] End-to-end lifecycle test
- [ ] Audit trail UI component

### Priority 4 - Polish
- [ ] Mobile responsive refinements
- [ ] Loading skeletons
- [ ] Error boundary coverage
- [ ] Animation polish

### Priority 5 - Submission
- [ ] E2E tests
- [ ] Build verification
- [ ] Demo recording script
- [ ] Final README review
- [ ] Hackathon submission copy

## Database Schema

### Tables
- [x] users
- [x] incidents
- [x] investigation_events
- [x] evidence
- [x] evidence_relationships (NEW)
- [x] audit_logs (NEW)
- [x] root_cause_reports
- [x] patch_reviews

### Database Migration (MySQL → PostgreSQL)
- [x] Swapped mysql2 for pg + @types/pg
- [x] Rewrote Drizzle schema to pg-core (pgTable, timestamp, jsonb, double precision)
- [x] Updated db connection to pg Pool + drizzle-orm/node-postgres
- [x] Updated drizzle.config.ts dialect to postgresql
- [x] Updated .env.example, README.md, AGENTS.md, INSTRUCTIONS.md, docs/ARCHITECTURE.md
- [x] Generated initial migration (migrations/0000_open_thunderbolt.sql)

### Pending Migrations
- [ ] Apply migration (requires DATABASE_URL pointing at a PostgreSQL instance)

## API Endpoints

### Existing
- [x] `incident.list` - List incidents
- [x] `incident.get` - Get incident
- [x] `incident.create` - Create incident
- [x] `incident.updateStatus` - Update status
- [x] `incident.openDemo` - Open demo incident (NEW)
- [x] `incident.startInvestigation` - Start investigation (NEW)
- [x] `investigation.getEvents` - Get timeline events
- [x] `investigation.createEvent` - Create event
- [x] `investigation.updateEventStatus` - Update event
- [x] `investigation.getEvidenceGraph` - Get evidence graph (NEW)
- [x] `investigation.getEvidenceChain` - Trace evidence chain (NEW)
- [x] `evidence.getList` - List evidence
- [x] `evidence.getById` - Get evidence
- [x] `evidence.create` - Create evidence
- [x] `evidence.delete` - Delete evidence
- [x] `rootCause.getReport` - Get diagnosis
- [x] `rootCause.createReport` - Create diagnosis
- [x] `patch.getReview` - Get patch review
- [x] `patch.createPatch` - Create proposal
- [x] `patch.approve` - Approve (human action)
- [x] `patch.reject` - Reject (human action)
- [x] `patch.validateApprovalSafety` - Safety check (NEW)
- [x] `audit.getTrail` - Get audit log (NEW)
- [x] `audit.getSummary` - Get audit summary (NEW)
- [x] `observability.getTelemetry` - Get telemetry (NEW)
- [x] `observability.getIncidentMetrics` - Get metrics (NEW)
- [x] `observability.getInvestigationProgress` - Get progress (NEW)

## Safety Rules Verified

- [x] Patch creation → proposed (never approved)
- [x] Verification passed → still proposed
- [x] Confidence score → does not approve
- [x] Only human action → can approve/reject
- [x] AI calls server-side only
- [x] No API keys in client code
- [x] Evidence treated as data, not instructions
- [x] Prompt injection patterns detected and sanitized
- [x] Bounded input to AI

## Known Limitations

1. No authentication system yet (reviewerId is passed directly)
2. No real-time WebSocket updates (using polling or server state)
3. Evidence graph visualization is data-only, no visual graph component yet
4. Demo mode always uses deterministic fallback
5. No actual test execution (verification is simulated)
6. No email/SMS notifications (in-app only)

## Next Recommended Step

1. Run `npx drizzle-kit generate` to create migration for new tables
2. Add evidence graph visualization component
3. Add telemetry dashboard to workspace
4. Add AI activity panel
5. Write E2E lifecycle test
6. Final visual polish and responsive check
