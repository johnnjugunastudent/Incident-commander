/**
 * Evidence Graph Service
 * 
 * Manages evidence relationships and enables evidence chain tracing.
 * Allows answering "Why does Incident Commander believe this is the root cause?"
 */

import { db, generateId } from '../db/index.js';
import { 
  evidence, 
  evidenceRelationships 
} from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { EvidenceKind } from '../../shared/types.js';

export interface EvidenceNode {
  id: string;
  kind: EvidenceKind;
  label: string;
  content: string;
  sourcePath?: string;
  lineRange?: string;
  createdAt: Date;
  relationships: Array<{
    targetId: string;
    targetLabel: string;
    targetKind: EvidenceKind;
    relationshipType: 'supports' | 'contradicts' | 'references' | 'derived_from';
  }>;
}

export interface EvidenceChain {
  source: EvidenceNode;
  path: Array<{
    from: EvidenceNode;
    relationship: 'supports' | 'contradicts' | 'references' | 'derived_from';
    to: EvidenceNode;
  }>;
}

export type RelationshipType = 'supports' | 'contradicts' | 'references' | 'derived_from';

/**
 * Create an evidence relationship
 */
export async function createEvidenceRelationship(
  sourceId: string,
  targetId: string,
  relationshipType: RelationshipType = 'supports'
): Promise<string> {
  const id = generateId();

  await db.insert(evidenceRelationships).values({
    id,
    sourceId,
    targetId,
    relationshipType,
    createdAt: new Date(),
  });

  return id;
}

/**
 * Get evidence with its relationships
 */
export async function getEvidenceWithRelationships(incidentId: string): Promise<Map<string, EvidenceNode>> {
  const allEvidence = await db.query.evidence.findMany({
    where: eq(evidence.incidentId, incidentId),
  });

  const relationships = await db.query.evidenceRelationships.findMany();

  const nodes = new Map<string, EvidenceNode>();

  for (const ev of allEvidence) {
    const node: EvidenceNode = {
      id: ev.id,
      kind: ev.kind as EvidenceKind,
      label: ev.label,
      content: ev.content,
      sourcePath: ev.sourcePath ?? undefined,
      lineRange: ev.lineRange ?? undefined,
      createdAt: ev.createdAt,
      relationships: [],
    };
    nodes.set(ev.id, node);
  }

  for (const rel of relationships) {
    const source = nodes.get(rel.sourceId);
    const target = nodes.get(rel.targetId);

    if (source && target) {
      source.relationships.push({
        targetId: target.id,
        targetLabel: target.label,
        targetKind: target.kind,
        relationshipType: rel.relationshipType as any,
      });
    }
  }

  return nodes;
}

/**
 * Trace evidence chain from a claim back to source evidence
 */
export async function traceEvidenceChain(
  incidentId: string,
  claimEvidenceIds: string[]
): Promise<EvidenceChain[]> {
  const nodes = await getEvidenceWithRelationships(incidentId);
  const chains: EvidenceChain[] = [];

  for (const claimId of claimEvidenceIds) {
    const claimNode = nodes.get(claimId);
    if (!claimNode) continue;

    // BFS to find path to source evidence (logs, alerts, commits, etc.)
    const path = traceToSource(claimNode, nodes);
    if (path.length > 0) {
      chains.push({
        source: claimNode,
        path,
      });
    }
  }

  return chains;
}

/**
 * Trace from a node back to source evidence (logs, alerts, commits, reproduction, tests)
 */
function traceToSource(
  node: EvidenceNode,
  allNodes: Map<string, EvidenceNode>,
  visited: Set<string> = new Set()
): Array<{
  from: EvidenceNode;
  relationship: RelationshipType;
  to: EvidenceNode;
}> {
  if (visited.has(node.id)) return [];
  visited.add(node.id);

  const sourceKinds: EvidenceKind[] = ['alert', 'log', 'source', 'commit', 'reproduction', 'test'];
  
  // If this node is itself source evidence, we're done
  if (sourceKinds.includes(node.kind)) {
    return [];
  }

  const path: Array<any> = [];

  // Follow relationships
  for (const rel of node.relationships) {
    const target = allNodes.get(rel.targetId);
    if (!target) continue;

    const step = {
      from: node,
      relationship: rel.relationshipType,
      to: target,
    };

    path.push(step);

    // If target is source evidence, we found a path
    if (sourceKinds.includes(target.kind)) {
      continue;
    }

    // Otherwise, continue tracing
    const subPath = traceToSource(target, allNodes, visited);
    path.push(...subPath);
  }

  return path;
}

/**
 * Get the evidence chain for a diagnosis claim
 */
export async function getClaimEvidenceChain(
  incidentId: string,
  claimEvidenceIds: string[]
): Promise<Array<{
  claimId: string;
  claimText: string;
  evidenceChain: EvidenceChain[];
}>> {
  const nodes = await getEvidenceWithRelationships(incidentId);
  const results: Array<any> = [];

  for (const claimId of claimEvidenceIds) {
    const claimNode = nodes.get(claimId);
    if (!claimNode) continue;

    const chain = await traceEvidenceChain(incidentId, [claimId]);
    
    results.push({
      claimId,
      claimText: claimNode.content.slice(0, 200),
      evidenceChain: chain,
    });
  }

  return results;
}

/**
 * Build evidence graph for visualization
 */
export async function buildEvidenceGraph(incidentId: string): Promise<{
  nodes: Array<{
    id: string;
    label: string;
    kind: EvidenceKind;
    x?: number;
    y?: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    relationship: RelationshipType;
  }>;
}> {
  const nodesMap = await getEvidenceWithRelationships(incidentId);

  const nodes: Array<any> = [];
  const edges: Array<any> = [];
  const positionMap = new Map<string, { x: number; y: number }>();

  // Assign positions (simple layout)
  const kindRows: Record<EvidenceKind, number> = {
    alert: 0,
    log: 1,
    source: 2,
    commit: 3,
    reproduction: 4,
    test: 5,
    model_claim: 6,
  };

  let xOffset = 0;
  for (const [id, node] of nodesMap) {
    const row = kindRows[node.kind] || 0;
    const col = xOffset++;
    
    positionMap.set(id, { x: col * 200, y: row * 150 });
    
    nodes.push({
      id,
      label: node.label,
      kind: node.kind,
      x: col * 200,
      y: row * 150,
    });

    // Add edges
    for (const rel of node.relationships) {
      edges.push({
        source: id,
        target: rel.targetId,
        relationship: rel.relationshipType,
      });
    }
  }

  return { nodes, edges };
}

/**
 * Find evidence by kind
 */
export async function findEvidenceByKind(
  incidentId: string,
  kind: EvidenceKind
): Promise<EvidenceNode[]> {
  const allEvidence = await db.query.evidence.findMany({
    where: and(
      eq(evidence.incidentId, incidentId),
      eq(evidence.kind, kind),
    ),
  });

  const nodes = await getEvidenceWithRelationships(incidentId);

  return allEvidence
    .map(ev => nodes.get(ev.id))
    .filter((n): n is EvidenceNode => n !== undefined);
}

/**
 * Get supporting evidence count for a claim
 */
export async function getSupportingEvidenceCount(
  claimEvidenceId: string
): Promise<{
  direct: number;
  transitive: number;
}> {
  const relationships = await db.query.evidenceRelationships.findMany({
    where: eq(evidenceRelationships.sourceId, claimEvidenceId),
  });

  const direct = relationships.length;
  
  // Count transitive (relationships of relationships)
  let transitive = 0;
  for (const rel of relationships) {
    const subRelations = await db.query.evidenceRelationships.findMany({
      where: eq(evidenceRelationships.sourceId, rel.targetId),
    });
    transitive += subRelations.length;
  }

  return { direct, transitive };
}
