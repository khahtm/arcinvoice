'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { MILESTONE_ESCROW_ABI } from '@/lib/contracts/abi';

interface UseMilestoneEscrowReturn {
  approveMilestone: (index: number) => void;
  releaseMilestone: (index: number) => void;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  hash: `0x${string}` | undefined;
  error: Error | null;
}

export function useMilestoneEscrow(
  escrowAddress: `0x${string}` | null
): UseMilestoneEscrowReturn {
  const {
    writeContract,
    data: hash,
    isPending,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const approveMilestone = (index: number) => {
    if (!escrowAddress) return;

    writeContract({
      address: escrowAddress,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'approveMilestone',
      args: [BigInt(index)],
    });
  };

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
    approveMilestone,
    releaseMilestone,
    isPending,
    isConfirming,
    isSuccess,
    hash,
    error: writeError,
  };
}
