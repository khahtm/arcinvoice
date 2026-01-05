'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { MILESTONE_ESCROW_ABI } from '@/lib/contracts/abi';

interface UseMilestoneEscrowReturn {
  releaseMilestone: (index: number) => void;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  hash: `0x${string}` | undefined;
  error: Error | null;
  reset: () => void;
}

/**
 * Hook for milestone escrow operations (V3: pay-per-milestone)
 * Only provides releaseMilestone - funding is handled by useFundMilestone hook
 */
export function useMilestoneEscrow(
  escrowAddress: `0x${string}` | null
): UseMilestoneEscrowReturn {
  const {
    writeContract,
    data: hash,
    isPending,
    error: writeError,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const releaseMilestone = (index: number) => {
    if (!escrowAddress) return;

    writeContract({
      address: escrowAddress,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'releaseMilestone',
      args: [BigInt(index)],
    });
  };

  return {
    releaseMilestone,
    isPending,
    isConfirming,
    isSuccess,
    hash,
    error: writeError,
    reset,
  };
}
