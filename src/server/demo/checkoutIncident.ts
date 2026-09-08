/**
 * Checkout Demo Incident Data
 * 
 * Controlled demo data for the checkout API elevated 5xx responses incident.
 */

import { db, generateId } from '../db/index.js';
import { incidents, evidence, rootCauseReports, patchReviews } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export interface DemoIncidentData {
  title: string;
  service: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  status: string;
  impactSummary: string;
  alertContext: string;
  logs: string;
  repositoryContext: string;
  recentChange: string;
  reproductionInstructions: string;
}

export const DEMO_INCIDENT: DemoIncidentData = {
  title: 'Checkout API: Elevated 5xx Responses',
  service: 'checkout-service',
  severity: 'high',
  status: 'awaiting_review',
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
  currency=undefined, payment_method=card_rsa
  
  2024-03-15T14:32:05Z ERROR [checkout-service] POST /v1/checkouts - 500 Internal Server Error
  at PaymentParser.parsePaymentRequest (payment-parser.ts:142:15)
  TypeError: Cannot read properties of undefined (reading 'currency')
  at PaymentParser.formatForProvider (payment-parser.ts:89:10)

  2024-03-15T14:32:12Z ERROR [checkout-service] POST /v1/checkouts - 500 Internal Server Error
  at PaymentParser.parsePaymentRequest (payment-parser.ts:142:15)
  TypeError: Cannot read properties of undefined (reading 'currency')
  at PaymentParser.formatForProvider (payment-parser.ts:89:10)

  2024-03-15T14:32:18Z ERROR [checkout-service] POST /v1/checkouts - 500 Internal Server Error
  at PaymentParser.parsePaymentRequest (payment-parser.ts:142:15)
  TypeError: Cannot read properties of undefined (reading 'currency')
  at PaymentParser.formatForProvider (payment-parser.ts:89:10)`,

  repositoryContext: `src/services/payment-parser.ts (line 85-110)
  src/services/payment-parser.test.ts (line 150-175)
  src/api/checkouts/routes.ts
  src/types/payment.ts

  The PaymentParser service handles normalization of incoming payment requests before forwarding to processor APIs.
  Key files involved:
  - PaymentParser.formatForProvider: Normalizes payment request for provider API
  - PaymentParser.parsePaymentRequest: Validates and parses incoming requests
  - payment-parser.test.ts: Contains unit tests for the parser`,

  recentChange: `Commit 7a3f2e1 - "feat: normalize provider payload structure"

  Author: payment-team
  Date: 2024-03-15T14:00:00Z
  
  Changes:
  - Updated PaymentParser.formatForProvider to expect currency field
  - Modified provider payload normalization to require currency
  - Updated tests for new payload structure
  - Added currency validation to request parsing

  Diff summary:
  + Added: currency field requirement in formatForProvider
  + Changed: payload normalization to use currency code
  + Changed: test expectations for new payload format
  
  This commit was deployed to production at 14:00 UTC today, 
  approximately 32 minutes before the alert fired.`,

  reproductionInstructions: `To reproduce the issue:

  1. Send POST request to /v1/checkouts with a payload missing the currency field:
  
     curl -X POST https://api.example.com/v1/checkouts \\
       -H "Content-Type: application/json" \\
       -d '{
         "order_id": "ord_992831",
         "items": [{"sku": "PROD-001", "quantity": 1}],
         "payment_method": "card_rsa",
         "amount": 149.99
       }'
  
  2. The request should return 500 Internal Server Error with:
  
     {
       "error": "Internal Server Error",
       "message": "TypeError: Cannot read properties of undefined (reading 'currency')"
     }
  
  3. Expected behavior:
     - Service should handle missing currency gracefully
     - Should default to USD or return a clear 400 validation error
     - Should NOT crash with TypeError`,
};

export const DEMO_EVIDENCE = [
  {
    kind: 'alert' as const,
    label: 'PagerDuty Alert',
    content: `PagerDuty Incident #PD-88472
Triggered: 2024-03-15T14:32:01Z
Severity: High
Service: checkout-service
Alert: checkout-service.high_error_rate

Details:
- 5xx rate: 8.7% (threshold: 5%)
- Baseline: 0.2%
- Duration: 10 minutes and counting
- Affected endpoints: POST /v1/checkouts
- Error pattern: TypeError in PaymentParser`,
  },
  {
    kind: 'log' as const,
    label: 'Application Error Logs',
    content: `2024-03-15T14:32:01Z ERROR [checkout-service] POST /v1/checkouts - 500 Internal Server Error
  at PaymentParser.parsePaymentRequest (payment-parser.ts:142:15)
  TypeError: Cannot read properties of undefined (reading 'currency')
  at PaymentParser.formatForProvider (payment-parser.ts:89:10)`,
    sourcePath: 'logs/checkout-service/error.log',
    lineRange: '142-143',
  },
  {
    kind: 'source' as const,
    label: 'Payment Parser Source',
    content: `export class PaymentParser {
  parsePaymentRequest(raw: unknown): PaymentRequest {
    const payload = raw as Record<string, unknown>;
    
    if (!payload.orderId || !payload.amount) {
      throw new ValidationError('Missing required fields');
    }
    
    return {
      orderId: payload.orderId as string,
      amount: payload.amount as number,
      currency: payload.currency as string, // Line 89 - this is where the error occurs
      paymentMethod: payload.paymentMethod as string,
      items: payload.items as Item[],
    };
  }
  
  formatForProvider(payload: PaymentRequest): ProviderPayload {
    const currencyCode = payload.currency.toUpperCase(); // Line 89: crashes when currency is undefined
    const amountInMinorUnits = this.convertToMinorUnits(payload.amount, currencyCode);
    
    return {
      amount: amountInMinorUnits,
      currency: currencyCode,
      paymentMethod: payload.paymentMethod,
      orderId: payload.orderId,
    };
  }
  
  private convertToMinorUnits(amount: number, currency: string): number {
    // Conversion logic based on currency
    const multipliers: Record<string, number> = {
      USD: 100,
      EUR: 100,
      GBP: 100,
    };
    return Math.round(amount * (multipliers[currency] || 100));
  }
}`,
    sourcePath: 'src/services/payment-parser.ts',
    lineRange: '85-110',
  },
  {
    kind: 'commit' as const,
    label: 'Recent Commit 7a3f2e1',
    content: `commit 7a3f2e1a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e
Author: payment-team <payment@example.com>
Date:   Fri Mar 15 14:00:00 2024 +0000

    feat: normalize provider payload structure
    
    This commit normalizes the provider payload structure to match
    the updated API specification.
    
    Changes:
    - Updated PaymentParser.formatForProvider to expect currency field
    - Modified provider payload normalization to require currency
    - Updated tests for new payload structure
    
    Reviewed-by: engineering-lead
    Approved-by: tech-lead`,
    sourcePath: 'git log --oneline -1',
  },
  {
    kind: 'reproduction' as const,
    label: 'Reproduction Test Payload',
    content: `Test Case: Missing Currency Field

  Payload:
  {
    "order_id": "ord_992831",
    "items": [{"sku": "PROD-001", "quantity": 1}],
    "payment_method": "card_rsa",
    "amount": 149.99
    // NOTE: currency field is intentionally missing
  }
  
  Expected Result:
  - 500 Internal Server Error
  - TypeError: Cannot read properties of undefined (reading 'currency')
  
  Actual Result (after deploy):
  - 500 Internal Server Error
  - TypeError: Cannot read properties of undefined (reading 'currency')
  
  Reproduced: Yes`,
    sourcePath: 'test-payloads/missing-currency.json',
  },
  {
    kind: 'test' as const,
    label: 'Existing Unit Tests',
    content: `describe('PaymentParser', () => {
  describe('formatForProvider', () => {
    it('should normalize payload with USD currency', () => {
      const parser = new PaymentParser();
      const result = parser.formatForProvider({
        orderId: 'ord_123',
        amount: 100.00,
        currency: 'USD',
        paymentMethod: 'card_rsa',
      });
      
      expect(result.currency).toBe('USD');
      expect(result.amount).toBe(10000);
    });
    
    it('should normalize payload with EUR currency', () => {
      const parser = new PaymentParser();
      const result = parser.formatForProvider({
        orderId: 'ord_456',
        amount: 99.99,
        currency: 'EUR',
        paymentMethod: 'card_rsa',
      });
      
      expect(result.currency).toBe('EUR');
      expect(result.amount).toBe(9999);
    });
    
    // NOTE: No test for missing currency field!
  });
});`,
    sourcePath: 'src/services/payment-parser.test.ts',
    lineRange: '150-175',
  },
];

/**
 * Seed the demo incident and evidence
 */
export async function seedDemoIncident(): Promise<string | null> {
  // Check if demo incident already exists
  const existing = await db.query.incidents.findFirst({
    where: eq(incidents.title, DEMO_INCIDENT.title),
  });

  if (existing) {
    return existing.id;
  }

  const id = generateId();
  const now = new Date();

  // Create incident
  await db.insert(incidents).values({
    id,
    ...DEMO_INCIDENT,
    createdAt: now,
    updatedAt: now,
  });

  // Create evidence records
  for (const ev of DEMO_EVIDENCE) {
    await db.insert(evidence).values({
      id: generateId(),
      incidentId: id,
      kind: ev.kind,
      label: ev.label,
      content: ev.content,
      sourcePath: ev.sourcePath,
      lineRange: ev.lineRange,
      createdAt: now,
    });
  }

  return id;
}

/**
 * Generate demo root cause report
 */
export async function seedDemoRootCause(incidentId: string): Promise<void> {
  const existing = await db.query.rootCauseReports.findFirst({
    where: eq(rootCauseReports.incidentId, incidentId),
  });

  if (existing) return;

  const now = new Date();

  await db.insert(rootCauseReports).values({
    id: generateId(),
    incidentId,
    summary: 'The checkout service is failing because the PaymentParser.formatForProvider function expects a currency field in the payment request payload, but recent payloads from the payment provider are missing this field. This was likely introduced by the provider-payload normalization change deployed at 14:00 UTC.',
    confidence: 0.85,
    claims: [
      {
        text: 'The error logs show TypeError: Cannot read properties of undefined (reading \'currency\') in PaymentParser.formatForProvider at payment-parser.ts:89:10',
        evidenceIds: [],
      },
      {
        text: 'The recent commit 7a3f2e1 updated PaymentParser.formatForProvider to require currency field in the provider payload',
        evidenceIds: [],
      },
      {
        text: 'The reproduction instructions confirm that sending a payload without currency triggers the exact same error',
        evidenceIds: [],
      },
    ],
    limitations: 'Confidence is not 100% because we have not directly observed the payment provider\'s payload change. The correlation with the deployment time is strong but not definitive proof of causation.',
    modelName: 'nemotron-4-340b-instruct',
    inferenceMode: 'demo',
    createdAt: now,
  });

  // Create patch review
  await db.insert(patchReviews).values({
    id: generateId(),
    incidentId,
    summary: 'Add optional chaining and a fallback for missing currency field. The PaymentParser should handle missing currency gracefully by using a default or providing a clear validation error rather than crashing.',
    diff: `diff --git a/src/services/payment-parser.ts b/src/services/payment-parser.ts
index abc123..def456 100644
--- a/src/services/payment-parser.ts
+++ b/src/services/payment-parser.ts
@@ -85,8 +85,12 @@ export class PaymentParser {
   formatForProvider(payload: PaymentRequest): ProviderPayload {
-    const currencyCode = payload.currency.toUpperCase();
-    const amountInMinorUnits = this.convertToMinorUnits(payload.amount, currencyCode);
+    // Handle missing currency gracefully
+    const currencyCode = payload.currency?.toUpperCase() ?? 'USD';
+
+    if (!payload.currency) {
+      console.warn('Payment request missing currency field, defaulting to USD');
+    }
+
     return {
       amount: amountInMinorUnits,
       currency: currencyCode,

diff --git a/src/services/payment-parser.test.ts b/src/services/payment-parser.test.ts
index 111111..222222 100644
--- a/src/services/payment-parser.test.ts
+++ b/src/services/payment-parser.test.ts
@@ -150,6 +150,20 @@ describe('PaymentParser', () => {
     });
   });

+  describe('formatForProvider with missing currency', () => {
+    it('should default to USD when currency is missing', () => {
+      const parser = new PaymentParser();
+      const result = parser.formatForProvider({
+        orderId: 'ord_992831',
+        amount: 14999,
+        paymentMethod: 'card_rsa',
+        // currency is missing
+      });
+
+      expect(result.currency).toBe('USD');
+      expect(result.warning).toBe('missing_currency');
+    });
+  });
 });`,
    filesChanged: [
      'src/services/payment-parser.ts',
      'src/services/payment-parser.test.ts',
    ],
    confidence: 0.85,
    verificationStatus: 'passed',
    approvalStatus: 'proposed',
    verificationOutput: `> payment-parser.test.ts
 PASS  src/services/payment-parser.test.ts
   ✓ PaymentParser.parsePaymentRequest validates required fields (23ms)
   ✓ PaymentParser.formatForProvider normalizes payload structure (18ms)
   ✓ PaymentParser.formatForProvider with missing currency should default to USD (12ms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
Snapshots:   0 total
Time:        1.24s

> Build successful

> E2E Test: Checkout with missing currency
  Request: POST /v1/checkouts
  Payload: { order_id: "ord_992831", amount: 149.99, payment_method: "card_rsa" }
  Response: 200 OK - { checkout_id: "chk_992831", status: "pending", currency: "USD" }
  ✓ Checkout completed successfully with default currency`,
    createdAt: now,
  });

  // Update incident status
  await db.update(incidents).set({
    status: 'awaiting_review',
    updatedAt: now,
  }).where(eq(incidents.id, incidentId));
}
