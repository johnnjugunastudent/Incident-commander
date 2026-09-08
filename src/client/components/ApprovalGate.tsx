import { useState } from 'react';
import { Button, Card, CardContent } from './ui';
import { CheckCircle, XCircle, ShieldCheck, AlertTriangle } from './ui/Icons';
import { Loader2 } from './ui/Loader2';
import { formatTimestamp } from './ui/utils';
import { trpc } from '../lib/trpc';
import { toast } from 'sonner';

interface PatchReview {
  id: string;
  approvalStatus: string;
  reviewerId?: string | null;
  reviewedAt?: string | null;
}

interface ApprovalGateProps {
  patchReview: PatchReview;
  incidentId: string;
}

export function ApprovalGate({ patchReview, incidentId }: ApprovalGateProps) {
  const [reviewerName, setReviewerName] = useState('Current User');
  const utils = trpc.useContext();

  const refreshWorkspace = () => {
    utils.patch.getReview.invalidate({ incidentId });
    utils.incident.get.invalidate({ id: incidentId });
    utils.investigation.getEvents.invalidate({ incidentId });
    utils.rootCause.getReport.invalidate({ incidentId });
  };

  const approvePatch = trpc.patch.approve.useMutation({
    onSuccess: () => {
      toast.success('Patch approved. Incident marked as resolved.');
      refreshWorkspace();
    },
    onError: (error) => {
      toast.error('Approval failed: ' + error.message);
    },
  });

  const rejectPatch = trpc.patch.reject.useMutation({
    onSuccess: () => {
      toast.success('Patch rejected. Incident closed.');
      refreshWorkspace();
    },
    onError: (error) => {
      toast.error('Rejection failed: ' + error.message);
    },
  });

  const canApprove = patchReview.approvalStatus === 'proposed';
  const isSubmitting = approvePatch.isPending || rejectPatch.isPending;
  const borderClass =
    patchReview.approvalStatus === 'approved'
      ? 'border-status-green-500/30'
      : patchReview.approvalStatus === 'rejected'
        ? 'border-status-red-500/30'
        : 'border-violet-500/20';

  return (
    <Card className={`card-elevated border-2 ${borderClass}`}>
      <div className="p-4 border-b border-graphite-800">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-semibold text-white">Human Approval Required</h3>
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Status banner based on approval status */}
        {patchReview.approvalStatus === 'approved' ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-status-green-500/10 border border-status-green-500/20">
            <CheckCircle className="w-5 h-5 text-status-green-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-status-green-300">Patch Approved</p>
              <p className="text-xs text-status-green-400 mt-1">
                {patchReview.reviewerId && `Reviewed by ${patchReview.reviewerId}`}
                {patchReview.reviewedAt && ` on ${formatTimestamp(patchReview.reviewedAt)}`}
              </p>
            </div>
          </div>
        ) : patchReview.approvalStatus === 'rejected' ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-status-red-500/10 border border-status-red-500/20">
            <XCircle className="w-5 h-5 text-status-red-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-status-red-300">Patch Rejected</p>
              <p className="text-xs text-status-red-400 mt-1">
                {patchReview.reviewerId && `Rejected by ${patchReview.reviewerId}`}
                {patchReview.reviewedAt && ` on ${formatTimestamp(patchReview.reviewedAt)}`}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-violet-500/5 border border-violet-500/10">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-graphite-200">
                Verification passed, but this patch remains a proposal. Review the evidence and choose a human decision.
              </p>
              <p className="text-xs text-graphite-500 mt-1">
                No patch will be deployed without explicit approval.
              </p>
            </div>
          </div>
        )}

        {/* Reviewer identity */}
        {canApprove && (
          <div className="space-y-1">
            <label htmlFor="reviewer-name" className="text-xs text-graphite-500">
              Reviewer identity
            </label>
            <input
              id="reviewer-name"
              type="text"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              className="w-full h-9 px-3 rounded-md bg-surface-raised border border-graphite-700 text-graphite-100 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 outline-none"
            />
          </div>
        )}

        {/* Action buttons */}
        {canApprove && (
          <div className="flex gap-2">
            <Button
              variant="primary"
              className="flex-1 gap-2"
              onClick={() =>
                approvePatch.mutate({
                  incidentId,
                  reviewerId: reviewerName,
                  reason: 'Approved by human reviewer',
                })
              }
              disabled={isSubmitting}
            >
              {approvePatch.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Approve Patch
                </>
              )}
            </Button>
            <Button
              variant="danger"
              className="flex-1 gap-2"
              onClick={() =>
                rejectPatch.mutate({
                  incidentId,
                  reviewerId: reviewerName,
                  reason: 'Rejected by human reviewer',
                })
              }
              disabled={isSubmitting}
            >
              {rejectPatch.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  Reject
                </>
              )}
            </Button>
          </div>
        )}

        {/* Review metadata */}
        {(patchReview.reviewerId || patchReview.reviewedAt) && (
          <div className="flex items-center justify-between text-xs text-graphite-500 pt-2 border-t border-graphite-800">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Reviewer: {patchReview.reviewerId}
            </span>
            <span className="font-mono">
              {patchReview.reviewedAt ? formatTimestamp(patchReview.reviewedAt) : ''}
            </span>
          </div>
        )}

        {/* Safety notice */}
        <p className="text-xs text-graphite-600 text-center pt-2">
          This is a demonstration system. No actual deployment will occur.
        </p>
      </CardContent>
    </Card>
  );
}
