import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { toast } from 'sonner';
import { Button, Card, CardHeader, CardContent, Badge } from './ui';
import { ArrowLeft, AlertTriangle, CheckCircle, GitBranch, Clock, FileText, Code2, Play, ShieldCheck, Eye, Activity, Terminal } from './ui';
import { IncidentTimeline } from './IncidentTimeline';
import { EvidencePanel } from './EvidencePanel';
import { PatchReviewSection } from './PatchReviewSection';
import { ApprovalGate } from './ApprovalGate';
import { IncidentContext } from './IncidentContext';
import { EvidenceGraphView } from './EvidenceGraphView';
import { TelemetryPanel } from './TelemetryPanel';
import { AuditTrailView } from './AuditTrailView';
import { PostMortemExportModal } from './PostMortemExportModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';
import { Loader2 } from './ui/Loader2';

interface IncidentWorkspaceProps {
  incidentId: string;
  onBack: () => void;
}

const STAGE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  detection: { label: 'Detection', icon: <AlertTriangle className="w-4 h-4" /> },
  investigation: { label: 'Investigation', icon: <Eye className="w-4 h-4" /> },
  reproduction: { label: 'Reproduction', icon: <Play className="w-4 h-4" /> },
  diagnosis: { label: 'Diagnosis', icon: <Code2 className="w-4 h-4" /> },
  repair: { label: 'Repair', icon: <GitBranch className="w-4 h-4" /> },
  verification: { label: 'Verification', icon: <ShieldCheck className="w-4 h-4" /> },
};

export function IncidentWorkspace({ incidentId, onBack }: IncidentWorkspaceProps) {
  const [activeTab, setActiveTab] = useState('timeline');
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const { data: incident, isLoading: isLoadingIncident } = trpc.incident.get.useQuery({ id: incidentId });

  const { data: events } = trpc.investigation.getEvents.useQuery({ incidentId });
  const { data: evidence } = trpc.evidence.getList.useQuery({ incidentId });
  const { data: rootCauseReport } = trpc.rootCause.getReport.useQuery({ incidentId });
  const { data: patchReview } = trpc.patch.getReview.useQuery({ incidentId });

  const utils = trpc.useContext();
  const startInvestigation = trpc.incident.startInvestigation.useMutation({
    onSuccess: async () => {
      toast.success('Investigation complete. Patch proposed for human review.');
      await utils.incident.get.invalidate({ id: incidentId });
      await utils.investigation.getEvents.invalidate({ incidentId });
      await utils.investigation.getEvidenceGraph.invalidate({ incidentId });
      await utils.evidence.getList.invalidate({ incidentId });
      await utils.rootCause.getReport.invalidate({ incidentId });
      await utils.patch.getReview.invalidate({ incidentId });
      await utils.audit.getTrail.invalidate({ incidentId });
      await utils.audit.getSummary.invalidate({ incidentId });
      await utils.observability.getTelemetry.invalidate({ incidentId });
    },
    onError: (error) => {
      toast.error('Investigation failed: ' + error.message);
    },
  });

  const sortedEvents = events?.slice().sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ) || [];

  // Get latest event per stage
  const stageProgress = (() => {
    const latest: Record<string, any> = {};
    for (const event of events || []) {
      if (!latest[event.stage] || new Date(event.createdAt) > new Date(latest[event.stage].createdAt)) {
        latest[event.stage] = event;
      }
    }
    return latest;
  })();

  return (
    <div className="min-h-screen bg-graphite-999 flex flex-col">
      {/* Grid background */}
      <div className="absolute inset-0 grid-pattern pointer-events-none opacity-30" />

      {/* Header */}
      <header className="relative bg-graphite-950/80 backdrop-blur-sm border-b border-graphite-800 z-10">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="text-graphite-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-graphite-500">INC-{incident?.id?.slice(0, 8) || '---'}</span>
              <Badge
                variant={
                  incident?.severity === 'critical' ? 'red' :
                  incident?.severity === 'high' ? 'amber' :
                  incident?.severity === 'medium' ? 'cyan' :
                  'graphite'
                }
              >
                {incident?.severity || 'unknown'}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {incident && (
              <Button
                variant="secondary"
                size="sm"
                className="h-8 gap-1.5 text-xs text-graphite-300 border border-graphite-700 hover:text-white hover:bg-graphite-800"
                onClick={() => setIsExportModalOpen(true)}
              >
                <FileText className="w-3.5 h-3.5 text-violet-400" />
                Export Post-Mortem
              </Button>
            )}

            <span className="text-sm text-graphite-400">
              {incident?.status === 'open' && <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />Open</span>}
              {incident?.status === 'investigating' && <span className="inline-flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" />Investigating</span>}
              {incident?.status === 'awaiting_review' && <span className="inline-flex items-center gap-1.5 text-amber-400"><Clock className="w-4 h-4" />Awaiting Human Review</span>}
              {incident?.status === 'resolved' && <span className="inline-flex items-center gap-1.5 text-status-green-400"><CheckCircle className="w-4 h-4" />Resolved</span>}
              {incident?.status === 'closed' && <span className="text-graphite-500">Closed</span>}
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
        {/* Left column - Tabs (Timeline, Evidence, Graph, Telemetry, Audit) and Context */}
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Incident Context Card */}
          <Card className="card-elevated">
            <IncidentContext incident={incident} />
          </Card>

          {/* Tabs */}
          <div className="flex-1 flex flex-col min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-graphite-900 border border-graphite-800 rounded-lg p-1 mb-4 flex-shrink-0 justify-start overflow-x-auto gap-1">
                <TabsTrigger value="timeline" className="gap-1.5 text-xs sm:text-sm">
                  <Clock className="w-4 h-4" />
                  Timeline
                  {(events?.length ?? 0) > 0 && (
                    <Badge variant="violet" className="ml-1 text-[10px] py-0 px-1.5">{events?.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="evidence" className="gap-1.5 text-xs sm:text-sm">
                  <FileText className="w-4 h-4" />
                  Evidence
                  {(evidence?.length ?? 0) > 0 && (
                    <Badge variant="cyan" className="ml-1 text-[10px] py-0 px-1.5">{evidence?.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="graph" className="gap-1.5 text-xs sm:text-sm">
                  <GitBranch className="w-4 h-4 text-violet-400" />
                  Evidence Graph
                  <Badge variant="violet" className="ml-1 text-[9px] py-0 px-1">DAG</Badge>
                </TabsTrigger>
                <TabsTrigger value="telemetry" className="gap-1.5 text-xs sm:text-sm">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Telemetry
                  <Badge variant="cyan" className="ml-1 text-[9px] py-0 px-1">Live</Badge>
                </TabsTrigger>
                <TabsTrigger value="audit" className="gap-1.5 text-xs sm:text-sm">
                  <Terminal className="w-4 h-4 text-status-green-400" />
                  Audit Trail
                  <Badge variant="green" className="ml-1 text-[9px] py-0 px-1">Gated</Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="timeline" className="flex-1 overflow-auto min-h-0">
                {isLoadingIncident ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-graphite-500 animate-spin" />
                  </div>
                ) : (
                  <IncidentTimeline
                    events={sortedEvents}
                    stageProgress={stageProgress}
                    stageLabels={STAGE_LABELS}
                    selectedEvidenceId={selectedEvidenceId}
                    onSelectEvidence={(id) => setSelectedEvidenceId(id === selectedEvidenceId ? null : id)}
                  />
                )}
              </TabsContent>

              <TabsContent value="evidence" className="flex-1 overflow-auto min-h-0">
                <EvidencePanel
                  evidence={evidence || []}
                  selectedEvidenceId={selectedEvidenceId}
                  onSelectEvidence={(id) => setSelectedEvidenceId(id === selectedEvidenceId ? null : id)}
                  stageLabels={STAGE_LABELS}
                />
              </TabsContent>

              <TabsContent value="graph" className="flex-1 overflow-auto min-h-0">
                <EvidenceGraphView
                  incidentId={incidentId}
                  selectedEvidenceId={selectedEvidenceId}
                  onSelectEvidence={(id) => setSelectedEvidenceId(id)}
                />
              </TabsContent>

              <TabsContent value="telemetry" className="flex-1 overflow-auto min-h-0">
                <TelemetryPanel incidentId={incidentId} />
              </TabsContent>

              <TabsContent value="audit" className="flex-1 overflow-auto min-h-0">
                <AuditTrailView incidentId={incidentId} />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right column - Patch and Approval */}
        <div className="w-full lg:w-96 flex flex-col gap-4 overflow-auto">
          {/* Root cause report */}
          {rootCauseReport && (
            <Card className="card-elevated">
              <div className="p-4 border-b border-graphite-800">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-violet-400" />
                    Root Cause Analysis
                  </h3>
                  <Badge variant={rootCauseReport.inferenceMode === 'demo' ? 'amber' : 'cyan'}>
                    {rootCauseReport.inferenceMode === 'demo' ? 'Controlled Demo' : 'Live Inference'}
                  </Badge>
                </div>
                <p className="text-xs text-graphite-400">
                  Model: {rootCauseReport.modelName}
                </p>
              </div>
              <CardContent className="p-4 space-y-4">
                <div>
                  <div className="text-xs text-graphite-500 mb-2 flex items-center gap-2">
                    <span className="text-violet-400">Confidence</span>
                    <div className="flex-1 h-2 bg-graphite-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full transition-all duration-300"
                        style={{ width: `${rootCauseReport.confidence * 100}%` }}
                      />
                    </div>
                    <span className="font-mono text-violet-300">
                      {(rootCauseReport.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-sm text-white">{rootCauseReport.summary}</p>
                </div>

                {rootCauseReport.limitations && (
                  <div>
                    <div className="text-xs text-graphite-500 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>Limitations</span>
                    </div>
                    <p className="text-sm text-graphite-300">{rootCauseReport.limitations}</p>
                  </div>
                )}

                <div>
                  <div className="text-xs text-graphite-500 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-cyan-400" />
                    <span>Claims (evidence-backed)</span>
                  </div>
                  <div className="space-y-2">
                    {rootCauseReport.claims.map((claim: { text: string; evidenceIds: string[] }, i: number) => (
                      <div key={i} className="p-3 rounded-lg bg-graphite-800 border-l-2 border-cyan-500/50">
                        <p className="text-sm text-graphite-200">{claim.text}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {claim.evidenceIds.map((id: string) => (
                            <Badge key={id} variant="cyan" className="text-xs font-mono">
                              #{id.slice(0, 8)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Patch Review */}
          {patchReview && (
            <PatchReviewSection
              patchReview={patchReview}
              onCopyDiff={() => {
                navigator.clipboard.writeText(patchReview.diff);
              }}
            />
          )}

          {/* Approval Gate */}
          {patchReview && (
            <ApprovalGate patchReview={patchReview} incidentId={incidentId} />
          )}

          {/* Empty state when no patch */}
          {!patchReview && !isLoadingIncident && (
            <Card className="flex-1 card-elevated">
              <div className="p-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-graphite-800 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6 text-graphite-600" />
                </div>
                <h3 className="text-sm font-semibold text-graphite-300 mb-2">No Patch Proposed</h3>
                <p className="text-xs text-graphite-500 max-w-xs mb-4">
                  The investigation has not yet produced a repair proposal, or one has been rejected/superseded.
                </p>
                {(incident?.status === 'open' || incident?.status === 'investigating') && (
                  <Button
                    variant="primary"
                    className="gap-2"
                    onClick={() => startInvestigation.mutate({ incidentId })}
                    disabled={startInvestigation.isPending}
                  >
                    {startInvestigation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    {startInvestigation.isPending ? 'Running Investigation...' : 'Start Investigation'}
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>
      </main>

      {/* Post-Mortem Export Modal */}
      <PostMortemExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        incident={incident}
        events={events}
        rootCauseReport={rootCauseReport}
        patchReview={patchReview}
      />
    </div>
  );
}
