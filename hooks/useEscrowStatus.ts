'use client';

import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { ESCROW_ABI } from '@/lib/contracts/abi';

export type EscrowState = 'CREATED' | 'FUNDED' | 'RELEASED' | 'REFUNDED';

const STATE_MAP: EscrowState[] = ['CREATED', 'FUNDED', 'RELEASED', 'REFUNDED'];

export function useEscrowStatus(escrowAddress?: `0x${string}`) {
  const { data, isLoading, refetch } = useReadContract({
    address: escrowAddress,
    abi: ESCROW_ABI,
    functionName: 'getDetails',
    query: {
      enabled: !!escrowAddress,
      refetchInterval: 10000, // Poll every 10s
    },
  });

  const { data: canAutoRelease } = useReadContract({
    address: escrowAddress,
    abi: ESCROW_ABI,
    functionName: 'canAutoRelease',
    query: { enabled: !!escrowAddress },
  });

  if (!data) {
    return {
      isLoading,
      refetch,
      creator: null,
      payer: null,
      amount: '0',
      state: null,
      fundedAt: null,
      autoReleaseDays: 0,
      canAutoRelease: false,
    };
  }

  const [creator, payer, amount, stateNum, fundedAt, autoReleaseDays] = data;

  return {
    isLoading,
    refetch,
    creator,
    payer:
      payer === '0x0000000000000000000000000000000000000000' ? null : payer,
    amount: formatUnits(amount, 6),
    state: STATE_MAP[stateNum] ?? null,
    fundedAt: fundedAt > BigInt(0) ? new Date(Number(fundedAt) * 1000) : null,
    autoReleaseDays: Number(autoReleaseDays),
    canAutoRelease: canAutoRelease ?? false,
  };
}
