/**
 * Trigger Investigation Script
 * 
 * This script triggers the full investigation workflow for an incident.
 * Run with: npx tsx scripts/trigger-investigation.ts <incident-id>
 */

import { db, closePool } from '../src/server/db';
import { incidents } from '../src/server/db/schema';
import { eq } from 'drizzle-orm';
import { runInvestigationWorkflow } from '../src/server/services/ai';
import type { InvestigationStage, InvestigationStatus } from '../src/shared/types';

async function triggerInvestigation(incidentId: string) {
  console.log(`Triggering investigation for incident: ${incidentId}`);

  // Verify incident exists
  const incident = await db.query.incidents.findFirst({
    where: eq(incidents.id, incidentId),
  });

  if (!incident) {
    throw new Error(`Incident not found: ${incidentId}`);
  }

  console.log(`  Title: ${incident.title}`);
  console.log(`  Status: ${incident.status}`);

  // Update status to investigating
  await db.update(incidents).set({
    status: 'investigating',
    updatedAt: new Date(),
  }).where(eq(incidents.id, incidentId));

  console.log('  Status updated to: investigating');

  // Run investigation workflow
  await runInvestigationWorkflow(incidentId, async (stage, status, summary, detail) => {
    console.log(`  [${stage}] ${status}: ${summary}`);
    if (detail) {
      console.log(`    ${detail}`);
    }
  });

  console.log('\nInvestigation complete!');
  console.log(`  Status: awaiting_review`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const incidentId = args[0];

if (!incidentId) {
  console.log('Usage: npx tsx scripts/trigger-investigation.ts <incident-id>');
  console.log('Example: npx tsx scripts/trigger-investigation.ts abc123...');
  closePool();
  process.exit(1);
}

triggerInvestigation(incidentId)
  .then(() => {
    closePool();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Investigation failed:', err);
    closePool();
    process.exit(1);
  });
