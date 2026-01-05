'use client';

import { useDispute } from '@/hooks/useDispute';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { OpenDisputeButton } from './OpenDisputeButton';
import { ProposeResolutionForm } from './ProposeResolutionForm';
import { AcceptRejectButtons } from './AcceptRejectButtons';
import { EvidenceList } from './EvidenceList';
import { EscalateToKlerosButton } from './EscalateToKlerosButton';
import { KlerosStatus } from './KlerosStatus';
import { KlerosEvidenceForm } from './KlerosEvidenceForm';
import { formatUSDC, truncateAddress } from '@/lib/utils';
import { useAccount } from 'wagmi';
import { AlertTriangle } from 'lucide-react';

interface DisputePanelProps {
  invoiceId: string;
  invoiceAmount: number;
  escrowAddress: `0x${string}` | null;
  creatorWallet: string;
  invoiceStatus: string;
}

export function DisputePanel({
  invoiceId,
  invoiceAmount,
  escrowAddress,
  creatorWallet,
  invoiceStatus,
}: DisputePanelProps) {
  const { address } = useAccount();
  const {
    dispute,
    isLoading,
    openDispute,
    proposeResolution,
    acceptResolution,
    rejectResolution,
    submitEvidence,
  } = useDispute(invoiceId);

  const isProposer =
    dispute?.proposed_by?.toLowerCase() === address?.toLowerCase();
  const canDispute = invoiceStatus === 'funded' && escrowAddress;

  if (isLoading) {
    return (
      <Card className="p-4">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-20 w-full" />
      </Card>
    );
  }

  // No dispute yet - show open button if funded
  if (!dispute) {
    if (!canDispute) return null;

    return (
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Having an issue with this payment? Open a dispute to propose a
              resolution with the other party.
            </p>
            <OpenDisputeButton onSubmit={openDispute} />
          </div>
        </div>
      </Card>
    );
  }

  // Dispute exists
  return (
    <Card className="p-4 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Dispute
          </h3>
          <p className="text-sm text-muted-foreground">
            Opened by {truncateAddress(dispute.opened_by)}
          </p>
        </div>
        <Badge
          variant={
            dispute.status === 'resolved'
              ? 'default'
              : dispute.status === 'proposed'
                ? 'secondary'
                : 'outline'
          }
        >
          {dispute.status}
        </Badge>
      </div>

      {/* Reason */}
      <div className="bg-muted p-3 rounded text-sm">
        <p className="font-medium mb-1">Reason:</p>
        <p>{dispute.reason}</p>
      </div>

      {/* Proposed resolution */}
      {dispute.status === 'proposed' && dispute.resolution_type && (
        <div className="border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 p-3 rounded space-y-2">
          <p className="font-medium">Proposed Resolution</p>
          <p className="text-sm">
            Type: <span className="capitalize">{dispute.resolution_type}</span>
          </p>
          {dispute.resolution_type === 'split' && (
            <div className="text-sm">
              <p>
                Payer receives:{' '}
                {formatUSDC((dispute.resolution_payer_amount || 0) * 1e6)}
              </p>
              <p>
                Creator receives:{' '}
                {formatUSDC((dispute.resolution_creator_amount || 0) * 1e6)}
              </p>
            </div>
          )}
          {dispute.resolution_type === 'refund' && (
            <p className="text-sm">Full refund to payer</p>
          )}
          {dispute.resolution_type === 'release' && (
            <p className="text-sm">Full release to creator</p>
          )}

          {/* Accept/Reject if not proposer */}
          {!isProposer && escrowAddress && (
            <AcceptRejectButtons
              dispute={dispute}
              escrowAddress={escrowAddress}
              onAccept={() => acceptResolution(dispute.id)}
              onReject={() => rejectResolution(dispute.id)}
            />
          )}

          {isProposer && (
            <p className="text-xs text-muted-foreground mt-2">
              Waiting for other party to respond...
            </p>
          )}
        </div>
      )}

      {/* Propose form if open */}
      {dispute.status === 'open' && (
        <ProposeResolutionForm
          invoiceAmount={invoiceAmount}
          onSubmit={(type, payerAmt, creatorAmt) =>
            proposeResolution(dispute.id, type, payerAmt, creatorAmt)
          }
        />
      )}

      {/* Resolved message */}
      {dispute.status === 'resolved' && (
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-3 rounded">
          <p className="text-sm text-green-700 dark:text-green-300">
            This dispute has been resolved.
          </p>
        </div>
      )}

      {/* Evidence section */}
      {dispute.status !== 'resolved' && dispute.status !== 'escalated' && (
        <EvidenceList
          evidence={dispute.evidence || []}
          onSubmit={(content, fileUrl) =>
            submitEvidence(dispute.id, content, fileUrl)
          }
        />
      )}

      {/* Kleros escalation option */}
      {(dispute.status === 'open' || dispute.status === 'proposed') && (
        <div className="border-t pt-4 mt-4">
          <p className="text-sm text-muted-foreground mb-2">
            Can&apos;t reach agreement? Escalate to decentralized arbitration.
          </p>
          <EscalateToKlerosButton invoiceId={invoiceId} disputeId={dispute.id} />
        </div>
      )}

      {/* Kleros status when escalated */}
      {dispute.status === 'escalated' && (
        <div className="space-y-4">
          <KlerosStatus invoiceId={invoiceId} disputeId={dispute.id} />
          <KlerosEvidenceForm invoiceId={invoiceId} disputeId={dispute.id} />
        </div>
      )}

      {/* Expiry warning */}
      {dispute.expires_at &&
        dispute.status !== 'resolved' &&
        new Date(dispute.expires_at) > new Date() && (
          <p className="text-xs text-muted-foreground">
            Expires: {new Date(dispute.expires_at).toLocaleDateString()}
          </p>
        )}
    </Card>
  );
}
