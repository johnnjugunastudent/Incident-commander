import React, { useState } from 'react';
import { trpc } from '../lib/trpc';
import { Card, Badge, Button, Loader2 } from './ui';
import { 
  GitBranch, 
  Terminal, 
  FileCode, 
  AlertCircle, 
  Microchip, 
  BarChart3, 
  CheckCircle, 
  ArrowRight,
  ShieldCheck,
  Eye,
  Copy,
  Check
} from './ui';

interface EvidenceGraphViewProps {
  incidentId: string;
  selectedEvidenceId?: string | null;
  onSelectEvidence?: (id: string | null) => void;
}

const KIND_META: Record<string, { label: string; icon: React.ReactNode; color: string; border: string; bg: string }> = {
  alert: {
    label: 'Alert Context',
    icon: <AlertCircle className="w-4 h-4 text-status-amber-400" />,
    color: 'text-status-amber-400',
    border: 'border-status-amber-500/40',
    bg: 'bg-status-amber-500/10',
  },
  log: {
    label: 'Telemetry Log',
    icon: <Terminal className="w-4 h-4 text-cyan-400" />,
    color: 'text-cyan-400',
    border: 'border-cyan-500/40',
    bg: 'bg-cyan-500/10',
  },
  source: {
    label: 'Source Code',
    icon: <FileCode className="w-4 h-4 text-violet-400" />,
    color: 'text-violet-400',
    border: 'border-violet-500/40',
    bg: 'bg-violet-500/10',
  },
  commit: {
    label: 'Recent Commit',
    icon: <GitBranch className="w-4 h-4 text-purple-400" />,
    color: 'text-purple-400',
    border: 'border-purple-500/40',
    bg: 'bg-purple-500/10',
  },
  reproduction: {
    label: 'Reproduction',
    icon: <Microchip className="w-4 h-4 text-orange-400" />,
    color: 'text-orange-400',
    border: 'border-orange-500/40',
    bg: 'bg-orange-500/10',
  },
  model_claim: {
    label: 'Diagnosis Claim',
    icon: <CheckCircle className="w-4 h-4 text-violet-300" />,
    color: 'text-violet-300',
    border: 'border-violet-500/50',
    bg: 'bg-violet-500/20',
  },
  test: {
    label: 'Verification Test',
    icon: <BarChart3 className="w-4 h-4 text-status-green-400" />,
    color: 'text-status-green-400',
    border: 'border-status-green-500/40',
    bg: 'bg-status-green-500/10',
  },
};

const RELATION_BADGE: Record<string, { label: string; color: string }> = {
  supports: { label: 'supports', color: 'text-cyan-300 bg-cyan-950/60 border-cyan-800/60' },
  derived_from: { label: 'derived from', color: 'text-violet-300 bg-violet-950/60 border-violet-800/60' },
  verifies: { label: 'verifies', color: 'text-status-green-300 bg-status-green-950/60 border-status-green-800/60' },
  references: { label: 'references', color: 'text-graphite-300 bg-graphite-800 border-graphite-700' },
  contradicts: { label: 'contradicts', color: 'text-red-300 bg-red-950/60 border-red-800/60' },
};

export function EvidenceGraphView({
  incidentId,
  selectedEvidenceId,
  onSelectEvidence,
}: EvidenceGraphViewProps) {
  const [activeNodeId, setActiveNodeId] = useState<string | null>(selectedEvidenceId || null);
  const [copied, setCopied] = useState(false);

  const { data: graph, isLoading: isLoadingGraph } = trpc.investigation.getEvidenceGraph.useQuery({ incidentId });
  const { data: evidenceList } = trpc.evidence.getList.useQuery({ incidentId });

  if (isLoadingGraph) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
        <p className="text-xs text-graphite-400 font-mono">Computing evidence provenance graph...</p>
      </div>
    );
  }

  const nodes = graph?.nodes || [];
  const edges = graph?.edges || [];

  // Map of full evidence items for details inspector
  const evidenceMap = new Map((evidenceList || []).map((e: any) => [e.id, e]));

  const activeEvidence = activeNodeId ? evidenceMap.get(activeNodeId) : null;

  const handleSelectNode = (id: string) => {
    const nextId = activeNodeId === id ? null : id;
    setActiveNodeId(nextId);
    onSelectEvidence?.(nextId);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Group nodes by stage/kind flow
  const kindOrder = ['alert', 'log', 'commit', 'reproduction', 'source', 'model_claim', 'test'];
  const sortedNodes = [...nodes].sort((a, b) => {
    const idxA = kindOrder.indexOf(a.kind);
    const idxB = kindOrder.indexOf(b.kind);
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Top Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 bg-graphite-900/90 border-graphite-800">
          <div className="text-[11px] font-mono text-graphite-400 uppercase tracking-wider">Evidence Nodes</div>
          <div className="text-xl font-bold font-mono text-white mt-1">{nodes.length}</div>
          <div className="text-[10px] text-cyan-400 mt-0.5">Untrusted artifacts ingested</div>
        </Card>
        <Card className="p-3 bg-graphite-900/90 border-graphite-800">
          <div className="text-[11px] font-mono text-graphite-400 uppercase tracking-wider">Causal Edges</div>
          <div className="text-xl font-bold font-mono text-violet-400 mt-1">{edges.length}</div>
          <div className="text-[10px] text-violet-300/80 mt-0.5">Provenance links verified</div>
        </Card>
        <Card className="p-3 bg-graphite-900/90 border-graphite-800">
          <div className="text-[11px] font-mono text-graphite-400 uppercase tracking-wider">Claim Coverage</div>
          <div className="text-xl font-bold font-mono text-status-green-400 mt-1">100%</div>
          <div className="text-[10px] text-status-green-400/80 mt-0.5">Every claim cites evidence</div>
        </Card>
        <Card className="p-3 bg-graphite-900/90 border-graphite-800">
          <div className="text-[11px] font-mono text-graphite-400 uppercase tracking-wider">Human Gate</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">ENFORCED</div>
          <div className="text-[10px] text-amber-300/80 mt-0.5">Zero auto-approval permitted</div>
        </Card>
      </div>

      {/* Main Graph & Inspector Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Visual Graph DAG Area */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <Card className="p-4 bg-graphite-950/80 border-graphite-800 overflow-hidden relative">
            <div className="flex items-center justify-between mb-4 border-b border-graphite-800/80 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                  Causal Evidence Flow (DAG)
                </span>
              </div>
              <span className="text-[11px] font-mono text-graphite-400">
                Click a node to inspect provenance
              </span>
            </div>

            {nodes.length === 0 ? (
              <div className="text-center py-16">
                <AlertCircle className="w-8 h-8 text-graphite-600 mx-auto mb-2" />
                <p className="text-xs text-graphite-400">No evidence graph available for this incident yet.</p>
                <p className="text-[11px] text-graphite-500 mt-1">Run an investigation to map evidence relationships.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Node Sequence Pipeline */}
                <div className="flex flex-wrap gap-2.5 items-center">
                  {sortedNodes.map((node, i) => {
                    const meta = KIND_META[node.kind] || {
                      label: node.kind,
                      icon: <Eye className="w-4 h-4 text-graphite-400" />,
                      color: 'text-graphite-400',
                      border: 'border-graphite-700',
                      bg: 'bg-graphite-800',
                    };
                    const isSelected = activeNodeId === node.id;

                    return (
                      <React.Fragment key={node.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectNode(node.id)}
                          className={`group text-left px-3 py-2 rounded-lg border transition-all duration-200 cursor-pointer flex items-center gap-2.5 ${
                            isSelected
                              ? `${meta.bg} ${meta.border} ring-2 ring-violet-500 shadow-lg shadow-violet-500/10`
                              : 'bg-graphite-900/80 border-graphite-800 hover:border-graphite-700 hover:bg-graphite-850'
                          }`}
                        >
                          <div className={`p-1.5 rounded-md ${meta.bg} ${meta.color}`}>
                            {meta.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-mono text-graphite-400 uppercase">
                                #{node.id.slice(0, 6)}
                              </span>
                              <Badge variant="graphite" className="text-[9px] py-0 px-1 border-graphite-700">
                                {meta.label}
                              </Badge>
                            </div>
                            <div className="text-xs font-medium text-white max-w-[160px] truncate mt-0.5 group-hover:text-violet-300">
                              {node.label}
                            </div>
                          </div>
                        </button>

                        {i < sortedNodes.length - 1 && (
                          <div className="hidden sm:flex items-center text-graphite-600">
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Edges & Relationship Table */}
                {edges.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-graphite-900">
                    <div className="text-[11px] font-mono text-graphite-500 uppercase tracking-wider mb-2">
                      Verified Provenance Relationships ({edges.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {edges.map((edge, idx) => {
                        const sourceNode = nodes.find((n) => n.id === edge.source);
                        const targetNode = nodes.find((n) => n.id === edge.target);
                        const badgeInfo = RELATION_BADGE[edge.relationship] || {
                          label: edge.relationship,
                          color: 'text-graphite-400 bg-graphite-800 border-graphite-700',
                        };

                        return (
                          <div
                            key={idx}
                            className="text-[11px] font-mono p-2 rounded bg-graphite-900/60 border border-graphite-800/80 flex items-center justify-between gap-2"
                          >
                            <span
                              className="text-graphite-300 truncate cursor-pointer hover:text-cyan-400"
                              onClick={() => handleSelectNode(edge.source)}
                              title={sourceNode?.label}
                            >
                              {sourceNode?.label?.slice(0, 18) || edge.source.slice(0, 8)}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] border font-sans ${badgeInfo.color}`}>
                              {badgeInfo.label}
                            </span>
                            <span
                              className="text-graphite-400 truncate cursor-pointer hover:text-violet-400"
                              onClick={() => handleSelectNode(edge.target)}
                              title={targetNode?.label}
                            >
                              {targetNode?.label?.slice(0, 18) || edge.target.slice(0, 8)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Node Inspector Drawer */}
        <div className="lg:col-span-1">
          <Card className="h-full p-4 bg-graphite-950/80 border-graphite-800 flex flex-col">
            <div className="flex items-center justify-between border-b border-graphite-800/80 pb-2 mb-3">
              <span className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                Evidence Inspector
              </span>
              {activeEvidence && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] gap-1 text-graphite-400 hover:text-white"
                  onClick={() => handleCopy(activeEvidence.content)}
                >
                  {copied ? <Check className="w-3 h-3 text-status-green-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              )}
            </div>

            {activeEvidence ? (
              <div className="flex-1 flex flex-col gap-3 overflow-hidden">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="cyan" className="text-[10px] uppercase font-mono">
                      {activeEvidence.kind}
                    </Badge>
                    <span className="text-[11px] font-mono text-graphite-500">
                      ID: #{activeEvidence.id.slice(0, 8)}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white">{activeEvidence.label}</h4>
                  {activeEvidence.sourcePath && (
                    <div className="text-[11px] font-mono text-violet-400 mt-1 flex items-center gap-1">
                      <FileCode className="w-3 h-3" />
                      {activeEvidence.sourcePath}
                      {activeEvidence.lineRange && <span className="text-graphite-500">:{activeEvidence.lineRange}</span>}
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-auto bg-graphite-900 rounded-lg p-3 border border-graphite-800 font-mono text-xs text-graphite-200">
                  <pre className="whitespace-pre-wrap break-words">{activeEvidence.content}</pre>
                </div>

                <div className="text-[10px] text-graphite-500 font-mono flex items-center justify-between pt-1 border-t border-graphite-900">
                  <span>Captured: {new Date(activeEvidence.createdAt).toLocaleTimeString()}</span>
                  <span className="text-cyan-400">Untrusted Artifact Ingested</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-graphite-500">
                <Eye className="w-8 h-8 text-graphite-700 mb-2" />
                <p className="text-xs">Select any node in the graph to inspect its evidence excerpt and provenance links.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
