import { Button, Card, CardHeader, CardContent, Badge } from './ui';
import type { BadgeProps } from './ui/Badge';

import { Copy, CheckCircle, XCircle, Loader2, FileCode, Shield, AlertTriangle } from './ui';
import { formatTimestamp } from './ui/utils';

interface PatchReview {
  id: string;
  summary: string;
  diff: string;
  filesChanged: string[];
  confidence: number;
  verificationStatus: string;
  approvalStatus: string;
  verificationOutput?: string;
  createdAt: string;
  reviewedAt?: string | null;
}

interface PatchReviewSectionProps {
  patchReview: PatchReview;
  onCopyDiff: () => void;
}

type BadgeVariant = NonNullable<BadgeProps['variant']>;

const VERIFICATION_STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; badge: BadgeVariant }> = {
  not_run: { label: 'Not Run', icon: <Shield className="w-3 h-3" />, badge: 'graphite' },
  running: { label: 'Running', icon: <Loader2 className="w-3 h-3 animate-spin" />, badge: 'cyan' },
  passed: { label: 'Passed', icon: <CheckCircle className="w-3 h-3" />, badge: 'green' },
  failed: { label: 'Failed', icon: <XCircle className="w-3 h-3" />, badge: 'red' },
  partial: { label: 'Partial', icon: <AlertTriangle className="w-3 h-3" />, badge: 'amber' },
};

const APPROVAL_STATUS_CONFIG: Record<string, { label: string; badge: BadgeVariant }> = {
  proposed: { label: 'Proposed', badge: 'violet' },
  approved: { label: 'Approved', badge: 'green' },
  rejected: { label: 'Rejected', badge: 'red' },
  superseded: { label: 'Superseded', badge: 'graphite' },
};

export function PatchReviewSection({ patchReview, onCopyDiff }: PatchReviewSectionProps) {
  const verificationConfig = VERIFICATION_STATUS_CONFIG[patchReview.verificationStatus] || VERIFICATION_STATUS_CONFIG['not_run'];
  const approvalConfig = APPROVAL_STATUS_CONFIG[patchReview.approvalStatus] || APPROVAL_STATUS_CONFIG['proposed'];

  return (
    <Card className="card-elevated">
      <div className="p-4 border-b border-graphite-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-semibold text-white">Repair Proposal</h3>
          </div>
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Summary */}
        <div>
          <h4 className="text-xs text-graphite-500 uppercase tracking-wider mb-2">Summary</h4>
          <p className="text-sm text-graphite-200">{patchReview.summary}</p>
        </div>

        {/* Confidence */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-graphite-500">Confidence</span>
            <span className="text-xs font-mono text-violet-400">{(patchReview.confidence * 100).toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-graphite-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full"
              style={{ width: `${patchReview.confidence * 100}%` }}
            />
          </div>
        </div>

        {/* Files changed */}
        <div>
          <h4 className="text-xs text-graphite-500 uppercase tracking-wider mb-2">Files Changed</h4>
          <div className="flex flex-wrap gap-1">
            {patchReview.filesChanged.map((file) => (
              <code key={file} className="text-xs px-2 py-1 bg-graphite-800 text-graphite-300 rounded font-mono border border-graphite-700">
                {file}
              </code>
            ))}
          </div>
        </div>

        {/* Diff */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs text-graphite-500 uppercase tracking-wider">Unified Diff</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCopyDiff}
              className="text-graphite-400 hover:text-white gap-1"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </Button>
          </div>
          <div className="bg-graphite-950 rounded-lg border border-graphite-800 overflow-x-auto">
            <pre className="text-xs text-graphite-300 font-mono p-3 whitespace-pre-wrap">
              {patchReview.diff}
            </pre>
          </div>
        </div>

        {/* Verification output */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs text-graphite-500 uppercase tracking-wider">Verification Output</h4>
            <Badge variant={verificationConfig.badge} className="flex items-center gap-1">
              {verificationConfig.icon}
              {verificationConfig.label}
            </Badge>
          </div>
          {patchReview.verificationOutput ? (
            <div className="bg-graphite-950 rounded-lg border border-graphite-800 p-3">
              <pre className="text-xs text-graphite-300 font-mono whitespace-pre-wrap h-24 overflow-y-auto">
                {patchReview.verificationOutput}
              </pre>
            </div>
          ) : (
            <div className="text-xs text-graphite-500 italic">
              Verification has not been run yet.
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-graphite-500 pt-2 border-t border-graphite-800">
          <span>Created {formatTimestamp(patchReview.createdAt)}</span>
          {patchReview.approvalStatus !== 'proposed' && patchReview.reviewedAt && (
            <span className="font-mono">
              Reviewed {formatTimestamp(patchReview.reviewedAt)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
