'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ESCROW_ABI } from '@/lib/contracts/abi';

export function useRefundEscrow(escrowAddress: `0x${string}`) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const refund = () => {
    writeContract({
      address: escrowAddress,
      abi: ESCROW_ABI,
      functionName: 'refund',
    });
  };

  return { refund, hash, isPending, isConfirming, isSuccess, error };
}
