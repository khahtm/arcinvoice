'use client';

import { useReadContract } from 'wagmi';
import { MILESTONE_ESCROW_ABI } from '@/lib/contracts/abi';

/**
 * Hook to read individual milestone status from V3 escrow contract
 * Returns: amount, funded status, released status
 */
export function useMilestoneStatus(
  escrowAddress: `0x${string}` | undefined,
  milestoneIndex: number
) {
  const { data, isLoading, refetch } = useReadContract({
    address: escrowAddress,
    abi: MILESTONE_ESCROW_ABI,
    functionName: 'getMilestone',
    args: [BigInt(milestoneIndex)],
    query: {
      enabled: !!escrowAddress,
      refetchInterval: 10000, // Poll every 10s
    },
  });

  if (!data) {
    return {
      isLoading,
      refetch,
      amount: 0,
      funded: false,
      released: false,
    };
  }

  const [amount, funded, released] = data as [bigint, boolean, boolean];

  return {
    isLoading,
    refetch,
    amount: Number(amount) / 1_000_000, // Convert from micro USDC
    funded,
    released,
  };
}
