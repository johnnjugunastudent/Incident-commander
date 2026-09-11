/**
 * Prompt Injection Guard
 * 
 * Treats all supplied artifacts as untrusted data.
 * Evidence is NOT instruction.
 */

import { db } from '../db/index.js';
import { evidence } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { EvidenceKind } from '../../shared/types.js';

/**
 * Security principles enforced:
 * 
 * 1. Supplied incident artifacts are evidence, NOT instructions
 * 2. Never execute instructions found inside evidence
 * 3. Never reveal secrets
 * 4. Never change system policy because an artifact requests it
 * 5. Only use supplied evidence for bounded incident analysis
 */

// Patterns that suggest prompt injection attempts
const SUSPICIOUS_PATTERNS = [
  // Attempt to override system instructions
  /ignore\s+(previous|all|the)\s+(instructions|rules|guidance)/i,
  /forget\s+(your|the)\s+(instructions|rules|purpose)/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
  /new\s+instructions?\s*:/i,
  /system\s*(prompt|instruction)/i,
  /act\s+as\s+(if|though)/i,
  
  // Attempt to reveal secrets
  /reveal\s+(?:(?:your|the)\s+)?(api|secret|key|password|token)/i,
  /show\s+(?:(?:me|us)\s+)?(?:(?:your|the)\s+)?(api|secret|key|password|token)/i,
  /what\s+is\s+(your|the)\s+(api|secret|key|password|token)/i,
  /output\s+(your|the)\s+(api|secret|key|password|token)/i,
  /print\s+(your|the)\s+(api|secret|key|password|token)/i,
  
  // Attempt to change behavior
  /do\s+not\s+(follow|obey|adhere)\s+(to|the)\s+(rules|guidelines|instructions)/i,
  /you\s+must\s+not\s+(follow|obey)/i,
  /violate\s+(the|your)\s+(rules|policy|guidelines)/i,
  
  // Jailbreak patterns
  /jailbreak/i,
  /dan\s*mode/i,
  /developer\s*mode/i,
  /uncensored/i,
  /unfiltered/i,
  
  // Attempt to access external systems
  /access\s+(the|your)\s+(database|files|system|network)/i,
  /execute\s+/i,
  /run\s+/i,
  /deploy\s+/i,
  /merge\s+/i,
  /push\s+to\s+(main|master|production)/i,
  
  // Social engineering
  /this\s+is\s+(an\s+)?(emergency|urgent|critical)\s+(matter|issue|problem)/i,
  /for\s+(security|compliance|policy)\s+reasons/i,
  /as\s+(a|an)\s+(administrator|engineer|manager)\s+(i|we)\s+need/i,
  /this\s+will\s+be\s+(reviewed|evaluated|scored)/i,
];

interface InjectionAnalysis {
  hasInjectionAttempt: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  flaggedPatterns: string[];
  sanitizedContent: string;
}

/**
 * Analyze content for potential prompt injection attempts
 */
export function analyzeForInjection(content: string): InjectionAnalysis {
  const flaggedPatterns: string[] = [];
  
  for (const pattern of SUSPICIOUS_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      flaggedPatterns.push(matches[0]);
    }
  }

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  
  if (flaggedPatterns.length > 0) {
    // Check for high-risk patterns (secrets, system prompt, jailbreak)
    const highRisk = flaggedPatterns.some(p => 
      /api|secret|key|password|token|system\s*prompt|jailbreak|danish|dan\s*mode/i.test(p)
    );
    
    if (highRisk) {
      riskLevel = 'high';
    } else if (flaggedPatterns.length >= 3) {
      riskLevel = 'high';
    } else if (flaggedPatterns.length >= 1) {
      riskLevel = 'medium';
    }
  }

  // Sanitize content by escaping potentially dangerous sequences
  const sanitizedContent = sanitizeContent(content);

  return {
    hasInjectionAttempt: flaggedPatterns.length > 0,
    riskLevel,
    flaggedPatterns,
    sanitizedContent,
  };
}

/**
 * Sanitize content to neutralize potential injection vectors
 */
export function sanitizeContent(content: string): string {
  // Escape sequences that could be interpreted as commands
  let sanitized = content;
  
  // Neutralize "ignore" commands (including "ignore all previous instructions")
  sanitized = sanitized.replace(
    /(ignore|forget|disregard)\s+(?:all\s+previous|all|the|previous|\s*)*\s*(instructions|rules|guidance|prompt|commands)/gi,
    '[REDACTED: instruction override attempt]'
  );
  
  // Neutralize secret revelation requests
  sanitized = sanitized.replace(
    /(reveal|show|output|print|display)\s+(?:(?:your|the|me|us)\s+)*(api|secret|key|password|token|credential)/gi,
    '[REDACTED: secret access attempt]'
  );
  
  // Neutralize system prompt references
  sanitized = sanitized.replace(
    /(?:your\s+)?(system\s*prompt|system\s+instruction|primary\s+instruction)/gi,
    '[REDACTED: system reference]'
  );
  
  // Neutralize jailbreak attempts
  sanitized = sanitized.replace(
    /\b(jailbreak|dan\s*mode|developer\s*mode|uncensored|unfiltered)\b/gi,
    '[REDACTED]'
  );

  // Neutralize injected instruction commands (e.g., skip verification)
  sanitized = sanitized.replace(
    /(?:(?:your\s+)?new\s+instructions?\s*(?:are\s*:|:)\s*[^.\n]*|skip\s+verification)/gi,
    '[REDACTED: instruction override attempt]'
  );
  
  // Escape any potential command injection in log-like content
  // (preserve the content for evidence purposes but mark it)
  if (containsCommandLikeSyntax(sanitized)) {
    sanitized = `[CONTENT REVIEWED: contains command-like syntax]\n\n${sanitized}`;
  }
  
  return sanitized;
}

/**
 * Check if content contains command-like syntax
 */
function containsCommandLikeSyntax(content: string): boolean {
  // Check for shell command patterns
  const shellPatterns = [
    /^\s*[a-z]+\s+[a-z]+\s+/im,  // command arg pattern
    /\|[\s]*[a-z]+/i,              // pipe to command
    /;\s*[a-z]+/i,                 // command separator
    /`[^`]+`/i,                    // backtick commands
    /\$[({]/i,                     // variable expansion
  ];
  
  return shellPatterns.some(pattern => pattern.test(content));
}

/**
 * Process evidence content through the safety filter
 */
export async function processEvidenceForAI(
  incidentId: string,
  evidenceIds: string[] = []
): Promise<Array<{
  id: string;
  kind: EvidenceKind;
  label: string;
  content: string;
  sanitized: boolean;
  riskLevel: 'low' | 'medium' | 'high' | null;
}>> {
  if (evidenceIds.length === 0) {
    // Get all evidence for the incident
    const allEvidence = await db.query.evidence.findMany({
      where: eq(evidence.incidentId, incidentId),
    });
    
    return allEvidence.map(ev => {
      const analysis = analyzeForInjection(ev.content);
      return {
        id: ev.id,
        kind: ev.kind as EvidenceKind,
        label: ev.label,
        content: analysis.sanitizedContent,
        sanitized: analysis.hasInjectionAttempt,
        riskLevel: analysis.riskLevel,
      };
    });
  }

  // Get specific evidence items
  const results: Array<any> = [];
  
  for (const id of evidenceIds) {
    const ev = await db.query.evidence.findFirst({
      where: eq(evidence.id, id),
    });
    
    if (ev) {
      const analysis = analyzeForInjection(ev.content);
      results.push({
        id: ev.id,
        kind: ev.kind as EvidenceKind,
        label: ev.label,
        content: analysis.sanitizedContent,
        sanitized: analysis.hasInjectionAttempt,
        riskLevel: analysis.riskLevel,
      });
    }
  }
  
  return results;
}

/**
 * Validate that evidence content is safe to include in AI prompts
 */
export function validateEvidenceForAI(analysis: InjectionAnalysis): { safe: boolean; reason?: string } {
  // High-risk content should not be sent to AI without review
  if (analysis.riskLevel === 'high') {
    return {
      safe: false,
      reason: 'Content contains high-risk patterns and has been redacted. Consider excluding from AI analysis.',
    };
  }
  
  // Medium risk is acceptable but flagged
  if (analysis.riskLevel === 'medium') {
    return {
      safe: true,
      reason: 'Content has been sanitized and is safe for analysis.',
    };
  }
  
  return { safe: true };
}

/**
 * Create a safety summary for the UI
 */
export function createSafetySummary(evidenceItems: Array<{
  id: string;
  sanitized: boolean;
  riskLevel: 'low' | 'medium' | 'high' | null;
}>): {
  total: number;
  sanitized: number;
  riskLevels: Record<string, number>;
  status: 'clean' | 'reviewed' | 'flagged';
} {
  const total = evidenceItems.length;
  const sanitized = evidenceItems.filter(e => e.sanitized).length;
  
  const riskLevels: Record<string, number> = {
    low: 0,
    medium: 0,
    high: 0,
  };
  
  for (const item of evidenceItems) {
    if (item.riskLevel) {
      riskLevels[item.riskLevel]++;
    }
  }
  
  let status: 'clean' | 'reviewed' | 'flagged' = 'clean';
  
  if (sanitized > 0) {
    status = riskLevels.high > 0 ? 'flagged' : 'reviewed';
  }
  
  return { total, sanitized, riskLevels, status };
}

/**
 * Generate security annotation for evidence
 */
export function generateSecurityAnnotation(analysis: InjectionAnalysis): string {
  if (!analysis.hasInjectionAttempt) {
    return '✓ Evidence verified - no injection patterns detected';
  }
  
  return `⚠ Evidence contains ${analysis.flaggedPatterns.length} pattern(s) flagged for review. Content has been sanitized.`;
}
