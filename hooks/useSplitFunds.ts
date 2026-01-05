'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { MILESTONE_ESCROW_ABI } from '@/lib/contracts/abi';

interface UseSplitFundsReturn {
  splitFunds: (payerAmount: bigint) => void;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  hash: `0x${string}` | undefined;
  error: Error | null;
}

export function useSplitFunds(
  escrowAddress: `0x${string}` | null
): UseSplitFundsReturn {
  const {
    writeContract,
    data: hash,
    isPending,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const splitFunds = (payerAmount: bigint) => {
    if (!escrowAddress) return;

    writeContract({
      address: escrowAddress,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'splitFunds',
      args: [payerAmount],
    });
  };

  return {
    splitFunds,
    isPending,
    isConfirming,
    isSuccess,
    hash,
    error: writeError,
  };
}
