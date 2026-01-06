'use client';

import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFundEscrow } from '@/hooks/useFundEscrow';
import { useUSDCBalance } from '@/hooks/useUSDCBalance';
import { useChainGuard } from '@/hooks/useChainGuard';
import { parseUnits } from 'viem';

interface FundEscrowButtonProps {
  escrowAddress: `0x${string}`;
  amount: string;
  contractVersion?: number;
  onSuccess?: (txHash: string) => void;
  onError?: (error: Error) => void;
}

export function FundEscrowButton({
  escrowAddress,
  amount,
  contractVersion = 1,
  onSuccess,
  onError,
}: FundEscrowButtonProps) {
  const { address, isConnected } = useAccount();
  const { isWrongNetwork, switchToArc } = useChainGuard();
  const { balanceRaw } = useUSDCBalance(address);
  const isV2 = contractVersion === 2;
  const {
    needsApproval,
    approveUSDC,
    fundEscrow,
    isApproving,
    isApproveSuccess,
    isDepositing,
    isDepositSuccess,
    depositHash,
    payerAmountDisplay,
    isLoadingAmount,
  } = useFundEscrow(escrowAddress, amount, contractVersion);

  // Check balance against actual payer amount from contract
  const payerAmountWei = parseUnits(payerAmountDisplay.toFixed(6), 6);
  const hasEnoughBalance = balanceRaw >= payerAmountWei;

  // Call onSuccess when deposit succeeds
  useEffect(() => {
    if (isDepositSuccess && depositHash && onSuccess) {
      onSuccess(depositHash);
    }
  }, [isDepositSuccess, depositHash, onSuccess]);

  if (!isConnected) {
    return <Button disabled className="w-full">Connect wallet to fund</Button>;
  }

  if (isWrongNetwork) {
    return (
      <Button variant="destructive" onClick={switchToArc} className="w-full gap-2">
        <AlertTriangle className="h-4 w-4" />
        Switch to Arc Testnet
      </Button>
    );
  }

  // Check loading state FIRST for V2 (before balance check uses wrong amount)
  if (isLoadingAmount) {
    return (
      <Button disabled className="w-full">
        Loading amount...
      </Button>
    );
  }

  if (!hasEnoughBalance) {
    return (
      <Button disabled variant="destructive" className="w-full">
        Insufficient USDC
      </Button>
    );
  }

  // Display amount from contract calculation
  const displayAmount = payerAmountDisplay.toFixed(2);
  const feeNote = isV2 ? ' (incl. fee)' : '';

  if (needsApproval) {
    return (
      <Button onClick={approveUSDC} disabled={isApproving} className="w-full">
        {isApproving ? 'Approving...' : `Approve ${displayAmount} USDC${feeNote}`}
      </Button>
    );
  }

  return (
    <Button onClick={fundEscrow} disabled={isDepositing} className="w-full">
      {isDepositing ? 'Funding...' : `Fund Escrow (${displayAmount} USDC)${feeNote}`}
    </Button>
  );
}
