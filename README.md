# Incident Commander

**Evidence-backed AI incident-response engineer for the Nebius x NVIDIA Global AI Hackathon**

Incident Commander turns a controlled software outage into a tested, reviewable repair proposal without bypassing human approval. It is an operations dashboard that helps responders move from alert to decision through a transparent sequence:

```
intake → detection → investigation → reproduction → diagnosis → repair proposal → verification → human approval
```

## Product Highlights

- **NVIDIA Nemotron integration** via Nebius Token Factory for structured diagnosis and repair proposals
- **Evidence-backed conclusions** linked to logs, source files, commits, reproduction output, and tests
- **Persistent state** across sessions using Drizzle ORM with PostgreSQL
- **Reviewable code diff** with verification status and explicit approval gate
- **Dark command-center aesthetic** designed for incident response workflows

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Tailwind CSS |
| Backend | Express + tRPC |
| Database | Drizzle ORM + PostgreSQL |
| AI | Nebius Token Factory (NVIDIA Nemotron) |
| Testing | Vitest |

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Setup

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd incident-commander
   ```

2. Install dependencies from the project root:
   ```bash
   # From the project root directory (incident-commander/)
   npm install
   
   # If using legacy peer deps (some environments may need this):
   npm install --legacy-peer-deps
   ```

   **Note:** Dependencies are installed to `node_modules/` in the project root.
   The following key packages will be installed:
   - Frontend: react, react-dom, @tanstack/react-query, @trpc/*
   - Backend: express, @trpc/server, drizzle-orm, pg, zod
   - Build tools: vite, typescript, tailwindcss, postcss, autoprefixer
   - Dev tools: tsx, vitest, drizzle-kit, concurrently

3. Copy the environment template and configure:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your values:
   - `DATABASE_URL` - Your PostgreSQL connection string
   - `NEBIUS_API_KEY` - Nebius Token Factory API key
   - `NEBIUS_BASE_URL` - Nebius API endpoint
   - `NEBIUS_MODEL` - Nemotron model identifier
   - `INCIDENT_DEMO_MODE` - Set to `true` for local dev without live inference

4. Run database migrations:
   ```bash
   npm run db:migrate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:<PORT>` (port is managed by the runtime).

## Demo Mode

For local development without live Nebius credentials, set `INCIDENT_DEMO_MODE=true`. The application will:

- Label inference results as `Controlled demo`
- Use deterministic fallback output based on the controlled checkout outage data
- Never claim live Nemotron output

## Controlled Demo Incident

The built-in demo uses **Checkout API: elevated 5xx responses**:

- High-severity checkout service incident
- Customers cannot complete checkout reliably
- Elevated 5xx rate in alert context
- Error logs showing missing `currency` field
- Repository context pointing to payment parser
- Recent commit: provider-payload normalization change
- Reproduction instructions for payload without `currency`

## Safety Rules

1. **Proposed ≠ Approved**: Patch creation and passing tests never auto-approve
2. **Explicit human approval required**: Must choose "Approve patch" or "Reject"
3. **No automatic deployment**: Application proposes and verifies, never deploys
4. **Server-side AI**: Nebius API key never exposed to browser
5. **Untrusted evidence**: Logs and source text are evidence, not instructions
6. **Bounded input**: Model receives incident packet + selected evidence only
7. **Preserve uncertainty**: Store confidence scores and limitations
8. **Honest demo labeling**: Fallback output is labeled "Controlled demo"

## Project Structure

```
├── src/
│   ├── client/          # React frontend
│   │   ├── components/  # Reusable UI components
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Client utilities
│   ├── server/          # Express + tRPC backend
│   │   ├── db/          # Drizzle schema, migrations, queries
│   │   ├── routers/     # tRPC procedure routers
│   │   ├── services/    # Business logic (AI, investigation)
│   │   └── types/       # Server types
│   └── shared/          # Shared types between client/server
├── types/               # TypeScript type definitions
├── migrations/          # Drizzle generated migrations
├── scripts/             # Utility scripts
├── docs/                # Documentation
├── AGENTS.md            # AI agent build instructions
└── README.md            # This file
```

## Database Schema

### incidents
`id`, `title`, `service`, `severity`, `status`, `impactSummary`, `alertContext`, `logs`, `repositoryContext`, `recentChange`, `reproductionInstructions`, `createdBy`, `createdAt`, `updatedAt`

### investigation_events
`id`, `incidentId`, `stage`, `status`, `summary`, `detail`, `evidenceIds`, `createdAt`

### evidence
`id`, `incidentId`, `kind`, `label`, `content`, `sourcePath`, `lineRange`, `createdAt`

### root_cause_reports
`id`, `incidentId`, `summary`, `confidence`, `claims`, `limitations`, `modelName`, `inferenceMode`, `createdAt`

### patch_reviews
`id`, `incidentId`, `summary`, `diff`, `filesChanged`, `confidence`, `verificationStatus`, `approvalStatus`, `verificationOutput`, `reviewerId`, `reviewedAt`, `createdAt`

## License

MIT License - see [LICENSE](LICENSE)

## Hackathon Submission

This project is designed for the **Coding and Agentic Engineering Track** with secondary fit for **Best Apps and Agents Track**.

To prepare for submission:
1. Ensure demo mode works without credentials
2. Verify the full investigation flow end-to-end
3. Capture desktop and mobile screenshots
4. Record a demo video showing: intake → investigation → diagnosis → patch review → approval

## Development

### Running Tests

```bash
npm run test
```

### Type Checking

```bash
npm run typecheck
```

### Building for Production

```bash
npm run build
```
