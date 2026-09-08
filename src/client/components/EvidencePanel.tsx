import { FileText, FileCode, Terminal, GitBranch, AlertCircle, Microchip, BarChart3, CheckCircle } from './ui';

interface Evidence {
  id: string;
  kind: string;
  label: string;
  content: string;
  sourcePath?: string;
  lineRange?: string;
  createdAt: string;
}

interface EvidencePanelProps {
  evidence: Evidence[];
  selectedEvidenceId: string | null;
  onSelectEvidence: (id: string) => void;
  stageLabels: Record<string, { label: string; icon: React.ReactNode }>;
}

const KIND_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  alert: { label: 'Alert', icon: <AlertCircle className="w-4 h-4" />, color: 'text-amber-400 bg-amber-500/10' },
  log: { label: 'Log', icon: <Terminal className="w-4 h-4" />, color: 'text-cyan-400 bg-cyan-500/10' },
  source: { label: 'Source', icon: <FileCode className="w-4 h-4" />, color: 'text-violet-400 bg-violet-500/10' },
  commit: { label: 'Commit', icon: <GitBranch className="w-4 h-4" />, color: 'text-graphite-400 bg-graphite-500/10' },
  reproduction: { label: 'Reproduction', icon: <Microchip className="w-4 h-4" />, color: 'text-status-amber-400 bg-status-amber-500/10' },
  test: { label: 'Test', icon: <BarChart3 className="w-4 h-4" />, color: 'text-status-green-400 bg-status-green-500/10' },
  model_claim: { label: 'Model Claim', icon: <CheckCircle className="w-4 h-4" />, color: 'text-violet-400 bg-violet-500/20 border-violet-500/30' },
};

export function EvidencePanel({
  evidence,
  selectedEvidenceId,
  onSelectEvidence,
  stageLabels,
}: EvidencePanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-graphite-500 uppercase tracking-wider">
          Evidence Records ({evidence.length})
        </h4>
        <div className="flex gap-1">
          {Object.entries(KIND_CONFIG).map(([kind, config]) => (
            <button
              key={kind}
              className="text-xs px-2 py-1 rounded bg-graphite-800 text-graphite-400 hover:text-white hover:bg-graphite-700 transition-colors"
            >
              {config.label}
            </button>
          ))}
        </div>
      </div>

      {evidence.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-graphite-800 flex items-center justify-center">
            <FileText className="w-6 h-6 text-graphite-600" />
          </div>
          <p className="text-sm text-graphite-500">No evidence collected yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {evidence.map((item) => {
            const config = KIND_CONFIG[item.kind] || {
              label: item.kind,
              icon: <FileText className="w-4 h-4" />,
              color: 'text-graphite-400 bg-graphite-500/10',
            };
            const isSelected = item.id === selectedEvidenceId;

            return (
              <button
                key={item.id}
                onClick={() => onSelectEvidence(item.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-surface-card border-cyan-500/40 shadow-glow-cyan'
                    : 'bg-graphite-900 border-graphite-800 hover:border-graphite-700 hover:shadow-card-hover'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded flex items-center justify-center ${config.color}`}>
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-graphite-200'}`}>
                        {item.label}
                      </span>
                      <span className="text-xs text-graphite-500 font-mono">
                        #{item.id.slice(0, 8)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-graphite-500">
                      <span className="capitalize">{item.kind}</span>
                      {item.sourcePath && (
                        <>
                          <span className="text-graphite-600">·</span>
                          <span className="font-mono truncate max-w-40">{item.sourcePath}</span>
                        </>
                      )}
                      {item.lineRange && (
                        <>
                          <span className="text-graphite-600">·</span>
                          <span className="font-mono">{item.lineRange}</span>
                        </>
                      )}
                    </div>
                    <div className="mt-2 max-h-24 overflow-hidden">
                      <pre className="text-xs text-graphite-400 font-mono whitespace-pre-wrap break-all">
                        {item.content.slice(0, 200)}
                        {item.content.length > 200 && '...'}
                      </pre>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Selected evidence detail */}
      {selectedEvidenceId && (
        <div className="animate-fade-in">
          {(() => {
            const selected = evidence.find((e) => e.id === selectedEvidenceId);
            if (!selected) return null;
            const config = KIND_CONFIG[selected.kind] || {
              label: selected.kind,
              icon: <FileText className="w-4 h-4" />,
              color: 'text-graphite-400 bg-graphite-500/10',
            };

            return (
              <div className="card p-4 border-cyan-500/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded flex items-center justify-center ${config.color}`}>
                      {config.icon}
                    </div>
                    <span className="text-sm font-semibold text-white">{selected.label}</span>
                  </div>
                  <span className="text-xs text-graphite-500 font-mono">#{selected.id.slice(0, 8)}</span>
                </div>

                <div className="text-xs text-graphite-500 mb-2">
                  <span className="capitalize">{selected.kind}</span>
                  {selected.sourcePath && (
                    <>
                      <span className="text-graphite-600"> · </span>
                      <span className="font-mono">{selected.sourcePath}</span>
                    </>
                  )}
                  {selected.lineRange && (
                    <>
                      <span className="text-graphite-600"> · </span>
                      <span className="font-mono">{selected.lineRange}</span>
                    </>
                  )}
                </div>

                <div className="bg-graphite-800 rounded-lg p-3 border border-graphite-700">
                  <pre className="text-sm text-graphite-200 font-mono whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
                    {selected.content}
                  </pre>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
