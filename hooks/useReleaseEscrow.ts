'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ESCROW_ABI } from '@/lib/contracts/abi';

export function useReleaseEscrow(escrowAddress: `0x${string}`) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const release = () => {
    writeContract({
      address: escrowAddress,
      abi: ESCROW_ABI,
      functionName: 'release',
    });
  };

  return { release, hash, isPending, isConfirming, isSuccess, error };
}
