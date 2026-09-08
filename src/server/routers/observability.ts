import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { db } from '../db/index.js';
import { incidents, investigationEvents, evidence } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

export interface TelemetryData {
  service: string;
  severity: string;
  status: string;
  fivexxRate: number;
  totalRequests: number;
  failedRequests: number;
  successfulRequests: number;
  avgResponseTime: number;
  activeIncidents: number;
  investigatingCount: number;
  awaitingReviewCount: number;
  resolvedCount: number;
  evidenceCount: number;
}

/**
 * Get controlled demo telemetry for the checkout incident
 * This is clearly labeled as demo data
 */
export const observabilityRouter = router({
  getTelemetry: publicProcedure
    .input(z.object({ incidentId: z.string().uuid() }))
    .query(async ({ input }) => {
      const incident = await db.query.incidents.findFirst({
        where: eq(incidents.id, input.incidentId),
      });

      if (!incident) {
        return null;
      }

      // Generate demo telemetry based on incident characteristics
      const isCheckoutIncident = 
        incident.title.toLowerCase().includes('checkout') ||
        incident.service.toLowerCase().includes('checkout');

      if (isCheckoutIncident) {
        // Controlled demo data for checkout outage
        return {
          service: incident.service || 'checkout-service',
          severity: incident.severity || 'high',
          status: incident.status || 'awaiting_review',
          fivexxRate: 18.7,
          totalRequests: 12482,
          failedRequests: 2341,
          successfulRequests: 10141,
          avgResponseTime: 245, // ms
          activeIncidents: 1,
          investigatingCount: 0,
          awaitingReviewCount: 1,
          resolvedCount: 0,
          evidenceCount: await db.query.evidence.findMany({
            where: eq(evidence.incidentId, input.incidentId),
          }).then(r => r.length),
          _demoData: true,
          _demoSince: '2024-03-15T14:32:00Z',
        };
      }

      // Generic telemetry for other incidents
      const events = await db.query.investigationEvents.findMany({
        where: eq(investigationEvents.incidentId, input.incidentId),
        orderBy: [desc(investigationEvents.createdAt)],
        limit: 10,
      });

      const evidenceCount = await db.query.evidence.findMany({
        where: eq(evidence.incidentId, input.incidentId),
      }).then(r => r.length);

      return {
        service: incident.service || 'unknown-service',
        severity: incident.severity || 'medium',
        status: incident.status || 'open',
        fivexxRate: 0,
        totalRequests: 0,
        failedRequests: 0,
        successfulRequests: 0,
        avgResponseTime: 0,
        activeIncidents: 1,
        investigatingCount: events.some(e => e.status === 'running') ? 1 : 0,
        awaitingReviewCount: incident.status === 'awaiting_review' ? 1 : 0,
        resolvedCount: incident.status === 'resolved' ? 1 : 0,
        evidenceCount,
        _demoData: false,
      };
    }),

  getIncidentMetrics: publicProcedure
    .query(async () => {
      // Get counts by status
      const allIncidents = await db.query.incidents.findMany();

      const active = allIncidents.filter(i => 
        i.status === 'open' || i.status === 'investigating'
      ).length;
      
      const investigating = allIncidents.filter(i => i.status === 'investigating').length;
      const awaitingReview = allIncidents.filter(i => i.status === 'awaiting_review').length;
      const resolved = allIncidents.filter(i => i.status === 'resolved').length;

      return {
        totalIncidents: allIncidents.length,
        activeIncidents: active,
        investigatingCount: investigating,
        awaitingReviewCount: awaitingReview,
        resolvedCount: resolved,
        lastUpdated: new Date(),
      };
    }),

  getInvestigationProgress: publicProcedure
    .input(z.object({ incidentId: z.string().uuid() }))
    .query(async ({ input }) => {
      const events = await db.query.investigationEvents.findMany({
        where: eq(investigationEvents.incidentId, input.incidentId),
        orderBy: [desc(investigationEvents.createdAt)],
      });

      // Get latest status per stage
      const stageStatuses: Record<string, string> = {};
      for (const event of events) {
        if (!stageStatuses[event.stage] || event.createdAt > new Date(stageStatuses[event.stage])) {
          stageStatuses[event.stage] = event.status;
        }
      }

      const stages = [
        { stage: 'detection', status: stageStatuses['detection'] || 'pending', label: 'Detection' },
        { stage: 'investigation', status: stageStatuses['investigation'] || 'pending', label: 'Investigation' },
        { stage: 'reproduction', status: stageStatuses['reproduction'] || 'pending', label: 'Reproduction' },
        { stage: 'diagnosis', status: stageStatuses['diagnosis'] || 'pending', label: 'Diagnosis' },
        { stage: 'repair', status: stageStatuses['repair'] || 'pending', label: 'Repair' },
        { stage: 'verification', status: stageStatuses['verification'] || 'pending', label: 'Verification' },
      ];

      const completedStages = stages.filter(s => s.status === 'completed').length;
      const progress = Math.round((completedStages / stages.length) * 100);

      return {
        stages,
        progress,
        totalStages: stages.length,
        completedStages,
      };
    }),
});
