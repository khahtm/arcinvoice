'use client';

import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { ESCROW_ABI, MILESTONE_ESCROW_ABI } from '@/lib/contracts/abi';

// V1/V2 states: CREATED, FUNDED, RELEASED, REFUNDED
// V3 states: CREATED, ACTIVE, COMPLETED, REFUNDED
export type EscrowState = 'CREATED' | 'FUNDED' | 'ACTIVE' | 'RELEASED' | 'COMPLETED' | 'REFUNDED';

// V1 state map
const STATE_MAP_V1: EscrowState[] = ['CREATED', 'FUNDED', 'RELEASED', 'REFUNDED'];
// V3 state map (pay-per-milestone)
const STATE_MAP_V3: EscrowState[] = ['CREATED', 'ACTIVE', 'COMPLETED', 'REFUNDED'];

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function useEscrowStatus(
  escrowAddress?: `0x${string}`,
  contractVersion: number = 1
) {
  const isV3 = contractVersion === 3;
  const abi = isV3 ? MILESTONE_ESCROW_ABI : ESCROW_ABI;

  const { data, isLoading, refetch } = useReadContract({
    address: escrowAddress,
    abi,
    functionName: 'getDetails',
    query: {
      enabled: !!escrowAddress,
      refetchInterval: 10000, // Poll every 10s
    },
  });

  const { data: canAutoRelease } = useReadContract({
    address: escrowAddress,
    abi,
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
      fundedAmount: '0',
      releasedAmount: '0',
      state: null,
      fundedAt: null,
      autoReleaseDays: 0,
      canAutoRelease: false,
      milestoneCount: 0,
      currentMilestone: 0,
    };
  }

  // V3: [creator, payer, totalAmount, fundedAmount, releasedAmount, state, fundedAt, autoReleaseDays, milestoneCount, currentMilestone]
  if (isV3) {
    const [
      creator,
      payer,
      totalAmount,
      fundedAmount,
      releasedAmount,
      stateNum,
      fundedAt,
      autoReleaseDays,
      milestoneCount,
      currentMilestone,
    ] = data as [
      `0x${string}`,
      `0x${string}`,
      bigint,
      bigint,
      bigint,
      number,
      bigint,
      bigint,
      bigint,
      bigint
    ];

    return {
      isLoading,
      refetch,
      creator,
      payer: payer === ZERO_ADDRESS ? null : payer,
      amount: formatUnits(totalAmount, 6),
      fundedAmount: formatUnits(fundedAmount, 6),
      releasedAmount: formatUnits(releasedAmount, 6),
      state: STATE_MAP_V3[stateNum] ?? null,
      fundedAt: fundedAt > BigInt(0) ? new Date(Number(fundedAt) * 1000) : null,
      autoReleaseDays: Number(autoReleaseDays),
      canAutoRelease: canAutoRelease ?? false,
      milestoneCount: Number(milestoneCount),
      currentMilestone: Number(currentMilestone),
    };
  }

  // V1 format: [creator, payer, amount, state, fundedAt, autoReleaseDays]
  const [creator, payer, amount, stateNum, fundedAt, autoReleaseDays] =
    data as [
      `0x${string}`,
      `0x${string}`,
      bigint,
      number,
      bigint,
      bigint
    ];

  return {
    isLoading,
    refetch,
    creator,
    payer: payer === ZERO_ADDRESS ? null : payer,
    amount: formatUnits(amount, 6),
    fundedAmount: '0',
    releasedAmount: '0',
    state: STATE_MAP_V1[stateNum] ?? null,
    fundedAt: fundedAt > BigInt(0) ? new Date(Number(fundedAt) * 1000) : null,
    autoReleaseDays: Number(autoReleaseDays),
    canAutoRelease: canAutoRelease ?? false,
    milestoneCount: 0,
    currentMilestone: 0,
  };
}
