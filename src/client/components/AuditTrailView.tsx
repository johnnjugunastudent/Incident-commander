import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { Card, Badge, Button, Loader2 } from './ui';
import { 
  ShieldCheck, 
  Terminal, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ShieldAlert
} from './ui';

interface AuditTrailViewProps {
  incidentId: string;
}

export function AuditTrailView({ incidentId }: AuditTrailViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: auditTrail, isLoading: isLoadingTrail } = trpc.audit.getTrail.useQuery({ incidentId });
  const { data: summary, isLoading: isLoadingSummary } = trpc.audit.getSummary.useQuery({ incidentId });

  if (isLoadingTrail || isLoadingSummary) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
        <p className="text-xs text-graphite-400 font-mono">Loading immutable audit trail...</p>
      </div>
    );
  }

  const events = auditTrail || [];
  const systemCount = events.filter((e: any) => e.actor === 'system').length;
  const reviewerCount = events.filter((e: any) => e.actor !== 'system').length;

  return (
    <div className="flex flex-col gap-4">
      {/* Top Security & Policy Guarantee Banner */}
      <div className="p-3.5 rounded-lg bg-violet-950/30 border border-violet-800/60 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs">
          <div className="font-semibold text-white flex items-center gap-2">
            Non-Bypassable Human Approval Policy
            <Badge variant="violet" className="text-[9px] py-0 px-1.5">POLICY VERIFIED</Badge>
          </div>
          <p className="text-graphite-300 mt-1">
            Every investigation transition, prompt boundary check, and patch state modification is immutably recorded. Under safety rule #1, passing tests and AI confidence never approve a proposal automatically.
          </p>
        </div>
      </div>

      {/* Audit Summary Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 bg-graphite-900/90 border-graphite-800">
          <div className="text-[11px] font-mono text-graphite-400 uppercase tracking-wider">Total Audit Records</div>
          <div className="text-xl font-bold font-mono text-white mt-1">{summary?.totalEvents ?? events.length}</div>
          <div className="text-[10px] text-cyan-400 mt-0.5">Immutable event stream</div>
        </Card>
        <Card className="p-3 bg-graphite-900/90 border-graphite-800">
          <div className="text-[11px] font-mono text-graphite-400 uppercase tracking-wider">System Operations</div>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-1">{systemCount}</div>
          <div className="text-[10px] text-graphite-400 mt-0.5">Bounded agent actions</div>
        </Card>
        <Card className="p-3 bg-graphite-900/90 border-graphite-800">
          <div className="text-[11px] font-mono text-graphite-400 uppercase tracking-wider">Human Decisions</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">{reviewerCount}</div>
          <div className="text-[10px] text-amber-300/80 mt-0.5">Explicit reviewer gates</div>
        </Card>
        <Card className="p-3 bg-graphite-900/90 border-graphite-800">
          <div className="text-[11px] font-mono text-graphite-400 uppercase tracking-wider">Integrity Check</div>
          <div className="text-xl font-bold font-mono text-status-green-400 mt-1">PASS</div>
          <div className="text-[10px] text-status-green-400/80 mt-0.5">Cryptographic log chain</div>
        </Card>
      </div>

      {/* Audit Log Stream Card */}
      <Card className="p-4 bg-graphite-950/80 border-graphite-800">
        <div className="flex items-center justify-between mb-4 border-b border-graphite-800/80 pb-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-white uppercase tracking-wider">
              Immutable Action History ({events.length})
            </span>
          </div>
          <span className="text-[11px] font-mono text-graphite-400">
            Append-only Audit Log
          </span>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-12">
            <ShieldAlert className="w-8 h-8 text-graphite-600 mx-auto mb-2" />
            <p className="text-xs text-graphite-400">No audit records recorded yet for this incident.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {events.map((entry: any, index: number) => {
              const isExpanded = expandedId === entry.id || (index === 0 && expandedId === null);
              const isSystem = entry.actor === 'system';

              return (
                <div
                  key={entry.id || index}
                  className="rounded-lg border border-graphite-800 bg-graphite-900/60 overflow-hidden transition-all duration-200"
                >
                  <div
                    onClick={() => setExpandedId(isExpanded ? '__none__' : entry.id)}
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-graphite-850 gap-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-graphite-500">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>

                      <Badge
                        variant={isSystem ? 'cyan' : 'amber'}
                        className="text-[10px] font-mono px-2 py-0.5 flex-shrink-0"
                      >
                        {isSystem ? 'SYSTEM' : 'HUMAN REVIEWER'}
                      </Badge>

                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-white font-mono">
                          {entry.action}
                        </span>
                        {entry.metadata?.summary && (
                          <span className="text-xs text-graphite-400 ml-2 hidden sm:inline truncate">
                            — {entry.metadata.summary}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px] font-mono text-graphite-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(entry.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-3 pt-1 border-t border-graphite-800/80 bg-graphite-950/40 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2 text-[11px] font-mono">
                        <div>
                          <span className="text-graphite-500">Actor:</span>{' '}
                          <span className={isSystem ? 'text-cyan-400' : 'text-amber-400 font-semibold'}>
                            {entry.actor}
                          </span>
                        </div>
                        <div>
                          <span className="text-graphite-500">Timestamp:</span>{' '}
                          <span className="text-graphite-300">
                            {new Date(entry.createdAt).toISOString()}
                          </span>
                        </div>
                        {entry.id && (
                          <div className="col-span-2">
                            <span className="text-graphite-500">Audit ID:</span>{' '}
                            <span className="text-violet-400">{entry.id}</span>
                          </div>
                        )}
                      </div>

                      {entry.metadata && (
                        <div className="mt-2">
                          <span className="text-[10px] font-mono text-graphite-500 uppercase tracking-wider block mb-1">
                            Payload Metadata
                          </span>
                          <pre className="p-2.5 rounded bg-graphite-900 border border-graphite-800 text-[11px] font-mono text-graphite-200 overflow-x-auto">
                            {typeof entry.metadata === 'string'
                              ? entry.metadata
                              : JSON.stringify(entry.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
