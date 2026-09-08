import { CheckCircle, XCircle, Clock, Loader2, AlertTriangle, AlertOctagon } from './ui';
import { formatTimestamp } from './ui/utils';

interface StageProgress {
  [key: string]: {
    id: string;
    stage: string;
    status: string;
    summary: string;
    detail?: string;
    evidenceIds: string[];
    createdAt: string;
  };
}

interface TimelineEvent {
  id: string;
  stage: string;
  status: string;
  createdAt: string;
  summary: string;
  detail?: string;
  evidenceIds: string[];
}

interface IncidentTimelineProps {
  events: TimelineEvent[];
  stageProgress: StageProgress;
  stageLabels: Record<string, { label: string; icon: React.ReactNode }>;
  selectedEvidenceId: string | null;
  onSelectEvidence: (id: string) => void;
}

const STAGE_ORDER = ['detection', 'investigation', 'reproduction', 'diagnosis', 'repair', 'verification'];

export function IncidentTimeline({
  events,
  stageProgress,
  stageLabels,
  selectedEvidenceId,
  onSelectEvidence,
}: IncidentTimelineProps) {
  const getStageStatus = (stage: string) => {
    const event = stageProgress[stage];
    if (!event) return 'pending';
    return event.status;
  };

  const StageNode = ({ stage }: { stage: string }) => {
    const status = getStageStatus(stage);
    const event = stageProgress[stage];
    const { label, icon } = stageLabels[stage] || { label: stage, icon: null };

    const statusColors: Record<string, string> = {
      pending: 'bg-graphite-800 border-graphite-700 text-graphite-500',
      queued: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
      running: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 animate-pulse',
      completed: 'bg-status-green-500/10 border-status-green-500/30 text-status-green-400',
      failed: 'bg-status-red-500/10 border-status-red-500/30 text-status-red-400',
      skipped: 'bg-graphite-800 border-graphite-700 text-graphite-600',
    };

    const StatusIcon = () => {
      switch (status) {
        case 'completed':
          return <CheckCircle className="w-5 h-5" />;
        case 'failed':
          return <AlertOctagon className="w-5 h-5" />;
        case 'running':
        case 'queued':
          return <Loader2 className="w-5 h-5" />;
        case 'skipped':
          return <Clock className="w-5 h-5" />;
        case 'pending':
        default:
          return <div className="w-5 h-5 rounded-full border-2 border-graphite-600" />;
      }
    };

    return (
      <div className="flex flex-col items-center">
        <div
          className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${statusColors[status]} ${
            status === 'completed' ? 'shadow-glow-green' : status === 'running' ? 'shadow-glow-cyan' : ''
          }`}
        >
          {status === 'completed' || status === 'failed' || status === 'skipped' ? (
            <StatusIcon />
          ) : (
            <div className={`w-3 h-3 rounded-full ${status === 'pending' ? 'bg-graphite-600' : 'bg-cyan-400'}`} />
          )}
        </div>
        <span className="mt-2 text-xs font-medium text-graphite-300 text-center whitespace-nowrap">{label}</span>
      </div>
    );
  };

  const StageConnector = ({ from, to }: { from: string; to: string }) => {
    const statusFrom = getStageStatus(from);
    const statusTo = getStageStatus(to);
    const bothCompleted = statusFrom === 'completed' && statusTo === 'completed';

    return (
      <div className="flex-1 mx-2">
        <div className={`h-0.5 rounded-full ${bothCompleted ? 'bg-status-green-500/50' : statusTo === 'pending' ? 'bg-graphite-800' : 'bg-cyan-500/30'}`} />
      </div>
    );
  };

  const TimelineEventsList = () => {
    return (
      <div className="space-y-4">
        {events.map((event) => {
          const stageInfo = stageLabels[event.stage] || { label: event.stage, icon: null };
          const isSelected = event.id === selectedEvidenceId;

          return (
            <div key={event.id}>
              <details className={`group ${isSelected ? 'open' : ''}`}>
                <summary className="flex items-start gap-3 cursor-pointer list-none">
                  <div className="mt-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      event.status === 'completed' ? 'bg-status-green-500/20 text-status-green-400' :
                      event.status === 'failed' ? 'bg-status-red-500/20 text-status-red-400' :
                      event.status === 'running' || event.status === 'queued' ? 'bg-cyan-500/20 text-cyan-400 animate-pulse' :
                      event.status === 'skipped' ? 'bg-graphite-800 text-graphite-500' :
                      'bg-graphite-800 text-graphite-500'
                    }`}>
                      {event.status === 'completed' && <CheckCircle className="w-4 h-4" />}
                      {event.status === 'failed' && <AlertTriangle className="w-4 h-4" />}
                      {(event.status === 'running' || event.status === 'queued') && <Loader2 className="w-4 h-4 animate-spin" />}
                      {event.status === 'skipped' && <Clock className="w-4 h-4" />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {stageInfo.icon && <span className={`w-4 h-4 ${event.status === 'failed' ? 'text-status-red-400' : event.status === 'completed' ? 'text-status-green-400' : 'text-graphite-500'}`} />}
                      <span className={`text-sm font-medium ${
                        event.status === 'completed' ? 'text-status-green-300' :
                        event.status === 'failed' ? 'text-status-red-300' :
                        event.status === 'running' ? 'text-cyan-300' :
                        'text-graphite-300'
                      }`}>
                        {stageInfo.label}
                      </span>
                      <span className="text-xs text-graphite-500 font-mono">
                        {formatTimestamp(event.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-graphite-400">{event.summary}</p>
                    {event.detail && (
                      <p className="text-xs text-graphite-500 mt-1">{event.detail}</p>
                    )}
                    {event.evidenceIds.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {event.evidenceIds.map((id) => (
                          <button
                            key={id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectEvidence(id);
                            }}
                            className={`text-xs font-mono px-2 py-0.5 rounded ${
                              selectedEvidenceId === id
                                ? 'bg-cyan-500/20 text-cyan-300'
                                : 'bg-graphite-800 text-graphite-500 hover:bg-graphite-700 hover:text-graphite-300'
                            }`}
                          >
                            #{id.slice(0, 8)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="ml-2 text-graphite-600 group-open:rotate-180 transition-transform">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </summary>
                {event.detail && (
                  <div className="ml-11 mt-2 p-3 bg-graphite-800 rounded-lg border border-graphite-700 animate-fade-in">
                    <pre className="text-xs text-graphite-300 font-mono whitespace-pre-wrap overflow-x-auto">
                      {event.detail}
                    </pre>
                  </div>
                )}
              </details>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stage progression timeline */}
      <div className="card p-6">
        <h4 className="text-xs font-semibold text-graphite-500 uppercase tracking-wider mb-6">Investigation Progress</h4>
        <div className="flex items-start justify-between">
          {STAGE_ORDER.map((stage, i) => (
            <div key={stage} className="flex flex-col items-center">
              <StageNode stage={stage} />
              {i < STAGE_ORDER.length - 1 && <StageConnector from={stage} to={STAGE_ORDER[i + 1]} />}
            </div>
          ))}
        </div>
      </div>

      {/* Events list */}
      {events.length > 0 ? (
        <div>
          <h4 className="text-xs font-semibold text-graphite-500 uppercase tracking-wider mb-4">Timeline Events</h4>
          <TimelineEventsList />
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-graphite-800 flex items-center justify-center">
            <Clock className="w-6 h-6 text-graphite-600" />
          </div>
          <p className="text-sm text-graphite-500">No investigation events yet</p>
        </div>
      )}
    </div>
  );
}
