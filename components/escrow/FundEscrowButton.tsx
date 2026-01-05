'use client';

import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { useFundEscrow } from '@/hooks/useFundEscrow';
import { useUSDCBalance } from '@/hooks/useUSDCBalance';
import { parseUnits } from 'viem';

interface FundEscrowButtonProps {
  escrowAddress: `0x${string}`;
  amount: string;
  onSuccess?: (txHash: string) => void;
  onError?: (error: Error) => void;
}

export function FundEscrowButton({
  escrowAddress,
  amount,
  onSuccess,
  onError,
}: FundEscrowButtonProps) {
  const { address, isConnected } = useAccount();
  const { balanceRaw } = useUSDCBalance(address);
  const {
    needsApproval,
    approveUSDC,
    fundEscrow,
    isApproving,
    isApproveSuccess,
    isDepositing,
    isDepositSuccess,
    depositHash,
  } = useFundEscrow(escrowAddress, amount);

  const amountWei = parseUnits(amount, 6);
  const hasEnoughBalance = balanceRaw >= amountWei;

  // Call onSuccess when deposit succeeds
  useEffect(() => {
    if (isDepositSuccess && depositHash && onSuccess) {
      onSuccess(depositHash);
    }
  }, [isDepositSuccess, depositHash, onSuccess]);

  if (!isConnected) {
    return <Button disabled className="w-full">Connect wallet to fund</Button>;
  }

  if (!hasEnoughBalance) {
    return (
      <Button disabled variant="destructive" className="w-full">
        Insufficient USDC
      </Button>
    );
  }

  if (needsApproval) {
    return (
      <Button onClick={approveUSDC} disabled={isApproving} className="w-full">
        {isApproving ? 'Approving...' : `Approve ${amount} USDC`}
      </Button>
    );
  }

  return (
    <Button onClick={fundEscrow} disabled={isDepositing} className="w-full">
      {isDepositing ? 'Funding...' : `Fund Escrow (${amount} USDC)`}
    </Button>
  );
}
