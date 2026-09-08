/**
 * Demo Data Seed Script
 * 
 * This script seeds the database with the controlled checkout outage demo data.
 * Run with: npx tsx scripts/seed-demo.ts
 */

import { db, generateId, closePool } from '../src/server/db';
import { incidents } from '../src/server/db/schema';
import { eq } from 'drizzle-orm';

const DEMO_INCIDENT = {
  title: 'Checkout API: Elevated 5xx Responses',
  service: 'checkout-service',
  severity: 'high',
  status: 'awaiting_review' as const,
  impactSummary: 'Customers cannot complete checkout reliably. Order flow is broken for approximately 15% of checkout requests.',
  alertContext: 'PagerDuty alert: checkout-service.high_error_rate triggered at 14:32 UTC. 5xx rate increased from baseline 0.2% to 8.7% over 10 minutes.',
  logs: `2024-03-15T14:32:01Z ERROR [checkout-service] POST /v1/checkouts - 500 Internal Server Error
  at PaymentParser.parsePaymentRequest (payment-parser.ts:142:15)
  TypeError: Cannot read properties of undefined (reading 'currency')
  at PaymentParser.formatForProvider (payment-parser.ts:89:10)

  2024-03-15T14:32:02Z ERROR [checkout-service] POST /v1/checkouts - 500 Internal Server Error
  at PaymentParser.parsePaymentRequest (payment-parser.ts:142:15)
  TypeError: Cannot read properties of undefined (reading 'currency')
  at PaymentParser.formatForProvider (payment-parser.ts:89:10)

  2024-03-15T14:32:03Z WARN  [checkout-service] Failed checkout attempt for user_id=usr_884721, amount=149.99,
  currency=undefined, payment_method=card_rsa`,
  repositoryContext: `src/services/payment-parser.ts
  src/services/payment-parser.test.ts
  src/api/checkouts/routes.ts
  src/types/payment.ts

  The PaymentParser service handles normalization of incoming payment requests before forwarding to processor APIs.`,
  recentChange: `Commit 7a3f2e1 - "feat: normalize provider payload structure"

  Changes:
  - Updated PaymentParser.formatForProvider to expect currency field
  - Modified provider payload normalization to require currency
  - Updated tests for new payload structure

  This commit was deployed to production at 14:00 UTC today, approximately 32 minutes before the alert fired.`,
  reproductionInstructions: `To reproduce the issue:

  1. Send POST request to /v1/checkouts with a payload missing the currency field:
     {
       "order_id": "ord_992831",
       "items": [{"sku": "PROD-001", "quantity": 1}],
       "payment_method": "card_rsa",
       "amount": 149.99
     }

  2. The request should return 500 Internal Server Error with:
     TypeError: Cannot read properties of undefined (reading 'currency')

  3. Expected: The service should handle missing currency gracefully or provide a clear validation error.`,
};

async function seedDemo() {
  console.log('Seeding demo incident...');

  try {
    // Check if demo incident already exists
    const existing = await db.query.incidents.findFirst({
      where: eq(incidents.title, DEMO_INCIDENT.title),
    });

    if (existing) {
      console.log('Demo incident already exists, skipping seed.');
      console.log(`  ID: ${existing.id}`);
      return existing.id;
    }

    const id = generateId();
    const now = new Date();

    const [created] = await db.insert(incidents).values({
      id,
      ...DEMO_INCIDENT,
      createdAt: now,
      updatedAt: now,
    }).returning();

    console.log('Demo incident created:');
    console.log(`  ID: ${created.id}`);
    console.log(`  Title: ${created.title}`);
    console.log(`  Service: ${created.service}`);
    console.log(`  Status: ${created.status}`);

    return created.id;
  } catch (error) {
    console.error('Error seeding demo:', error);
    throw error;
  }
}

// Run if executed directly
seedDemo()
  .then((id) => {
    console.log('\nDemo seed complete!');
    console.log(`Incident ID: ${id}`);
    closePool();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed failed:', err);
    closePool();
    process.exit(1);
  });
