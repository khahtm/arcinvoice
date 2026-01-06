'use client';

import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { useFundMilestone } from '@/hooks/useFundMilestone';
import { useUSDCBalance } from '@/hooks/useUSDCBalance';
import { useChainGuard } from '@/hooks/useChainGuard';
import { Loader2, AlertTriangle } from 'lucide-react';

interface FundMilestoneButtonProps {
  escrowAddress: `0x${string}`;
  milestoneIndex: number;
  milestoneAmount: number;
  isCurrentMilestone: boolean;
  onSuccess?: (txHash: string) => void;
}

/**
 * Button to fund a specific milestone in pay-per-milestone escrow
 * Shows different states: pending (not current), approve, fund, or insufficient balance
 */
export function FundMilestoneButton({
  escrowAddress,
  milestoneIndex,
  milestoneAmount,
  isCurrentMilestone,
  onSuccess,
}: FundMilestoneButtonProps) {
  const { isConnected, address } = useAccount();
  const { isWrongNetwork, switchToArc } = useChainGuard();
  const { balanceRaw, isLoading: isBalanceLoading } = useUSDCBalance(address);
  const {
    needsApproval,
    approveUSDC,
    fundMilestone,
    isApproving,
    isFunding,
    isFundSuccess,
    fundHash,
    payerAmountDisplay,
    isLoadingAmount,
  } = useFundMilestone(escrowAddress, milestoneIndex, milestoneAmount);

  // Balance check (convert display to wei for comparison)
  const payerAmountWei = BigInt(Math.round(payerAmountDisplay * 1_000_000));
  const hasEnoughBalance = balanceRaw >= payerAmountWei;

  // Success callback
  useEffect(() => {
    if (isFundSuccess && fundHash && onSuccess) {
      onSuccess(fundHash);
    }
  }, [isFundSuccess, fundHash, onSuccess]);

  if (!isConnected) {
    return (
      <Button disabled size="sm">
        Connect wallet
      </Button>
    );
  }

  if (isWrongNetwork) {
    return (
      <Button variant="destructive" onClick={switchToArc} size="sm" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Switch
      </Button>
    );
  }

  // Not the current milestone to fund (must fund in order)
  if (!isCurrentMilestone) {
    return (
      <Button disabled size="sm" variant="outline">
        Pending
      </Button>
    );
  }

  if (isLoadingAmount || isBalanceLoading) {
    return (
      <Button disabled size="sm">
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (!hasEnoughBalance) {
    return (
      <Button disabled size="sm" variant="destructive">
        Insufficient USDC
      </Button>
    );
  }

  // Need to approve USDC first
  if (needsApproval) {
    return (
      <Button onClick={approveUSDC} disabled={isApproving} size="sm">
        {isApproving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Approve ${payerAmountDisplay.toFixed(2)}
      </Button>
    );
  }

  // Ready to fund
  return (
    <Button onClick={fundMilestone} disabled={isFunding} size="sm">
      {isFunding && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
      Fund ${payerAmountDisplay.toFixed(2)}
    </Button>
  );
}
