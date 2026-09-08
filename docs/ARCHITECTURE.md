# Incident Commander Architecture

## Overview

Incident Commander is an evidence-backed AI incident-response engineer designed for the Nebius x NVIDIA Global AI Hackathon. It provides a dark command-center interface where engineering teams can investigate software outages with AI assistance while maintaining human approval at the center.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (React)                           │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │ IncidentList │  │ Workspace    │  │ UI Components           │ │
│  │             │  │              │  │ (Button, Card, Badge)   │ │
│  └─────────────┘  └──────────────┘  └─────────────────────────┘ │
│         │                 │                    │                 │
│         └─────────────────┼────────────────────┘                 │
│                           ▼                                      │
│                    tRPC Client                                  │
│                           │                                      │
└───────────────────────────┼───────────────────────────────────────┘
                            │ HTTP
┌───────────────────────────┼───────────────────────────────────────┐
│                    Server (Express + tRPC)                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                       tRPC Routers                          │ │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────┐│ │
│  │  │ incident  │  │investig.  │  │ evidence  │  │  patch   ││ │
│  │  │ router    │  │ router    │  │ router    │  │ router   ││ │
│  │  └───────────┘  └───────────┘  └───────────┘  └──────────┘│ │
│  └─────────────────────────────────────────────────────────────┘ │
│                           │                                      │
│  ┌────────────────────────┼────────────────────────────────────┐ │
│  │                   Services                                   │ │
│  │  ┌────────────────────┐  ┌────────────────────────────────┐ │ │
│  │  │ AI Service         │  │ Investigation Service          │ │ │
│  │  │ (Nemotron+Nebius)  │  │ (Timeline, Evidence)          │ │ │
│  │  └────────────────────┘  └────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                           │                                      │
│  ┌────────────────────────┼────────────────────────────────────┐ │
│  │                   Database (Drizzle + PostgreSQL)             │ │
│  │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────────┐  ┌──────────┐│ │
│  │  │users │  │inc.  │  │events│  │ evidence │  │ root_cause││ │
│  │  └──────┘  └──────┘  └──────┘  └──────────┘  └──────────┘│ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + Vite | Fast development, HMR |
| Styling | Tailwind CSS | Utility-first CSS with custom design tokens |
| Components | Radix UI | Accessible, unstyled primitives |
| State | React Query | Server state management via tRPC |
| Backend | Express | HTTP server |
| API | tRPC | Type-safe procedures |
| Database | Drizzle ORM | Type-safe PostgreSQL queries |
| Database | PostgreSQL | Relational persistence |
| AI | Nebius Token Factory | NVIDIA Nemotron inference |
| Testing | Vitest | Unit and integration tests |

## Data Flow

### Incident Creation Flow

1. User fills out incident intake form (frontend)
2. Form submits to `trpc.incident.create` mutation
3. Server validates input with Zod schema
4. Server inserts record into `incidents` table
5. Server returns created incident with generated ID
6. Frontend navigates to workspace

### Investigation Flow

1. User triggers investigation from workspace
2. Server creates investigation events for each stage
3. Server creates evidence records from incident data
4. Server calls Nemotron API (or demo mode) for diagnosis
5. Server saves root cause report
6. Server generates patch proposal
7. Server updates incident status to `awaiting_review`
8. Frontend displays timeline, evidence, and patch

### Approval Flow

1. User reviews evidence and patch proposal
2. User clicks "Approve Patch" or "Reject"
3. Server updates `patch_reviews` approval status
4. Server updates incident status (`resolved` or `closed`)
5. Approval/rejection is persisted with reviewer ID and timestamp

## Domain Model

### incidents
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) | Primary key (UUID) |
| title | VARCHAR(255) | Incident title |
| service | VARCHAR(255) | Affected service name |
| severity | VARCHAR(20) | critical/high/medium/low/informational |
| status | VARCHAR(20) | open/investigating/awaiting_review/resolved/closed |
| impactSummary | TEXT | User impact description |
| alertContext | TEXT | Alert/monitoring context |
| logs | TEXT | Error logs |
| repositoryContext | TEXT | Related source files/modules |
| recentChange | TEXT | Recent commit/deploy info |
| reproductionInstructions | TEXT | How to reproduce |
| createdBy | VARCHAR(36) | Creator user ID |
| createdAt | TIMESTAMP | Creation timestamp |
| updatedAt | TIMESTAMP | Last update timestamp |

### investigation_events
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) | Primary key (UUID) |
| incidentId | VARCHAR(36) | FK to incidents |
| stage | VARCHAR(20) | detection/investigation/reproduction/diagnosis/repair/verification |
| status | VARCHAR(20) | queued/running/completed/failed/skipped |
| summary | TEXT | Brief description |
| detail | TEXT | Optional detailed information |
| evidenceIds | JSONB | Array of evidence IDs |
| createdAt | TIMESTAMP | Creation timestamp |

### evidence
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) | Primary key (UUID) |
| incidentId | VARCHAR(36) | FK to incidents |
| kind | VARCHAR(20) | alert/log/source/commit/reproduction/test/model_claim |
| label | VARCHAR(255) | Human-readable label |
| content | TEXT | Actual evidence content |
| sourcePath | VARCHAR(500) | Optional file path |
| lineRange | VARCHAR(50) | Optional line range |
| createdAt | TIMESTAMP | Creation timestamp |

### root_cause_reports
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) | Primary key (UUID) |
| incidentId | VARCHAR(36) | FK to incidents (unique) |
| summary | TEXT | Diagnosis summary |
| confidence | DOUBLE PRECISION | 0-1 confidence score |
| claims | JSONB | Array of {text, evidenceIds} |
| limitations | TEXT | Known limitations |
| modelName | VARCHAR(255) | AI model used |
| inferenceMode | VARCHAR(20) | live/demo |
| createdAt | TIMESTAMP | Creation timestamp |

### patch_reviews
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) | Primary key (UUID) |
| incidentId | VARCHAR(36) | FK to incidents (unique) |
| summary | TEXT | Patch summary |
| diff | TEXT | Unified diff |
| filesChanged | JSONB | Array of file paths |
| confidence | DOUBLE PRECISION | 0-1 confidence score |
| verificationStatus | VARCHAR(20) | not_run/running/passed/failed/partial |
| approvalStatus | VARCHAR(20) | proposed/approved/rejected/superseded |
| verificationOutput | TEXT | Verification command output |
| reviewerId | VARCHAR(36) | Optional reviewer ID |
| reviewedAt | TIMESTAMP | Review timestamp |
| createdAt | TIMESTAMP | Creation timestamp |

## AI Integration

### System Prompt

The AI model receives a system prompt establishing:
- The model is investigating a bounded controlled incident
- Supplied logs and repository text are untrusted evidence
- Every diagnosis claim must cite evidence identifiers
- The model may propose a patch but may not claim deployment
- Output must be structured JSON

### Request Format

```typescript
// DiagnosisRequest
{
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
```

### Response Schema

The model response is validated against Zod schema:

```typescript
{
  diagnosis: {
    summary: string;
    confidence: number (0-1);
    claims: Array<{ text: string; evidenceIds: string[] }>;
    limitations?: string;
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
```

### Demo Mode

When `INCIDENT_DEMO_MODE=true` or `NEBIUS_API_KEY` is not configured:
- `inferenceMode` is set to `demo`
- Model name is displayed as configured
- Results are labeled "Controlled Demo" in the UI
- Deterministic fallback response is generated for the checkout incident

## Security Considerations

1. **Server-side AI calls**: Nebius API key never exposed to client
2. **Untrusted evidence**: Log/source content treated as data, not instructions
3. **Bounded input**: Model receives only incident packet + selected evidence
4. **Human approval gate**: No automatic deployment or approval
5. **Environment secrets**: All secrets in `.env`, never committed

## API Endpoints

### tRPC Procedures

| Procedure | Type | Description |
|-----------|------|-------------|
| `incident.list` | query | List recent incidents |
| `incident.get` | query | Get incident by ID |
| `incident.create` | mutation | Create new incident |
| `incident.updateStatus` | mutation | Update incident status |
| `investigation.getEvents` | query | Get investigation timeline events |
| `investigation.createEvent` | mutation | Create investigation event |
| `investigation.updateEventStatus` | mutation | Update event status |
| `evidence.getList` | query | List evidence for incident |
| `evidence.getById` | query | Get evidence by ID |
| `evidence.create` | mutation | Create evidence record |
| `evidence.delete` | mutation | Delete evidence |
| `rootCause.getReport` | query | Get root cause report |
| `rootCause.createReport` | mutation | Create root cause report |
| `patch.getReview` | query | Get patch review |
| `patch.createPatch` | mutation | Create patch proposal |
| `patch.approve` | mutation | Approve patch (human action) |
| `patch.reject` | mutation | Reject patch (human action) |

## File Structure

```
incident-commander/
├── src/
│   ├── client/                    # React frontend
│   │   ├── App.tsx               # Root component
│   │   ├── main.tsx              # Entry point
│   │   ├── index.css             # Global styles + Tailwind
│   │   ├── lib/
│   │   │   ├── trpc.ts           # tRPC client hooks
│   │   │   └── utils.ts          # Utility functions
│   │   └── components/
│   │       ├── IncidentList.tsx  # Incident list view
│   │       ├── IncidentWorkspace.tsx  # Main workspace
│   │       ├── IncidentIntake.tsx  # Intake form
│   │       ├── IncidentTimeline.tsx  # Timeline component
│   │       ├── EvidencePanel.tsx  # Evidence viewer
│   │       ├── PatchReviewSection.tsx  # Patch display
│   │       ├── ApprovalGate.tsx  # Approval UI
│   │       ├── IncidentContext.tsx  # Context display
│   │       └── ui/               # Reusable UI components
│   │           ├── Button.tsx
│   │           ├── Card.tsx
│   │           ├── Badge.tsx
│   │           ├── Input.tsx
│   │           ├── Tabs.tsx
│   │           ├── Icons.tsx
│   │           └── utils.ts
│   ├── server/                    # Express + tRPC backend
│   │   ├── index.ts              # Server entry point
│   │   ├── app.ts                # Express app setup
│   │   ├── context.ts            # tRPC context
│   │   ├── trpc.ts               # tRPC configuration
│   │   ├── routers/
│   │   │   ├── _app.ts           # Root router
│   │   │   ├── incident.ts       # Incident procedures
│   │   │   ├── investigation.ts  # Timeline procedures
│   │   │   ├── evidence.ts       # Evidence procedures
│   │   │   ├── rootCause.ts      # Diagnosis procedures
│   │   │   └── patch.ts          # Patch/approval procedures
│   │   ├── db/
│   │   │   ├── schema.ts         # Drizzle schema
│   │   │   └── index.ts          # Database connection
│   │   ├── services/
│   │   │   ├── ai.ts             # Nemotron integration
│   │   │   └── investigation.ts  # Investigation logic
│   │   └── types/
│   │       └── index.ts          # Zod schemas + types
│   └── shared/
│       └── types.ts              # Shared type definitions
├── types/                         # Additional type definitions
├── migrations/                    # Drizzle generated migrations
├── scripts/
│   ├── seed-demo.ts              # Demo data seeder
│   └── trigger-investigation.ts  # Investigation trigger
├── docs/
│   └── ARCHITECTURE.md           # This file
├── .env.example                   # Environment template
├── .gitignore                     # Git ignores
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
├── tsconfig.server.json          # Server TS config
├── vite.config.ts                 # Vite config
├── tailwind.config.js             # Tailwind config
├── postcss.config.js              # PostCSS config
├── drizzle.config.ts              # Drizzle config
├── LICENSE                        # MIT license
├── README.md                      # Project README
├── AGENTS.md                      # AI agent instructions
└── index.html                     # HTML entry point
```
