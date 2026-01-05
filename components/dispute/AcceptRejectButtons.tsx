'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSplitFunds } from '@/hooks/useSplitFunds';
import { CheckCircle, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Dispute } from '@/types/database';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { MILESTONE_ESCROW_ABI } from '@/lib/contracts/abi';

interface AcceptRejectButtonsProps {
  dispute: Dispute;
  escrowAddress: `0x${string}`;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
}

export function AcceptRejectButtons({
  dispute,
  escrowAddress,
  onAccept,
  onReject,
}: AcceptRejectButtonsProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // For split resolution, use splitFunds
  const {
    splitFunds,
    isPending: isSplitPending,
    isConfirming: isSplitConfirming,
    isSuccess: isSplitSuccess,
  } = useSplitFunds(escrowAddress);

  // For refund, use refund function
  const {
    writeContract: writeRefund,
    data: refundHash,
    isPending: isRefundPending,
  } = useWriteContract();
  const { isLoading: isRefundConfirming, isSuccess: isRefundSuccess } =
    useWaitForTransactionReceipt({ hash: refundHash });

  // For release, use release function (will release all milestones)
  const {
    writeContract: writeRelease,
    data: releaseHash,
    isPending: isReleasePending,
  } = useWriteContract();
  const { isLoading: isReleaseConfirming, isSuccess: isReleaseSuccess } =
    useWaitForTransactionReceipt({ hash: releaseHash });

  // Handle successful on-chain actions
  useEffect(() => {
    if (isSplitSuccess || isRefundSuccess || isReleaseSuccess) {
      onAccept().then(() => toast.success('Resolution executed on-chain'));
    }
  }, [isSplitSuccess, isRefundSuccess, isReleaseSuccess, onAccept]);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      // Execute on-chain based on resolution type
      if (dispute.resolution_type === 'split') {
        const payerAmount = BigInt(
          Math.round((dispute.resolution_payer_amount || 0) * 1e6)
        );
        splitFunds(payerAmount);
      } else if (dispute.resolution_type === 'refund') {
        writeRefund({
          address: escrowAddress,
          abi: MILESTONE_ESCROW_ABI,
          functionName: 'refund',
        });
      } else if (dispute.resolution_type === 'release') {
        writeRelease({
          address: escrowAddress,
          abi: MILESTONE_ESCROW_ABI,
          functionName: 'autoRelease', // Release all
        });
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to execute resolution'
      );
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await onReject();
      toast.success('Resolution rejected - you can counter-propose');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to reject resolution'
      );
    } finally {
      setIsRejecting(false);
    }
  };

  const isOnChainLoading =
    isSplitPending ||
    isSplitConfirming ||
    isRefundPending ||
    isRefundConfirming ||
    isReleasePending ||
    isReleaseConfirming;

  return (
    <div className="flex gap-2 mt-3">
      <Button
        onClick={handleAccept}
        disabled={isAccepting || isOnChainLoading || isRejecting}
        size="sm"
      >
        {isOnChainLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Accept
          </>
        )}
      </Button>
      <Button
        onClick={handleReject}
        disabled={isAccepting || isOnChainLoading || isRejecting}
        variant="outline"
        size="sm"
      >
        {isRejecting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <X className="h-4 w-4 mr-2" />
            Reject
          </>
        )}
      </Button>
    </div>
  );
}
